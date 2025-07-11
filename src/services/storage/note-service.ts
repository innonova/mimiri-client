import { type Guid } from '../types/guid'
import { Note } from '../types/note'
import { NoteActionType, type NoteAction } from '../types/requests'
import type { NoteData, SharedState } from './type'
import type { CryptographyManager } from './cryptography-manager'
import type { MimiriDb } from './mimiri-db'
import type { MimiriClient } from './mimiri-client'
import { de } from 'date-fns/locale'

export class NoteService {
	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
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
		return this.db.syncLock.withLock('writeNote', async () => {
			// TODO use changed
			const remoteNote = await this.db.getNote(note.id)
			const localNote = await this.db.getLocalNote(note.id)
			const noteData: NoteData = {
				id: note.id,
				keyName: note.keyName,
				sync: note.sync,
				items: (
					await Promise.all(
						note.items.map(async item => ({
							version: item.version,
							type: item.type,
							data: await this.cryptoManager.localCrypt.encrypt(JSON.stringify(item.data)),
							modified: item.modified,
							created: item.created,
							size: item.data.length,
						})),
					)
				).map(item => {
					item.size = item.data.length
					return item
				}),
				modified: note.modified,
				created: note.created,
				size: 0,
				base: remoteNote,
			}
			noteData.size = noteData.items.reduce((sum, item) => sum + item.size, 0)
			this.state.userStats.localSizeDelta += noteData.size - (localNote?.size ?? 0)
			this.state.userStats.localNoteCountDelta += remoteNote || localNote ? 0 : 1
			this.state.userStats.localSize += noteData.size - (localNote?.size ?? 0)
			this.state.userStats.localNoteCount += localNote ? 0 : 1
			await this.db.setLocalNote(noteData)
			await this.noteUpdatedCallback(note.id)
		})
	}

	public async readNote(id: Guid, base?: Note): Promise<Note> {
		if (!this.state.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		return this.db.syncLock.withLock('readNote', async () => {
			let local = true
			let noteData = await this.db.getLocalNote(id)
			if (!noteData) {
				local = false
				noteData = await this.db.getNote(id)
			}

			if (!noteData) {
				noteData = await this.api.readNote(id)
				await this.db.setNote(noteData)
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
			note.sync = +noteData.sync
			const crypt = local ? this.cryptoManager.localCrypt : keySet?.symmetric

			note.items = await Promise.all(
				noteData.items.map(async item => ({
					version: +item.version,
					type: item.type,
					data: await this.cryptoManager.tryDecryptNoteItemObject(item, crypt),
					changed: false,
					size: item.data.length,
					modified: item.modified,
					created: item.created,
				})),
			)
			// console.log('readNote', note.id, note, local)
			// if (note.id === '23c6845e-ee42-402e-962d-1e553da928df') {
			// 	console.log(JSON.stringify(note, null, 2))
			// }

			return note
		})
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
		let deltaSize = 0
		let deltaNoteCount = 0
		let localNoteCount = 0
		let localSize = 0
		return this.db.syncLock.withLock('multiAction', async () => {
			const transaction = await this.db.beginTransaction()
			try {
				const updatedNoteIds: Guid[] = []
				for (const action of actions) {
					if (action.type === NoteActionType.Create) {
						const note = {
							id: action.id,
							keyName: action.keyName,
							sync: 0,
							items: (
								await Promise.all(
									action.items.map(async item => ({
										version: item.version,
										type: item.type,
										data: await this.cryptoManager.tryReencryptNoteItemDataToLocal(item, action.keyName),
										modified: new Date().toISOString(),
										created: new Date().toISOString(),
										size: 0,
									})),
								)
							).map(item => {
								item.size = item.data.length
								return item
							}),
							modified: new Date().toISOString(),
							created: new Date().toISOString(),
							size: 0,
						}
						note.size = note.items.reduce((sum, item) => sum + item.size, 0)
						deltaSize += note.size
						deltaNoteCount += 1
						localSize += note.size
						localNoteCount += 1
						await transaction.setLocalNote(note)
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
						const sizeBefore = note.size
						note.keyName = action.keyName
						for (const type of new Set([
							...action.items.map(item => item.type),
							...note.items.map(item => item.type),
						])) {
							const existingItem = note.items.find(i => i.type === type)
							const newItem = action.items.find(i => i.type === type)
							if (newItem && existingItem) {
								existingItem.data = await this.cryptoManager.tryReencryptNoteItemDataToLocal(newItem, action.keyName)
								existingItem.version = newItem.version
							} else if (!newItem && existingItem && !local) {
								existingItem.data = await this.cryptoManager.tryReencryptNoteItemDataToLocal(
									existingItem,
									action.keyName,
								)
							} else if (newItem && !existingItem) {
								note.items.push({
									version: newItem.version,
									type: newItem.type,
									data: await this.cryptoManager.tryReencryptNoteItemDataToLocal(newItem, action.keyName),
									modified: new Date().toISOString(),
									created: new Date().toISOString(),
									size: 0,
								})
							}
						}
						note.items.forEach(item => {
							item.size = item.data.length
						})
						note.size = note.items.reduce((sum, item) => sum + item.size, 0)
						if (!local) {
							note.base = await transaction.getNote(note.id)
							localNoteCount += 1
							localSize += note.size
						} else {
							localSize += note.size - sizeBefore
						}
						deltaSize += note.size - sizeBefore
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
				this.state.userStats.localSizeDelta += deltaSize
				this.state.userStats.localNoteCountDelta += deltaNoteCount
				for (const noteId of updatedNoteIds) {
					await this.noteUpdatedCallback(noteId)
				}
			} catch (error) {
				await transaction.rollback()
				throw error
			}
			return []
		})
	}
}
