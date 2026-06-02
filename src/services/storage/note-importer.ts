import { Note } from '../types/note'
import { dateTimeNow } from '../types/date-time'
import { ipcClient, infoDialog, $t } from '../../global'
import { fromBase64 } from '../hex-base64'
import type { UIStateManager } from './ui-state-manager'
import type { NoteTreeManager } from './note-tree-manager'
import type { NoteOperationsManager } from './note-operations-manager'

// Parsed representation of an imported FileData entry. Parsing each path once
// up front means the import loops below never need to do string manipulation.
type ParsedFile = { dir: string; name: string; depth: number; content: string; isFolder: boolean }

export class NoteImporter {
	private readonly TEXT_EXTENSIONS = ['.md', '.txt'] as const

	constructor(
		private ops: NoteOperationsManager,
		private uiManager: UIStateManager,
		private treeManager: NoteTreeManager,
	) {}

	public async importAllNotes(): Promise<void> {
		const root = this.treeManager.root
		if (!root) {
			return
		}

		const files = await ipcClient.fileSystem.loadFolder({ title: $t('contextMenu.importNotes') })
		if (!files || files.length === 0) {
			return
		}

		this.uiManager.beginAction()
		try {
			const parsed = files.map(f => this.parseFile(f))
			const textFiles = parsed.filter(f => this.isTextFile(f))

			// Nothing to import: don't create the root note or run a sync cycle
			// for a folder that has no supported text files.
			if (textFiles.length === 0) {
				infoDialog.value.show($t('contextMenu.importNotes'), $t('contextMenu.importNotesEmpty'))
				return
			}

			// Notes are built in-memory first and committed as a single batched
			// MultiAction at the end so the sync service runs one cycle for the
			// whole import instead of one per note.
			const createdNotes: Note[] = []
			const buildNote = this.makeBuildNote(createdNotes)

			// All imported notes live under a single timestamped root note.
			const importRootNote = buildNote(
				root.note,
				$t('contextMenu.importedRootNoteTitle', { date: this.importTimestamp() }),
			)

			const noteMap = this.initNoteMap(parsed, importRootNote)
			this.createFolderNotes(parsed, textFiles, noteMap, buildNote)
			this.attachTextFiles(textFiles, noteMap, buildNote)

			await this.commitImport(createdNotes, root.note)

			await root.expand()
			await this.treeManager.getNoteById(importRootNote.id)?.select()

			infoDialog.value.show(
				$t('contextMenu.importNotes'),
				$t('contextMenu.importNotesComplete', { count: textFiles.length }),
			)
		} finally {
			this.uiManager.endAction()
		}
	}

	private isTextFile(f: ParsedFile): boolean {
		return !f.isFolder && this.TEXT_EXTENSIONS.some(ext => f.name.endsWith(ext))
	}

	private stripTextExt(name: string): string {
		const ext = this.TEXT_EXTENSIONS.find(e => name.endsWith(e))
		return ext ? name.slice(0, -ext.length) : name
	}

	private joinPath(dir: string, name: string): string {
		return dir ? `${dir}/${name}` : name
	}

	private parseFile(f: { path: string; isFolder: boolean; content: string }): ParsedFile {
		const parts = f.path.split('/')
		return {
			dir: parts.slice(0, -1).join('/'),
			name: parts[parts.length - 1]!,
			depth: parts.length,
			content: f.content,
			isFolder: f.isFolder,
		}
	}

	private byDepth(a: ParsedFile, b: ParsedFile): number {
		return a.depth - b.depth || a.name.localeCompare(b.name)
	}

	private importTimestamp(): string {
		const now = new Date()
		const pad = (n: number) => String(n).padStart(2, '0')
		return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
	}

	// Factory for the buildNote closure. Builds a Note in-memory, links it to
	// its parent's metadata, and records it for the final batched commit.
	private makeBuildNote(createdNotes: Note[]) {
		return (parent: Note, title: string, text?: string): Note => {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').notes = []
			note.changeItem('metadata').title = title
			note.changeItem('metadata').created = dateTimeNow()
			if (text !== undefined) {
				note.changeItem('text').text = text
			}
			parent.changeItem('metadata').notes.push(note.id)
			createdNotes.push(note)
			return note
		}
	}

	// noteMap tracks path → Note for every note created during import so child
	// notes can resolve their parent and pass 2 can detect when a .md file
	// corresponds to an already-created folder note.
	private initNoteMap(parsed: ParsedFile[], importRootNote: Note): Map<string, Note> {
		const noteMap = new Map<string, Note>()
		noteMap.set('', importRootNote)
		// If loadFolder included the selected folder itself as a top-level entry,
		// pre-map it to importRootNote so it is transparent to the rest of the logic.
		const topSegments = new Set(parsed.map(f => (f.dir || f.name).split('/')[0]))
		if (topSegments.size === 1) {
			noteMap.set([...topSegments][0], importRootNote)
		}
		return noteMap
	}

	// Precomputed set of folder paths that contain (or are ancestors of) any
	// text file, so the per-folder "has content" check is O(1).
	private computeFoldersWithContent(textFiles: ParsedFile[]): Set<string> {
		const foldersWithContent = new Set<string>()
		for (const f of textFiles) {
			if (f.dir) {
				const parts = f.dir.split('/')
				for (let i = 1; i <= parts.length; i++) {
					foldersWithContent.add(parts.slice(0, i).join('/'))
				}
			}
			// Sibling-folder case: a folder named the same as a .md/.txt file.
			foldersWithContent.add(this.joinPath(f.dir, this.stripTextExt(f.name)))
		}
		return foldersWithContent
	}

	// Pass 1: create a note for every exported folder that has content,
	// shallowest first so each parent note is always in noteMap before its
	// children are processed. A folder is skipped when it has no matching
	// sibling .md/.txt file and no text-file descendants (i.e. truly empty).
	private createFolderNotes(
		parsed: ParsedFile[],
		textFiles: ParsedFile[],
		noteMap: Map<string, Note>,
		buildNote: (parent: Note, title: string, text?: string) => Note,
	): void {
		const foldersWithContent = this.computeFoldersWithContent(textFiles)
		const resolveParent = (dir: string) => noteMap.get(dir) ?? noteMap.get('')!
		const folders = parsed
			.filter(f => f.isFolder && foldersWithContent.has(this.joinPath(f.dir, f.name)))
			.sort(this.byDepth)
		for (const folder of folders) {
			const fp = this.joinPath(folder.dir, folder.name)
			if (!noteMap.has(fp)) {
				noteMap.set(fp, buildNote(resolveParent(folder.dir), folder.name))
			}
		}
	}

	// Pass 2: process .md and .txt files. Notes that also have children were
	// exported as both a folder and a sibling .md file — in that case noteMap
	// already has the note from pass 1 and we just attach the text. Otherwise
	// we create a new leaf note.
	private attachTextFiles(
		textFiles: ParsedFile[],
		noteMap: Map<string, Note>,
		buildNote: (parent: Note, title: string, text?: string) => Note,
	): void {
		const decoder = new TextDecoder()
		const resolveParent = (dir: string) => noteMap.get(dir) ?? noteMap.get('')!
		// Tracks keys whose text was already supplied by a text file, so a
		// second sibling file (e.g. foo.txt after foo.md) is detected as a
		// collision instead of silently overwriting the first note's text.
		const textKeys = new Set<string>()
		for (const file of [...textFiles].sort(this.byDepth)) {
			const nameWithoutExt = this.stripTextExt(file.name)
			const key = this.joinPath(file.dir, nameWithoutExt)
			const text = decoder.decode(fromBase64(file.content))
			const existingNote = noteMap.get(key)
			if (existingNote && !textKeys.has(key)) {
				// A folder note from pass 1: attach the sibling file's text to it.
				existingNote.changeItem('text').text = text
				textKeys.add(key)
			} else if (!existingNote) {
				noteMap.set(key, buildNote(resolveParent(file.dir), nameWithoutExt, text))
				textKeys.add(key)
			} else {
				// Collision: another text file already owns this key (e.g. both
				// foo.md and foo.txt exist). Disambiguate by keeping the full
				// file name so neither note's text is silently lost.
				const uniqueKey = this.uniqueKey(this.joinPath(file.dir, file.name), noteMap)
				noteMap.set(uniqueKey, buildNote(resolveParent(file.dir), file.name, text))
			}
		}
	}

	// Returns key unchanged if free, otherwise appends an incrementing suffix
	// until an unused key is found, guarding against repeated collisions.
	private uniqueKey(key: string, noteMap: Map<string, Note>): string {
		if (!noteMap.has(key)) {
			return key
		}
		let i = 2
		while (noteMap.has(`${key} (${i})`)) {
			i++
		}
		return `${key} (${i})`
	}

	// Commit all created notes plus the single parent update in one batched
	// action so the sync service runs a single sync cycle for the whole import.
	private async commitImport(createdNotes: Note[], rootNote: Note): Promise<void> {
		const multiAction = this.ops.beginMultiAction()
		for (const note of createdNotes) {
			await multiAction.createNote(note)
		}
		await multiAction.updateNote(rootNote)
		await multiAction.commit()
	}
}
