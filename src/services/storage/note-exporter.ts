import type { MimerNote } from '../types/mimer-note'
import { ipcClient, $t } from '../../global'
import { fromBase64, toBase64 } from '../hex-base64'
import type { NoteTreeManager } from './note-tree-manager'
import { createZip, type ZipEntry } from './zip-writer'

// One file entry produced by export, matching the FileData shape expected by
// ipcClient.fileSystem.saveFolder.
export type ExportedFile = { path: string; isFolder: boolean; content: string }

export class NoteExporter {
	private encoder = new TextEncoder()

	constructor(private treeManager: NoteTreeManager) {}

	/** Collect all notes starting from the tree root into ExportedFile entries. */
	public async collectAllFiles(onProgress?: (count: number) => void): Promise<ExportedFile[]> {
		const root = this.treeManager.root
		if (!root) {
			return []
		}
		const files: ExportedFile[] = []
		await this.collectNotesForExport(root, [], files, onProgress)
		return files
	}

	/** Collect a single note and all its descendants into ExportedFile entries. */
	public async collectSubtreeFiles(note: MimerNote, onProgress?: (count: number) => void): Promise<ExportedFile[]> {
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
		if (onProgress) {
			onProgress(1)
		}
		if (note.hasChildren) {
			await this.collectNotesForExport(note, [safeName], files, onProgress)
		}
		return files
	}

	/** Show the OS folder-picker and write files to the chosen directory. */
	public async saveToFolder(files: ExportedFile[], dialogTitle: string): Promise<boolean> {
		return ipcClient.fileSystem.saveFolder(files, { title: dialogTitle })
	}

	/** Create a ZIP archive in-memory and save it via the OS file-picker. */
	public async saveToZip(files: ExportedFile[], defaultName: string, dialogTitle: string): Promise<boolean> {
		const zipEntries: ZipEntry[] = files
			.filter(f => !f.isFolder)
			.map(f => ({ name: f.path, data: fromBase64(f.content) }))
		const zipData = await createZip(zipEntries)
		return ipcClient.fileSystem.saveFile(
			{ path: '', isFolder: false, content: toBase64(zipData) },
			{
				title: dialogTitle,
				defaultName,
				filters: [{ name: $t('exportDialog.zipFilterName'), extensions: ['zip'] }],
			},
		)
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
	private async collectNotesForExport(
		note: MimerNote,
		pathParts: string[],
		files: ExportedFile[],
		onProgress?: (count: number) => void,
	): Promise<void> {
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
			if (onProgress) {
				onProgress(files.filter(f => !f.isFolder).length)
			}
			if (child.hasChildren) {
				await this.collectNotesForExport(child, childPath, files, onProgress)
			}
		}
	}
}
