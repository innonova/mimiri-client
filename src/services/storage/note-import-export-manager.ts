import { Note } from '../types/note'
import type { MimerNote } from '../types/mimer-note'
import { dateTimeNow } from '../types/date-time'
import { ipcClient, infoDialog, $t } from '../../global'
import { fromBase64, toBase64 } from '../hex-base64'
import type { UIStateManager } from './ui-state-manager'
import type { NoteTreeManager } from './note-tree-manager'
import type { NoteOperationsManager } from './note-operations-manager'

export class NoteImportExportManager {
	constructor(
		private ops: NoteOperationsManager,
		private uiManager: UIStateManager,
		private treeManager: NoteTreeManager,
	) {}

	private importTimestamp(): string {
		const now = new Date()
		const pad = (n: number) => String(n).padStart(2, '0')
		return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
	}

	private async createChildNote(parent: Note, title: string, text?: string): Promise<Note> {
		const note = new Note()
		note.keyName = parent.keyName
		note.changeItem('metadata').notes = []
		note.changeItem('metadata').title = title
		note.changeItem('metadata').created = dateTimeNow()
		if (text !== undefined) {
			note.changeItem('text').text = text
		}
		await this.ops.createNote(note)
		parent.changeItem('metadata').notes.push(note.id)
		await this.ops.writeNote(parent)
		return note
	}

	public async importAllNotes(): Promise<void> {
		const root = this.treeManager.root
		if (!root) return

		const files = await ipcClient.fileSystem.loadFolder({ title: $t('contextMenu.importNotes') })
		if (!files || files.length === 0) return

		this.uiManager.beginAction()
		try {
			const decoder = new TextDecoder()

			// Parse each raw FileData path once into structured fields so the
			// loops below never need to do string manipulation themselves.
			type ParsedFile = { dir: string; name: string; depth: number; content: string; isFolder: boolean }
			const parse = (f: { path: string; isFolder: boolean; content: string }): ParsedFile => {
				const parts = f.path.split('/')
				return { dir: parts.slice(0, -1).join('/'), name: parts.at(-1)!, depth: parts.length, content: f.content, isFolder: f.isFolder }
			}
			const byDepth = (a: ParsedFile, b: ParsedFile) => a.depth - b.depth || a.name.localeCompare(b.name)

			const parsed = files.map(parse)

			// All imported notes live under a single timestamped root note.
			const importRootNote = await this.createChildNote(
				root.note,
				$t('contextMenu.importedRootNoteTitle', { date: this.importTimestamp() }),
			)

			// noteMap tracks path → Note for every note created during import so
			// that child notes can look up their parent and so that pass 2 can
			// detect when a .md file corresponds to an already-created folder note.
			const noteMap = new Map<string, Note>()
			noteMap.set('', importRootNote)
			// If loadFolder included the selected folder itself as a top-level entry,
			// pre-map it to importRootNote so it is transparent to the rest of the logic.
			const topSegments = new Set(parsed.map(f => (f.dir || f.name).split('/')[0]))
			if (topSegments.size === 1) noteMap.set([...topSegments][0], importRootNote)
			const resolveParent = (dir: string) => noteMap.get(dir) ?? importRootNote

			// Pass 1: create a note for every exported folder that has content,
			// shallowest first so each parent note is always in noteMap before its
			// children are processed. A folder is skipped when it has no matching
			// sibling .md/.txt file and no text-file descendants (i.e. truly empty).
			const textFiles = parsed.filter(f => !f.isFolder && (f.name.endsWith('.md') || f.name.endsWith('.txt')))
			const folderHasContent = (folder: ParsedFile): boolean => {
				const fp = `${folder.dir ? folder.dir + '/' : ''}${folder.name}`
				return textFiles.some(
					f =>
						f.dir === fp ||
						f.dir.startsWith(fp + '/') ||
						(f.dir === folder.dir && (f.name === folder.name + '.md' || f.name === folder.name + '.txt')),
				)
			}
			for (const folder of parsed.filter(f => f.isFolder && folderHasContent(f)).sort(byDepth)) {
				const fp = `${folder.dir ? folder.dir + '/' : ''}${folder.name}`
				if (!noteMap.has(fp)) noteMap.set(fp, await this.createChildNote(resolveParent(folder.dir), folder.name))
			}

			// Pass 2: process .md and .txt files. Notes that also have children were
			// exported as both a folder and a sibling .md file — in that case noteMap
			// already has the note from pass 1 and we just attach the text. Otherwise
			// we create a new leaf note.
			const mdFiles = parsed.filter(f => !f.isFolder && (f.name.endsWith('.md') || f.name.endsWith('.txt'))).sort(byDepth)

			for (const file of mdFiles) {
				const extLen = file.name.endsWith('.md') ? 3 : 4
				const nameWithoutExt = file.name.slice(0, -extLen)
				const key = `${file.dir ? file.dir + '/' : ''}${nameWithoutExt}`
				const text = decoder.decode(fromBase64(file.content))
				const existingNote = noteMap.get(key)
				if (existingNote) {
					existingNote.changeItem('text').text = text
					await this.ops.writeNote(existingNote)
				} else {
					noteMap.set(key, await this.createChildNote(resolveParent(file.dir), nameWithoutExt, text))
				}
			}

			await root.expand()
			await this.treeManager.getNoteById(importRootNote.id)?.select()

			infoDialog.value.show($t('contextMenu.importNotes'), $t('contextMenu.importNotesComplete', { count: mdFiles.length }))
		} finally {
			this.uiManager.endAction()
		}
	}

	public async exportAllNotes(): Promise<void> {
		const root = this.treeManager.root
		if (!root) return

		const sanitizeTitle = (title: string) =>
			title
				.replace(/[^\p{L}\p{N}\s\-_.,()[\]']/gu, '_')
				.trim()
				.replace(/\.+$/, '') || 'Untitled'
		const encoder = new TextEncoder()

		const files: { path: string; isFolder: boolean; content: string }[] = []

		const collectNotes = async (note: MimerNote, pathParts: string[]) => {
			await note.ensureChildren()
			const usedNames = new Set<string>()
			for (const child of note.children) {
				if (child.isSystem) {
					continue
				}
				let safeName = sanitizeTitle(child.title ?? 'Untitled')
				if (usedNames.has(safeName)) {
					let counter = 2
					while (usedNames.has(`${safeName} (${counter})`)) {
						counter++
					}
					safeName = `${safeName} (${counter})`
				}
				usedNames.add(safeName)
				const childPath = [...pathParts, safeName]
				const hasChildren = child.hasChildren
				if (hasChildren) {
					files.push({ path: childPath.join('/'), isFolder: true, content: '' })
				}
				files.push({
					path: childPath.join('/') + '.md',
					isFolder: false,
					content: toBase64(encoder.encode(child.text ?? '')),
				})
				if (hasChildren) {
					await collectNotes(child, childPath)
				}
			}
		}

		await collectNotes(root, [])
		const saved = await ipcClient.fileSystem.saveFolder(files, { title: $t('contextMenu.exportNotes') })
		if (saved) {
			const noteCount = files.filter(f => !f.isFolder).length
			infoDialog.value.show($t('contextMenu.exportNotes'), $t('contextMenu.exportNotesComplete', { count: noteCount }))
		}
	}
}
