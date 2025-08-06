import type { Guid } from '../types/guid'
import { Note } from '../types/note'
import type { MimerNote } from '../types/mimer-note'
import { newGuid } from '../types/guid'
import { dateTimeNow } from '../types/date-time'
import { VersionConflictError } from './mimiri-client'
import { MultiAction } from './multi-action'
import { debug } from '../../global'
import type { NoteService } from './note-service'
import type { SynchronizationService } from './synchronization-service'
import type { MimiriClient } from './mimiri-client'
import type { UIStateManager } from './ui-state-manager'
import type { NoteTreeManager } from './note-tree-manager'
import { MimerError, type SharedState } from './type'
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
			try {
				await this.writeNote(note.note)
			} catch (err) {
				if (err instanceof VersionConflictError) {
					// TODO: Handle version conflict
				}
				debug.logError('Failed to save note', err)
				throw err
			}
		} finally {
			this.uiManager.endAction()
		}
	}

	public async delete(mimerNote: MimerNote, physicallyDelete: boolean) {
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
			await multiAction.commit()
			this.syncService.queueSync()
			await this.syncService.waitForSync(15000)
			await (await this.treeManager.getNoteById(parent.id))?.select()
		} finally {
			this.uiManager.endAction()
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

	private async recursiveDelete(multiAction: MultiAction, id: Guid) {
		const note = await this.noteService.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveDelete(multiAction, childId)
			}
			await multiAction.deleteNote(note)
		}
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
			await multiAction.commit()
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
				const multiAction = this.beginMultiAction()
				multiAction.onlineOnly()
				if (!this.cryptoManager.getKeyByName(share.keyName)) {
					await this.cryptoManager.createKeyFromNoteShare(newGuid(), share, { shared: true })
					this.syncService.queueSync()
					if (!(await this.syncService.waitForSync(15000))) {
						return
					}
				}
				const shareParent = parent?.note ?? (await this.noteService.readNote(this.treeManager.root.id))
				if (!shareParent.getItem('metadata').notes.includes(share.noteId)) {
					shareParent.changeItem('metadata').notes.push(share.noteId)
				}
				await multiAction.updateNote(shareParent)
				await multiAction.commit()
				await this.api.deleteShareOffer(share.id)
				this.syncService.queueSync()
				await this.syncService.waitForSync(15000)
				await parent?.expand()
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
}
