import type { Guid } from '../types/guid'
import { Note } from '../types/note'
import type { MimerNote } from '../types/mimer-note'
import { newGuid } from '../types/guid'
import { dateTimeNow } from '../types/date-time'
import { MultiAction } from './multi-action'
import { debug, ipcClient, infoDialog, $t } from '../../global'
import { fromBase64, toBase64 } from '../hex-base64'

import type { NoteService } from './note-service'
import type { SynchronizationService } from './synchronization-service'
import type { MimiriClient } from './mimiri-client'
import type { UIStateManager } from './ui-state-manager'
import type { NoteTreeManager } from './note-tree-manager'
import { LimitError, MimerError, type SharedState } from './type'
import { ProofOfWork } from '../proof-of-work'
import type { CryptographyManager } from './cryptography-manager'
import type { NoteShareInfo } from '../types/note-share-info'
import { DEFAULT_PROOF_BITS } from './mimiri-store'

export class NoteOperationsManager {
	private _proofBits = DEFAULT_PROOF_BITS

	constructor(
		private state: SharedState,
		private noteService: NoteService,
		private syncService: SynchronizationService,
		private api: MimiriClient,
		private uiManager: UIStateManager,
		private treeManager: NoteTreeManager,
		private cryptoManager: CryptographyManager,
	) {}

	public async createNote(note: Note): Promise<void> {
		await this.noteService.createNote(note)
		this.syncService.queueSync()
	}

	public async writeNote(note: Note): Promise<void> {
		await this.noteService.writeNote(note)
		this.syncService.queueSync()
	}

	private async readFlatTree(noteId: Guid, whereKey?: Guid) {
		const result: Note[] = []
		const note = await this.noteService.readNote(noteId)
		if (!note) {
			throw new MimerError('Not Found', `Note with id '${noteId}' not found`)
		}
		if (!whereKey || note.keyName === whereKey) {
			result.push(note)
		}
		for (const childId of note.getItem('metadata').notes) {
			result.push(...(await this.readFlatTree(childId, whereKey)))
		}
		return result
	}

	public async createMimerNote(parentNote: MimerNote, title: string) {
		let parent = parentNote.note
		this.uiManager.beginAction()
		try {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').notes = []
			note.changeItem('metadata').title = title
			note.changeItem('metadata').created = dateTimeNow()
			await this.createNote(note)
			for (let i = 0; ; i++) {
				try {
					parent.changeItem('metadata').notes.push(note.id)
					await this.writeNote(parent)
					break
				} catch (exi) {
					if (i >= 3) {
						throw exi
					}
					const reload = await this.noteService.readNote(parent.id)
					if (!reload) {
						debug.logError('Failed to reload parent note after create', exi)
						throw exi
					}
					parent = reload
				}
			}
			await parentNote.expand()
			await this.treeManager.getNoteById(note.id)?.select()
		} finally {
			this.uiManager.endAction()
		}
	}

	public async saveNote(note: MimerNote) {
		this.uiManager.beginAction()
		try {
			if (note.note.types.includes('created')) {
				if (!note.note.getItem('metadata').created) {
					note.note.changeItem('metadata').created = note.note.getItem('created').title
				}
				note.note.changeItem('created').delete = dateTimeNow()
			}
			await this.writeNote(note.note)
		} finally {
			this.uiManager.endAction()
		}
	}

	public async delete(mimerNote: MimerNote, physicallyDelete: boolean, unregister: boolean) {
		this.uiManager.beginAction()
		try {
			const multiAction = this.beginMultiAction()
			const parent = await this.noteService.readNote(mimerNote.parent.id)
			if (parent) {
				const index = parent.getItem('metadata').notes.indexOf(mimerNote.id)
				if (index >= 0) {
					parent.changeItem('metadata').notes.splice(index, 1)
					await multiAction.updateNote(parent)
				}
			}
			if (physicallyDelete) {
				await this.recursiveDelete(multiAction, mimerNote.id)
			}
			if (unregister) {
				await this.recursiveUnregister(multiAction, mimerNote.id)
			}
			await multiAction.commit()
			this.syncService.queueSync()
			await this.syncService.waitForSync(15000)
			await (await this.treeManager.getNoteById(parent.id))?.select()
		} finally {
			this.uiManager.endAction()
		}
	}

	private async recursiveDelete(multiAction: MultiAction, id: Guid) {
		const note = await this.noteService.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveDelete(multiAction, childId)
			}
			await multiAction.deleteNote(note)
		}
	}

	private async recursiveUnregister(multiAction: MultiAction, id: Guid) {
		const note = await this.noteService.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveUnregister(multiAction, childId)
			}
			await multiAction.unregisterNote(note)
		}
	}

	public async copy(targetId: Guid, mimerNote: MimerNote, index: number) {
		this.uiManager.beginAction()
		try {
			const target = await this.noteService.readNote(targetId)
			const multiAction = this.beginMultiAction()
			const newId = await this.copyTree(multiAction, mimerNote.id, target.keyName)
			if (newId && !target.getItem('metadata').notes.includes(newId)) {
				if (index >= 0 && index < target.getItem('metadata').notes.length) {
					target.changeItem('metadata').notes.splice(index, 0, newId)
				} else {
					target.changeItem('metadata').notes.push(newId)
				}
				await multiAction.updateNote(target)
			}
			await multiAction.commit()
			this.syncService.queueSync()
			await this.syncService.waitForSync(15000)

			const targetMimerNote = await this.treeManager.getNoteById(targetId)
			await targetMimerNote.expand()
			await (await this.treeManager.getNoteById(newId))?.select()
		} finally {
			this.uiManager.endAction()
		}
	}

	public async move(
		sourceId: Guid,
		targetId: Guid,
		mimerNote: MimerNote,
		index: number,
		keepKey: boolean,
		select: boolean,
		rootNoteId: Guid,
	) {
		this.uiManager.beginAction()
		try {
			const source = await this.noteService.readNote(sourceId)
			const target = await this.noteService.readNote(targetId)
			const note = await this.noteService.readNote(mimerNote.id)
			const multiAction = this.beginMultiAction()
			if (target.id === rootNoteId && index === 0) {
				// Do not allow moving above recycle bin
				index = 1
			}
			if (source.id === target.id) {
				const currentIndex = target.getItem('metadata').notes.indexOf(note.id)
				if (currentIndex !== index) {
					if (index > currentIndex) {
						index--
					}
					target.changeItem('metadata').notes.splice(currentIndex, 1)
					if (index >= 0 && index < target.getItem('metadata').notes.length) {
						target.changeItem('metadata').notes.splice(index, 0, note.id)
					} else {
						target.changeItem('metadata').notes.push(note.id)
					}
					await multiAction.updateNote(target)
				}
			} else {
				if (!keepKey && note.keyName !== target.keyName) {
					const affectedNotes = await this.readFlatTree(note.id, note.keyName)
					for (const affectedNote of affectedNotes) {
						await multiAction.changeNoteKey(affectedNote.id, target.keyName)
					}
				}
				if (!target.getItem('metadata').notes.includes(note.id)) {
					if (index >= 0 && index < target.getItem('metadata').notes.length) {
						target.changeItem('metadata').notes.splice(index, 0, note.id)
					} else {
						target.changeItem('metadata').notes.push(note.id)
					}
					await multiAction.updateNote(target)
				}
				const sourceIndex = source.getItem('metadata').notes.indexOf(note.id)
				if (sourceIndex >= 0) {
					source.changeItem('metadata').notes.splice(sourceIndex, 1)
					await multiAction.updateNote(source)
				}
			}
			await multiAction.commit()
			this.syncService.queueSync()
			await this.syncService.waitForSync(15000)
			const targetMimerNote = await this.treeManager.getNoteById(targetId)
			await targetMimerNote.expand()
			if (select) {
				await (await this.treeManager.getNoteById(mimerNote.id))?.select()
			}
		} finally {
			this.uiManager.endAction()
		}
	}

	public beginMultiAction(): MultiAction {
		return new MultiAction(this.noteService, this.syncService, this.api)
	}

	private async copyTree(multiAction: MultiAction, id: Guid, keyName: Guid) {
		const note = await this.noteService.readNote(id)
		if (note) {
			const copied: Guid[] = []
			for (const childId of note.getItem('metadata').notes) {
				const newChildId = await this.copyTree(multiAction, childId, keyName)
				if (newChildId) {
					copied.push(newChildId)
				}
			}
			note.id = newGuid()
			note.keyName = keyName
			note.changeItem('metadata').notes = copied

			await multiAction.createNote(note)
			return note.id
		}
		return undefined
	}

	public async shareMimerNote(mimerNote: MimerNote, recipient: string) {
		if (!this.state.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.uiManager.beginAction()
		try {
			const multiAction = this.beginMultiAction()
			multiAction.onlineOnly()
			const pow = await ProofOfWork.compute(recipient, this._proofBits)
			await this.ensureShareAllowable(mimerNote)
			await this.api.getPublicKey(recipient, pow)
			let sharedKey
			if (mimerNote.isShared) {
				sharedKey = this.cryptoManager.getKeyByName(mimerNote.keyName)
			} else {
				const sharedKeyId = newGuid()
				await this.cryptoManager.createKey(sharedKeyId, { shared: true })
				this.syncService.queueSync()
				if (!(await this.syncService.waitForSync(15000))) {
					return
				}
				sharedKey = this.cryptoManager.getKeyById(sharedKeyId)
			}
			const affectedNotes = await this.readFlatTree(mimerNote.id)
			for (const affectedNote of affectedNotes) {
				if (affectedNote.keyName !== sharedKey.name) {
					await multiAction.changeNoteKey(affectedNote.id, sharedKey.name)
				}
			}
			if (multiAction.hasActions()) {
				await multiAction.commit()
			}
			this.syncService.queueSync()
			await this.syncService.waitForSync(15000)
			const response = await this.api.shareNote(recipient, sharedKey.name, mimerNote.id, mimerNote.title, pow)
			return response
		} finally {
			this.uiManager.endAction()
		}
	}

	private async ensureShareAllowable(note: MimerNote) {
		if (note.isRoot) {
			throw new MimerError('Cannot Share', 'Cannot share the root note')
		}
		let ancestor = note.parent
		while (!ancestor.isRoot) {
			const ancestorKey = this.cryptoManager.getKeyByName(ancestor.note.keyName)
			if (ancestorKey.metadata.shared) {
				throw new MimerError('Cannot Share', 'Cannot share a note that is inside an already shared note')
			}
			ancestor = ancestor.parent
		}
		const affectedNotes = await this.readFlatTree(note.id)
		for (const subNote of affectedNotes) {
			if (subNote.keyName !== note.note.keyName) {
				const subKey = this.cryptoManager.getKeyByName(subNote.keyName)
				if (subKey.metadata.shared) {
					throw new MimerError('Cannot Share', 'Cannot share a note that contains already shared notes')
				}
				throw new MimerError(
					'Cannot Share',
					'A child node with a different non-shared key exists. This should never happen!',
				)
			}
		}
	}

	public async acceptShare(share: NoteShareInfo, parent?: MimerNote) {
		if (!this.state.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.uiManager.beginAction()
		try {
			if (share) {
				if (!this.cryptoManager.getKeyByName(share.keyName)) {
					const response = await this.api.createKeyFromNoteShare(newGuid(), share, { shared: true })
					if (!response.success) {
						throw new LimitError('Limit Reached', {
							maxTotalBytes: response.maxSize,
							maxNoteBytes: 0,
							maxNoteCount: response.maxCount,
							noteSize: 0,
							noteCount: response.count,
							size: response.size,
						})
					}
					this.syncService.queueSync()
					await this.syncService.waitForSync(15000)
				}

				const targetParent = parent ?? this.treeManager.root
				if (!targetParent.note.getItem('metadata').notes.includes(share.noteId)) {
					targetParent.note.changeItem('metadata').notes.push(share.noteId)
				}
				await targetParent.save()
				this.syncService.queueSync()
				await this.syncService.waitForSync(15000)
				await targetParent.expand()
				const note = await this.treeManager.getNoteById(share.noteId)
				if (note) {
					await note.select()
					await this.treeManager.ensureChildrenRecursive(share.noteId)
				}
			}
		} finally {
			this.uiManager.endAction()
		}
	}

	public async deleteKey(name: Guid): Promise<void> {
		await this.cryptoManager.deleteKey(name)
		this.syncService.queueSync()
	}

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
		await this.createNote(note)
		parent.changeItem('metadata').notes.push(note.id)
		await this.writeNote(parent)
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
			const resolveParent = (dir: string) => noteMap.get(dir) ?? importRootNote

			// Pass 1: create a note for every exported folder, shallowest first so
			// each parent note is always in noteMap before its children are processed.
			for (const folder of parsed.filter(f => f.isFolder).sort(byDepth)) {
				noteMap.set(`${folder.dir ? folder.dir + '/' : ''}${folder.name}`, await this.createChildNote(resolveParent(folder.dir), folder.name))
			}

			// Pass 2: process .md files. Notes that also have children were exported
			// as both a folder and a sibling .md file — in that case noteMap already
			// has the note from pass 1 and we just attach the text. Otherwise we
			// create a new leaf note.
			const mdFiles = parsed.filter(f => !f.isFolder && f.name.endsWith('.md')).sort(byDepth)

			for (const file of mdFiles) {
				const nameWithoutExt = file.name.slice(0, -3)
				const key = `${file.dir ? file.dir + '/' : ''}${nameWithoutExt}`
				const text = decoder.decode(fromBase64(file.content))
				const existingNote = noteMap.get(key)
				if (existingNote) {
					existingNote.changeItem('text').text = text
					await this.writeNote(existingNote)
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
