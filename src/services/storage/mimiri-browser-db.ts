import { openDB, type IDBPDatabase } from 'idb'
import type { Note } from '../types/note'
import type { Guid } from '../types/guid'
import type { MimiriDb } from './mimiri-store'
import type { InitializationData, KeyData, NoteData } from './type'

export class MimiriBrowserDb implements MimiriDb {
	private db: IDBPDatabase<any>
	constructor() {}

	public async open(username: string) {
		this.db = await openDB(`mimiri-${username}`, 2, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('note-store')) {
					db.createObjectStore('note-store')
				}
				if (!db.objectStoreNames.contains('key-store')) {
					db.createObjectStore('key-store')
				}
				if (!db.objectStoreNames.contains('user-store')) {
					db.createObjectStore('user-store')
				}
			},
		})
		// await this.test()
	}

	public async close() {
		const db = this.db
		if (db) {
			this.db = undefined as any
			await db.close()
		}
	}

	public async setLastSync(lastNoteSync: number, lastKeySync: number): Promise<void> {
		return this.db.put('user-store', { lastNoteSync, lastKeySync }, 'last-sync')
	}

	public async getLastSync(): Promise<{ lastNoteSync: number; lastKeySync: number } | undefined> {
		return this.db.get('user-store', 'last-sync')
	}

	public async setInitializationData(data: InitializationData): Promise<void> {
		await this.db.put('user-store', data, 'initialization-data')
	}

	public async getInitializationData(): Promise<InitializationData | undefined> {
		return this.db.get('user-store', 'initialization-data')
	}

	public async setObfuscationKey(obfuscationKey: string): Promise<void> {
		await this.db.put('user-store', obfuscationKey, 'obfuscation-key')
	}

	public async getObfuscationKey(): Promise<string | undefined> {
		return await this.db.get('user-store', 'obfuscation-key')
	}

	public async setNoAccountData(data: any): Promise<void> {
		await this.db.put('user-store', data, 'no-account-data')
	}

	public async getNoAccountData(): Promise<any | undefined> {
		return this.db.get('user-store', 'no-account-data')
	}

	public async setAccountData(data: any): Promise<void> {
		await this.db.put('user-store', data, 'account-data')
	}

	public async getAccountData(): Promise<any | undefined> {
		return this.db.get('user-store', 'account-data')
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

	public async setKey(key: KeyData): Promise<void> {
		await this.db.put('key-store', key, `key-${key.id}`)
	}

	public async getKey(id: Guid): Promise<KeyData | undefined> {
		return this.db.get('key-store', `key-${id}`)
	}

	public async getAllKeys(): Promise<KeyData[]> {
		return this.db.getAll('key-store')
	}

	// private async test() {
	// 	this.setKey({
	// 		id: 'test-key-1',
	// 		public: true,
	// 	} as any)
	// 	this.setKey({
	// 		id: 'test-key-2',
	// 		public: true,
	// 	} as any)
	// 	this.setKey({
	// 		id: 'test-key-3',
	// 		public: true,
	// 	} as any)
	// 	this.setKey({
	// 		id: 'test-key-4',
	// 		public: true,
	// 	} as any)
	// 	console.log('Keys in DB:', await this.getAllKeys())
	// }
}
