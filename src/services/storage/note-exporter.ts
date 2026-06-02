import type { MimerNote } from '../types/mimer-note'
import { ipcClient, infoDialog, $t } from '../../global'
import { toBase64 } from '../hex-base64'
import type { NoteTreeManager } from './note-tree-manager'

// One file entry produced by export, matching the FileData shape expected by
// ipcClient.fileSystem.saveFolder.
type ExportedFile = { path: string; isFolder: boolean; content: string }

export class NoteExporter {
	private encoder = new TextEncoder()

	constructor(private treeManager: NoteTreeManager) {}

	public async exportAllNotes(): Promise<void> {
		const root = this.treeManager.root
		if (!root) {
			return
		}

		const files: ExportedFile[] = []
		await this.collectNotesForExport(root, [], files)

		const saved = await ipcClient.fileSystem.saveFolder(files, { title: $t('contextMenu.exportNotes') })
		if (saved) {
			const noteCount = files.filter(f => !f.isFolder).length
			infoDialog.value.show($t('contextMenu.exportNotes'), $t('contextMenu.exportNotesComplete', { count: noteCount }))
		}
	}

	public async exportSubtree(note: MimerNote): Promise<void> {
		const files: ExportedFile[] = []
		const safeName = this.sanitizeTitle(note.title ?? 'Untitled')

		if (note.hasChildren) {
			files.push({ path: safeName, isFolder: true, content: '' })
		}
		files.push({
			path: safeName + '.md',
			isFolder: false,
			content: toBase64(this.encoder.encode(note.text ?? '')),
		})
		if (note.hasChildren) {
			await this.collectNotesForExport(note, [safeName], files)
		}

		const saved = await ipcClient.fileSystem.saveFolder(files, { title: $t('contextMenu.exportSubtree') })
		if (saved) {
			const noteCount = files.filter(f => !f.isFolder).length
			infoDialog.value.show(
				$t('contextMenu.exportSubtree'),
				$t('contextMenu.exportSubtreeComplete', { count: noteCount }),
			)
		}
	}

	// Convert a note title into a safe cross-platform file/folder name. Uses a
	// Unicode-aware allow-list (keeps letters/numbers of any script, e.g. Chinese
	// or accented characters) since illegal characters vary by OS; trailing dots
	// are stripped for Windows.
	private sanitizeTitle(title: string): string {
		return (
			title
				.replace(/[^\p{L}\p{N}\s\-_.,()[\]']/gu, '_')
				.trim()
				.replace(/\.+$/, '') || 'Untitled'
		)
	}

	// Disambiguate a name against siblings already used at the same level by
	// appending " (2)", " (3)", … until a free slot is found.
	private uniqueName(base: string, usedNames: Set<string>): string {
		if (!usedNames.has(base)) {
			return base
		}
		let counter = 2
		while (usedNames.has(`${base} (${counter})`)) {
			counter++
		}
		return `${base} (${counter})`
	}

	// Recursively walk the note tree, pushing one folder entry per parent note
	// and one .md entry per note (including parents, so their text is preserved).
	private async collectNotesForExport(note: MimerNote, pathParts: string[], files: ExportedFile[]): Promise<void> {
		await note.ensureChildren()
		const usedNames = new Set<string>()
		for (const child of note.children) {
			if (child.isSystem) {
				continue
			}
			const safeName = this.uniqueName(this.sanitizeTitle(child.title ?? 'Untitled'), usedNames)
			usedNames.add(safeName)
			const childPath = [...pathParts, safeName]
			const joined = childPath.join('/')
			if (child.hasChildren) {
				files.push({ path: joined, isFolder: true, content: '' })
			}
			files.push({
				path: joined + '.md',
				isFolder: false,
				content: toBase64(this.encoder.encode(child.text ?? '')),
			})
			if (child.hasChildren) {
				await this.collectNotesForExport(child, childPath, files)
			}
		}
	}
}
