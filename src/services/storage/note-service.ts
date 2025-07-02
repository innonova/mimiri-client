import { type Guid } from '../types/guid'
import { Note } from '../types/note'
import { NoteActionType, type NoteAction } from '../types/requests'
import type { NoteData, SharedState } from './type'
import type { CryptographyManager } from './cryptography-manager'
import type { MimiriDb } from './mimiri-db'

export class NoteService {
	constructor(
		private db: MimiriDb,
		private cryptoManager: CryptographyManager,
		private state: SharedState,
		private noteUpdatedCallback: (noteId: Guid) => Promise<void>,
	) {}

	public async createNote(note: Note): Promise<void> {
		await this.writeNote(note)
	}

	public async writeNote(note: Note): Promise<void> {
		if (!this.state.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		// TODO use changed
		const keySet = await this.cryptoManager.getKeyByName(note.keyName)
		const noteData: NoteData = {
			id: note.id,
			keyName: note.keyName,
			sync: note.sync,
			items: await Promise.all(
				note.items.map(async item => ({
					version: item.version,
					type: item.type,
					data: await this.cryptoManager.localCrypt.encrypt(JSON.stringify(item.data)),
					modified: item.modified,
					created: item.created,
				})),
			),
			modified: note.modified,
			created: note.created,
		}
		await this.db.setLocalNote(noteData)
		await this.noteUpdatedCallback(note.id)
	}

	public async readNote(id: Guid, base?: Note): Promise<Note> {
		if (!this.state.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		let local = true
		let noteData = await this.db.getLocalNote(id)
		if (!noteData) {
			local = false
			noteData = await this.db.getNote(id)
		}

		if (!noteData) {
			return undefined
		}
		const keySet = await this.cryptoManager.getKeyByName(noteData.keyName)
		const note = new Note()
		note.id = noteData.id
		note.keyName = noteData.keyName
		note.modified = noteData.modified
		note.created = noteData.created
		note.sync = noteData.sync
		const crypt = local ? this.cryptoManager.localCrypt : keySet?.symmetric

		note.items = await Promise.all(
			noteData.items.map(async item => ({
				version: item.version,
				type: item.type,
				data: await this.cryptoManager.tryDecryptNoteItemObject(item, crypt),
				changed: false,
				size: item.data.length,
				modified: item.modified,
				created: item.created,
			})),
		)
		// console.log('readNote', note.id, note, local)
		return note
	}

	private async deleteNote(id: Guid): Promise<void> {
		// TODO: Implement delete note logic
	}

	public async createDeleteAction(note: Note): Promise<NoteAction> {
		const action: NoteAction = {
			type: NoteActionType.Delete,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		return action
	}

	public async createUpdateAction(note: Note): Promise<NoteAction> {
		const action: NoteAction = {
			type: NoteActionType.Update,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		const keySet = await this.cryptoManager.getKeyByName(note.keyName)
		let deltaSize = 0
		for (const item of note.items) {
			if (item.changed) {
				const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
				deltaSize += data.length - item.size
				action.items.push({
					version: item.version,
					type: item.type,
					data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
				})
			}
		}
		return action
	}

	public async createCreateAction(note: Note): Promise<NoteAction> {
		const action: NoteAction = {
			type: NoteActionType.Create,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		const keySet = await this.cryptoManager.getKeyByName(note.keyName)
		let totalSize = 0
		for (const item of note.items) {
			const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
			totalSize += data.length
			action.items.push({
				version: 0,
				type: item.type,
				data,
			})
		}
		return action
	}

	public async createChangeKeyAction(noteId: Guid, newKeyName: Guid): Promise<NoteAction> {
		const note = await this.readNote(noteId)
		const action: NoteAction = {
			type: NoteActionType.Update,
			id: note.id,
			keyName: newKeyName,
			oldKeyName: note.keyName,
			items: [],
		}
		const keySet = await this.cryptoManager.getKeyByName(newKeyName)
		for (const item of note.items) {
			action.items.push({
				version: item.version,
				type: item.type,
				data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
			})
		}
		return action
	}

	public async multiAction(actions: NoteAction[]): Promise<Guid[]> {
		const transaction = await this.db.beginTransaction()
		try {
			const updatedNoteIds: Guid[] = []
			for (const action of actions) {
				if (action.type === NoteActionType.Create) {
					await transaction.setLocalNote({
						id: action.id,
						keyName: action.keyName,
						sync: 0,
						items: await Promise.all(
							action.items.map(async item => ({
								version: item.version,
								type: item.type,
								data: await this.cryptoManager.tryReencryptNoteItemDataToLocal(item, action.keyName),
								modified: new Date().toISOString(),
								created: new Date().toISOString(),
							})),
						),
						modified: new Date().toISOString(),
						created: new Date().toISOString(),
					})
				} else if (action.type === NoteActionType.Update) {
					let note = await transaction.getLocalNote(action.id)
					let local = true
					if (!note) {
						note = await transaction.getNote(action.id)
						local = false
					}
					if (!note) {
						throw new Error(`Note with id ${action.id} not found`)
					}
					note.keyName = action.keyName
					for (const type of new Set([...action.items.map(item => item.type), ...note.items.map(item => item.type)])) {
						const existingItem = note.items.find(i => i.type === type)
						const newItem = action.items.find(i => i.type === type)
						if (newItem && existingItem) {
							existingItem.data = await this.cryptoManager.tryReencryptNoteItemDataToLocal(newItem, action.keyName)
							existingItem.version = newItem.version
						} else if (!newItem && existingItem && !local) {
							existingItem.data = await this.cryptoManager.tryReencryptNoteItemDataToLocal(existingItem, action.keyName)
						} else if (newItem && !existingItem) {
							note.items.push({
								version: newItem.version,
								type: newItem.type,
								data: await this.cryptoManager.tryReencryptNoteItemDataToLocal(newItem, action.keyName),
								modified: new Date().toISOString(),
								created: new Date().toISOString(),
							})
						}
					}
					await transaction.setLocalNote(note)
					updatedNoteIds.push(note.id)
				} else if (action.type === NoteActionType.Delete) {
					if (await transaction.getLocalNote(action.id)) {
						await transaction.deleteLocalNote(action.id)
					}
					if (await transaction.getNote(action.id)) {
						await transaction.deleteRemoteNote(action.id)
					}
				}
			}
			await transaction.commit()
			for (const noteId of updatedNoteIds) {
				await this.noteUpdatedCallback(noteId)
			}
		} catch (error) {
			await transaction.rollback()
			throw error
		}
		return []
	}
}
