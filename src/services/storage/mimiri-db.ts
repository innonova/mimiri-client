import { openDB, type IDBPDatabase, type IDBPTransaction } from 'idb'
import { newGuid, type Guid } from '../types/guid'
import type { InitializationData, KeyData, LocalData, LocalUserData, NoteData } from './type'

export class MimiriDb {
	private logicalName: string = ''
	private db: IDBPDatabase<any>
	constructor() {}

	private async openMappingDb(): Promise<IDBPDatabase<any>> {
		return openDB('mimiri', 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('name-mappings')) {
					db.createObjectStore('name-mappings')
				}
			},
		})
	}

	private async getDbName(logicalName: string): Promise<string> {
		const mappingDb = await this.openMappingDb()
		try {
			const mapping = await mappingDb.get('name-mappings', logicalName)
			if (mapping) {
				return mapping.actualName
			}
			const actualName = `mimiri-${newGuid()}`
			await mappingDb.put('name-mappings', { actualName }, logicalName)
			return actualName
		} finally {
			await mappingDb.close()
		}
	}

	public async open(username: string) {
		this.logicalName = username
		const actualDbName = await this.getDbName(this.logicalName)
		this.db = await openDB(actualDbName, 4, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('note-store')) {
					db.createObjectStore('note-store')
				}
				if (!db.objectStoreNames.contains('note-local-store')) {
					db.createObjectStore('note-local-store')
				}
				if (!db.objectStoreNames.contains('note-deleted-store')) {
					db.createObjectStore('note-deleted-store')
				}
				if (!db.objectStoreNames.contains('key-store')) {
					db.createObjectStore('key-store')
				}
				if (!db.objectStoreNames.contains('key-local-store')) {
					db.createObjectStore('key-local-store')
				}
				if (!db.objectStoreNames.contains('key-deleted-store')) {
					db.createObjectStore('key-deleted-store')
				}
				if (!db.objectStoreNames.contains('user-store')) {
					db.createObjectStore('user-store')
				}
			},
		})
	}

	public async close() {
		const db = this.db
		if (db) {
			this.db = undefined as any
			await db.close()
		}
	}

	public async renameDatabase(newName: string): Promise<void> {
		if (this.logicalName !== newName) {
			const mappingDb = await this.openMappingDb()
			try {
				await mappingDb.put('name-mappings', { actualName: this.db.name }, newName)
				await mappingDb.delete('name-mappings', this.logicalName)
				this.logicalName = newName
			} finally {
				await mappingDb.close()
			}
		}
	}

	public beginTransaction(): MimiriTransaction {
		return new MimiriTransaction(this.db, [
			'note-store',
			'note-local-store',
			'note-deleted-store',
			'key-store',
			'key-local-store',
			'key-deleted-store',
			'user-store',
		])
	}

	public async setLastSync(lastNoteSync: number, lastKeySync: number): Promise<void> {
		return this.db.put('user-store', { lastNoteSync, lastKeySync }, 'last-sync')
	}

	public async getLastSync(): Promise<{ lastNoteSync: number; lastKeySync: number } | undefined> {
		return this.db.get('user-store', 'last-sync')
	}

	public async setLocalUserData(data: LocalUserData): Promise<void> {
		await this.db.put('user-store', data, 'local-user-data')
	}

	public async getLocalUserData(): Promise<LocalUserData | undefined> {
		return this.db.get('user-store', 'local-user-data')
	}

	public async setLocalData(data: LocalData): Promise<void> {
		await this.db.put('user-store', data, 'local-data')
	}

	public async getLocalData(): Promise<LocalData | undefined> {
		return this.db.get('user-store', 'local-data')
	}

	public async setInitializationData(data: InitializationData): Promise<void> {
		await this.db.put('user-store', data, 'initialization-data')
	}

	public async getInitializationData(): Promise<InitializationData | undefined> {
		return this.db.get('user-store', 'initialization-data')
	}

	public async deleteInitializationData(): Promise<void> {
		return this.db.delete('user-store', 'initialization-data')
	}

	public async setUserData(userData: any): Promise<void> {
		await this.db.put('user-store', userData, 'user-data')
	}

	public async getUserData(): Promise<any | undefined> {
		return this.db.get('user-store', 'user-data')
	}

	public async setNote(note: NoteData): Promise<void> {
		await this.db.put('note-store', note, `note-${note.id}`)
	}

	public async getNote(id: Guid): Promise<NoteData | undefined> {
		return this.db.get('note-store', `note-${id}`)
	}

	public async setLocalNote(note: NoteData): Promise<void> {
		await this.db.put('note-local-store', note, `note-${note.id}`)
	}

	public async getLocalNote(id: Guid): Promise<NoteData | undefined> {
		return this.db.get('note-local-store', `note-${id}`)
	}

	public async deleteLocalNote(id: Guid): Promise<void> {
		await this.db.delete('note-local-store', `note-${id}`)
	}

	public async getAllLocalNotes(): Promise<NoteData[]> {
		return this.db.getAll('note-local-store')
	}

	public async clearDeleteRemoteNote(id: Guid): Promise<void> {
		await this.db.delete('note-deleted-store', `note-${id}`)
	}

	public async getAllDeletedNotes(): Promise<Guid[]> {
		return this.db.getAll('note-deleted-store')
	}

	public async setKey(key: KeyData): Promise<void> {
		await this.db.put('key-store', key, `key-${key.id}`)
	}

	public async getKey(id: Guid): Promise<KeyData | undefined> {
		return this.db.get('key-store', `key-${id}`)
	}

	public async getAllKeys(): Promise<KeyData[]> {
		return this.db.getAll('key-store')
	}

	public async setLocalKey(key: KeyData): Promise<void> {
		await this.db.put('key-local-store', key, `key-${key.id}`)
	}

	public async getLocalKey(id: Guid): Promise<KeyData | undefined> {
		return this.db.get('key-local-store', `key-${id}`)
	}

	public async deleteLocalKey(id: Guid): Promise<void> {
		await this.db.delete('key-local-store', `key-${id}`)
	}

	public async getAllLocalKeys(): Promise<KeyData[]> {
		return this.db.getAll('key-local-store')
	}

	// Never actually happens
	public async deleteRemoteKey(id: Guid): Promise<void> {
		await this.db.put('key-deleted-store', id, `key-${id}`)
	}

	public async clearDeleteRemoteKey(id: Guid): Promise<void> {
		await this.db.delete('key-deleted-store', `key-${id}`)
	}

	public async getAllDeletedKeys(): Promise<Guid[]> {
		return this.db.getAll('key-deleted-store')
	}
}

export class MimiriTransaction {
	private actions: ((tx: IDBPTransaction<any, any, any>) => void)[] = []

	constructor(
		private db: IDBPDatabase<any>,
		private storeNames: string | string[],
	) {}

	public async getNote(id: Guid): Promise<NoteData | undefined> {
		return this.db.get('note-store', `note-${id}`)
	}

	public async getLocalNote(id: Guid): Promise<NoteData | undefined> {
		return this.db.get('note-local-store', `note-${id}`)
	}

	public async setLocalNote(note: NoteData): Promise<void> {
		this.actions.push(tx => {
			tx.objectStore('note-local-store').put(note, `note-${note.id}`)
		})
		return Promise.resolve()
	}

	public async deleteLocalNote(id: Guid): Promise<void> {
		this.actions.push(tx => {
			tx.objectStore('note-local-store').delete(`note-${id}`)
		})
		return Promise.resolve()
	}

	public async deleteRemoteNote(id: Guid): Promise<void> {
		this.actions.push(tx => {
			tx.objectStore('note-deleted-store').put(id, `note-${id}`)
		})
		return Promise.resolve()
	}

	public async rollback() {
		return Promise.resolve()
	}

	public async commit() {
		const tx = this.db.transaction(this.storeNames, 'readwrite')
		this.actions.forEach(action => action(tx))
		return tx.done
	}
}
