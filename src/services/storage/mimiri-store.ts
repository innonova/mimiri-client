import { version } from 'vue'
import { debug, env, ipcClient } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { fromBase64, toBase64, toHex } from '../hex-base64'
import { mimiriPlatform } from '../mimiri-platform'
import { SymmetricCrypt } from '../symmetric-crypt'
import { emptyGuid, newGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import { NoteActionType, type KeySyncAction, type NoteAction, type NoteSyncAction } from '../types/requests'
import type { ClientConfig, ShareResponse, SyncResult } from '../types/responses'
import type { InitializationData, KeyData, LocalData, NoteData, SyncInfo } from './type'

export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export interface MimiriApi {
	authenticate(username: string, password: string): Promise<InitializationData | undefined>
	setRootSignature(username: string, signature: CryptSignature): void
	verifyCredentials(): Promise<string | undefined>
	getChangesSince(noteSince: number, keySince: number): Promise<SyncInfo>
	syncPushChanges(noteActions: NoteSyncAction[], keyActions: KeySyncAction[]): Promise<SyncResult[]>
	registerForChanges(callback: (changes: SyncInfo) => void): Promise<void>
	multiAction(actions: NoteAction[], keyResolver?: (keyName: Guid) => CryptSignature): Promise<Guid[]>
}

export interface MimiriTransaction {
	commit(): Promise<void>
	rollback(): Promise<void>
	setLocalNote(note: NoteData): Promise<void>
	getLocalNote(id: Guid): Promise<NoteData | undefined>
	deleteLocalNote(id: Guid): Promise<void>
	getNote(id: Guid): Promise<NoteData | undefined>
	deleteRemoteNote(id: Guid): Promise<void>
}

export interface MimiriDb {
	open(username: string): Promise<void>
	close(): Promise<void>

	beginTransaction(): MimiriTransaction

	setInitializationData(data: InitializationData): Promise<void>
	getInitializationData(): Promise<InitializationData | undefined>

	setLocalData(data: LocalData): Promise<void>
	getLocalData(): Promise<LocalData | undefined>

	setLastSync(lastNoteSync: number, lastKeySync: number): Promise<void>
	getLastSync(): Promise<{ lastNoteSync: number; lastKeySync: number } | undefined>

	setObfuscationKey(obfuscationKey: string): Promise<void>
	getObfuscationKey(): Promise<string | undefined>

	setNoAccountData(data: any): Promise<void>
	getNoAccountData(): Promise<any | undefined>

	setUserData(userData: any): Promise<void>
	getUserData(): Promise<any | undefined>

	setNote(note: NoteData): Promise<void>
	getNote(id: Guid): Promise<NoteData | undefined>

	setLocalNote(note: NoteData): Promise<void>
	getLocalNote(id: Guid): Promise<NoteData | undefined>
	deleteLocalNote(id: Guid): Promise<void>
	getAllLocalNotes(): Promise<NoteData[]>
	deleteRemoteNote(id: Guid): Promise<void>
	clearDeleteRemoteNote(id: Guid): Promise<void>
	getAllDeletedNotes(): Promise<Guid[]>

	setKey(key: KeyData): Promise<void>
	getKey(id: Guid): Promise<KeyData | undefined>
	getAllKeys(): Promise<KeyData[]>

	setLocalKey(key: KeyData): Promise<void>
	getLocalKey(id: Guid): Promise<KeyData | undefined>
	deleteLocalKey(id: Guid): Promise<void>
	getAllLocalKeys(): Promise<KeyData[]>
	deleteRemoteKey(id: Guid): Promise<void>
	clearDeleteRemoteKey(id: Guid): Promise<void>
	getAllDeletedKeys(): Promise<Guid[]>
}

export interface LoginData {
	username: string
	password: string
	preferOffline?: boolean
}

export interface UserStats {
	size: number
	noteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export class MimiriStore {
	private _username: string
	private _userId: Guid = emptyGuid()
	private _userData: any
	private _userCryptAlgorithm: string = SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM
	private _rootCrypt: SymmetricCrypt
	private _rootSignature: CryptSignature
	private _localCrypt: SymmetricCrypt
	private _keys: KeySet[] = []
	private _online: boolean = true
	private _clientConfig: ClientConfig = { features: [] }
	private _userStats: UserStats = {
		size: 0,
		noteCount: 0,
		maxTotalBytes: 0,
		maxNoteBytes: 0,
		maxNoteCount: 0,
	}

	constructor(
		private db: MimiriDb,
		private api: MimiriApi,
		private noteUpdatedCallback: (note: Note) => void,
	) {}

	async init() {
		console.log('MimiriStore init')
	}

	async checkUsername(
		username: string,
		pow: string,
	): Promise<{ bitsExpected: number; proofAccepted: boolean; available: boolean }> {
		return Promise.resolve({
			bitsExpected: 15,
			proofAccepted: true,
			available: true,
		})
	}

	public async setLoginData(data: string) {
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			await ipcClient.session.set('mimiri-login-data', data)
		} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
			localStorage.setItem('mimiri-login-data', data)
		} else {
			sessionStorage.setItem('mimiri-login-data', data)
		}
	}

	public async getLoginData() {
		let str
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			str = await ipcClient.session.get('mimiri-login-data')
		} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
			str = localStorage.getItem('mimiri-login-data')
		} else {
			str = sessionStorage.getItem('mimiri-login-data')
		}
		return str
	}

	public async persistLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) && mimiriPlatform.supportsBiometry)
		) {
			const loginData = {
				username: this._username,
				userId: this._userId,
				userCryptAlgorithm: this._userCryptAlgorithm,
				rootCrypt: {
					algorithm: this._rootCrypt.algorithm,
					key: await this._rootCrypt.getKeyString(),
				},
				rootSignature: {
					algorithm: this._rootSignature.algorithm,
					publicKey: await this._rootSignature.publicKeyPem(),
					privateKey: await this._rootSignature.privateKeyPem(),
				},
				data: await this._rootCrypt.encrypt(
					JSON.stringify({
						clientConfig: this._clientConfig,
						userStats: this._userStats,
						userData: this._userData,
					}),
					true,
				),
			}

			const zipped = await new Response(
				new Blob([new TextEncoder().encode(JSON.stringify(loginData))])
					.stream()
					.pipeThrough(new CompressionStream('gzip')),
			).arrayBuffer()
			const str = toBase64(zipped)
			if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
				await ipcClient.session.set('mimiri-login-data', str)
			} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
				localStorage.setItem('mimiri-login-data', str)
			} else {
				sessionStorage.setItem('mimiri-login-data', str)
			}
		}
	}

	public async restoreLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) && mimiriPlatform.supportsBiometry)
		) {
			try {
				let str
				if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
					str = await ipcClient.session.get('mimiri-login-data')
				} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
					const localStr = localStorage.getItem('mimiri-login-data')
					if (!localStr || !(await mimiriPlatform.verifyBiometry())) {
						return
					}
					str = localStr
				} else {
					str = sessionStorage.getItem('mimiri-login-data')
				}
				if (!str) {
					return
				}
				const unzipped = await new Response(
					new Blob([fromBase64(str)]).stream().pipeThrough(new DecompressionStream('gzip')),
				).text()
				const loginData = JSON.parse(unzipped)
				this._username = loginData.username
				this._userId = loginData.userId
				this._userCryptAlgorithm = loginData.userCryptAlgorithm
				this._rootCrypt = await SymmetricCrypt.fromKeyString(loginData.rootCrypt.algorithm, loginData.rootCrypt.key)
				this._rootSignature = await CryptSignature.fromPem(
					loginData.rootSignature.algorithm ?? CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
					loginData.rootSignature.publicKey,
					loginData.rootSignature.privateKey,
				)
				await this.db.open(this._username)
				await this.ensureLocalCrypt()
				if (!(await this.goOnline())) {
					const data = JSON.parse(await this._rootCrypt.decrypt(loginData.data))
					this._clientConfig = data.clientConfig
					this._userStats = data.userStats
					this._userData = data.userData
				}
				await this.sync()
				await this.loadAllKeys()
				await this.syncPush()
				await this.sync()
				return true
			} catch (ex) {
				debug.logError('Failed to restore login data', ex)
			}
		}
		return false
	}

	public async createUser(
		username: string,
		password: string,
		userData: any,
		pow: string,
		iterations: number,
	): Promise<void> {
		console.log('Creating user:', username)
		await this.db.open(username)
		const initializationData: InitializationData = {
			password: {
				algorithm: DEFAULT_PASSWORD_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			},
			userCrypt: {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			},
			rootCrypt: {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				key: '',
			},
			rootSignature: {
				algorithm: CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
				publicKey: '',
				privateKey: '',
			},
			userId: emptyGuid(),
			userData,
		}

		this._userCryptAlgorithm = initializationData.userCrypt.algorithm
		const userCrypt = await SymmetricCrypt.fromPassword(
			initializationData.userCrypt.algorithm,
			password,
			initializationData.userCrypt.salt,
			initializationData.userCrypt.iterations,
		)

		this._rootCrypt = await SymmetricCrypt.create(initializationData.rootCrypt.algorithm)
		initializationData.rootCrypt.key = await userCrypt.encryptBytes(await this._rootCrypt.getKey())

		this._rootSignature = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)
		initializationData.rootSignature.publicKey = await this._rootSignature.publicKeyPem()
		initializationData.rootSignature.privateKey = await userCrypt.encrypt(await this._rootSignature.privateKeyPem())

		await this.db.setInitializationData(initializationData)

		this._userData = userData
		this._username = username
		await this.db.setUserData(this._userData)
		await this.loadAllKeys()
	}

	public async login(data: LoginData): Promise<boolean> {
		let initializationData = await this.api.authenticate(data.username, data.password)
		if (!initializationData) {
			return false
		}
		await this.db.open(data.username)
		this._userCryptAlgorithm = initializationData.userCrypt.algorithm
		const userCrypt = await SymmetricCrypt.fromPassword(
			initializationData.userCrypt.algorithm,
			data.password,
			initializationData.userCrypt.salt,
			initializationData.userCrypt.iterations,
		)
		this._rootCrypt = await SymmetricCrypt.fromKey(
			initializationData.rootCrypt.algorithm,
			await userCrypt.decryptBytes(initializationData.rootCrypt.key),
		)
		this._rootSignature = await CryptSignature.fromPem(
			initializationData.rootSignature.algorithm,
			initializationData.rootSignature.publicKey,
			await userCrypt.decrypt(initializationData.rootSignature.privateKey),
		)
		this._userData = JSON.parse(await this._rootCrypt.decrypt(initializationData.userData))
		this._username = data.username
		this._userId = initializationData.userId

		this.api.setRootSignature(this._username, this._rootSignature)
		await this.db.setInitializationData(initializationData)
		await this.sync()
		await this.loadAllKeys()
		await this.syncPush()
		await this.sync()
		await this.persistLogin()
	}

	private async ensureLocalCrypt(): Promise<void> {
		let localData = await this.db.getLocalData()
		if (!localData) {
			this._localCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			localData = {
				localCrypt: {
					algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
					key: await this._rootCrypt.encryptBytes(await this._localCrypt.getKey()),
				},
			}
			await this.db.setLocalData(localData)
		} else {
			this._localCrypt = await SymmetricCrypt.fromKey(
				localData.localCrypt.algorithm,
				await this._rootCrypt.decryptBytes(localData.localCrypt.key),
			)
		}
	}

	async goOnline(password?: string): Promise<boolean> {
		this.api.setRootSignature(this._username, this._rootSignature)
		const data = await this.api.verifyCredentials()
		if (data) {
			this._userData = JSON.parse(await this._rootCrypt.decrypt(data))
			this._online = true
			return true
		}
		return false
	}

	private async sync(pushUpdates: boolean = false): Promise<void> {
		const lastSync = await this.db.getLastSync()

		let nextNoteSync = lastSync?.lastNoteSync ?? 0
		let nextKeySync = lastSync?.lastKeySync ?? 0
		let changes = await this.api.getChangesSince(nextNoteSync, nextKeySync)

		const updatedNoteIds: Guid[] = []

		for (let i = 0; i < 100; i++) {
			let syncChanged = false
			for (const key of changes.keys) {
				if (+key.sync > nextKeySync) {
					nextKeySync = +key.sync
					syncChanged = true
				}
				const data = JSON.parse(key.data) as KeyData
				this.db.setKey({
					id: key.id,
					userId: data.userId,
					name: key.name,
					algorithm: data.algorithm,
					asymmetricAlgorithm: data.asymmetricAlgorithm,
					keyData: data.keyData,
					publicKey: data.publicKey,
					privateKey: data.privateKey,
					metadata: data.metadata,
					modified: key.modified,
					created: key.created,
					sync: key.sync,
				})
			}
			for (const note of changes.notes) {
				if (+note.sync > nextNoteSync) {
					nextNoteSync = +note.sync
					syncChanged = true
				}
				this.db.setNote({
					id: note.id,
					keyName: note.keyName,
					modified: note.modified,
					created: note.created,
					sync: note.sync,
					items: note.items.map(item => ({
						version: item.version,
						type: item.itemType,
						data: item.data,
						modified: item.modified,
						created: item.created,
					})),
				})
				updatedNoteIds.push(note.id)
			}
			if (!syncChanged) {
				break
			}
			await this.db.setLastSync(nextNoteSync, nextKeySync)
			changes = await this.api.getChangesSince(nextNoteSync, nextKeySync)
		}
		if (pushUpdates) {
			for (const noteId of updatedNoteIds) {
				this.noteUpdatedCallback(await this.readNote(noteId))
			}
		}
	}

	private async syncPush(): Promise<void> {
		console.log('Pushing changes to server...')

		const noteActions: NoteSyncAction[] = []
		const keyActions: KeySyncAction[] = []

		console.log('Loading local notes...')
		const localNotes = await this.db.getAllLocalNotes()
		for (const localNote of localNotes) {
			const keySet = this.getKeyByName(localNote.keyName)
			const remoteNote = await this.db.getNote(localNote.id)
			if (remoteNote) {
				const action: NoteSyncAction = {
					type: 'update',
					id: localNote.id,
					keyName: localNote.keyName,
					items: [],
				}
				for (const localItem of localNote.items) {
					const remoteItem = remoteNote?.items.find(item => item.type === localItem.type)
					const remoteItemVersion = remoteItem?.version ?? 0
					const localItemData = await this.tryDecryptNoteItemText(localItem, this._localCrypt)
					console.log(localItemData)

					const remoteItemData = remoteItem
						? await this.tryDecryptNoteItemText(remoteItem, keySet.symmetric)
						: undefined
					if (localItem.version !== remoteItemVersion) {
						if (localItemData === remoteItemData) {
							continue
						}
						// TODO: Handle conflict resolution
						console.log('conflict', localItem, remoteItem)
					}
					if (localItem.version === 0 || localItemData !== remoteItemData) {
						action.items.push({
							version: localItem.version,
							type: localItem.type,
							data: await keySet.symmetric.encrypt(localItemData),
						})
					}
				}
				if (action.items.length > 0) {
					noteActions.push(action)
				} else {
					this.db.deleteLocalNote(localNote.id)
				}
			} else {
				const action: NoteSyncAction = {
					type: 'create',
					id: localNote.id,
					keyName: localNote.keyName,
					items: [],
				}
				for (const item of localNote.items) {
					action.items.push({
						version: 0,
						type: item.type,
						data: await this.tryReencryptNoteItemData(item, this._localCrypt, keySet.symmetric),
					})
				}
				if (action.items.length > 0) {
					noteActions.push(action)
				}
			}
		}

		console.log('Loading local keys...')
		const localKeys = await this.db.getAllLocalKeys()
		for (const localKey of localKeys) {
			const action: KeySyncAction = {
				type: 'create',
				id: localKey.id,
				name: localKey.name,
				data: JSON.stringify({
					id: localKey.id,
					userId: this._userId,
					name: localKey.name,
					algorithm: localKey.algorithm,
					asymmetricAlgorithm: localKey.asymmetricAlgorithm,
					keyData: await this._rootCrypt.encrypt(await this._localCrypt.decrypt(localKey.keyData)),
					publicKey: await localKey.publicKey,
					privateKey: await this._rootCrypt.encrypt(await this._localCrypt.decrypt(localKey.privateKey)),
					metadata: await this._rootCrypt.encrypt(await this._localCrypt.decrypt(localKey.metadata)),
				}),
			}
			keyActions.push(action)
		}

		console.log('Loading deleted notes and keys...')
		const deletedNotes = await this.db.getAllDeletedNotes()
		for (const noteId of deletedNotes) {
			noteActions.push({
				type: 'delete',
				keyName: emptyGuid(),
				id: noteId,
				items: [],
			})
		}

		console.log('Loading deleted keys...')
		const deletedKeys = await this.db.getAllDeletedKeys()
		for (const keyId of deletedKeys) {
			keyActions.push({
				type: 'delete',
				id: keyId,
				name: emptyGuid(),
				data: '',
			})
		}
		console.log(noteActions)

		const results = await this.api.syncPushChanges(noteActions, keyActions)
		console.log(results)
		for (const result of results ?? []) {
			if (result.itemType === 'note') {
				if (result.action === 'create') {
					this.db.deleteLocalNote(result.id)
				} else if (result.action === 'update') {
					this.db.deleteLocalNote(result.id)
				} else if (result.action === 'delete') {
					this.db.clearDeleteRemoteNote(result.id)
				}
			} else if (result.itemType === 'key') {
				if (result.action === 'create') {
					this.db.deleteLocalKey(result.id)
				} else if (result.action === 'delete') {
					this.db.clearDeleteRemoteKey(result.id)
				}
			}
		}
	}

	private async loadAllKeys(): Promise<void> {
		const localKeys = await this.db.getAllLocalKeys()
		const removeKeys = await this.db.getAllKeys()
		this._keys = []
		for (const keyData of [...localKeys, ...removeKeys]) {
			if (!this._keys.some(key => key.id === keyData.id)) {
				const sym = await SymmetricCrypt.fromKey(keyData.algorithm, await this._rootCrypt.decryptBytes(keyData.keyData))
				const signer = await CryptSignature.fromPem(
					keyData.asymmetricAlgorithm,
					keyData.publicKey,
					await this._rootCrypt.decrypt(keyData.privateKey),
				)
				this._keys.push({
					id: keyData.id,
					name: keyData.name,
					symmetric: sym,
					signature: signer,
					metadata: JSON.parse(await this._rootCrypt.decrypt(keyData.metadata)),
				})
			}
		}
	}

	private async loadKeyById(id: Guid): Promise<KeySet | undefined> {
		let keyData = await this.db.getLocalKey(id)
		if (!keyData) {
			keyData = await this.db.getKey(id)
		}
		if (!keyData) {
			return undefined
		}
		const sym = await SymmetricCrypt.fromKey(keyData.algorithm, await this._rootCrypt.decryptBytes(keyData.keyData))
		const signer = await CryptSignature.fromPem(
			keyData.asymmetricAlgorithm,
			keyData.publicKey,
			await this._rootCrypt.decrypt(keyData.privateKey),
		)
		this._keys.push({
			id: keyData.id,
			name: keyData.name,
			symmetric: sym,
			signature: signer,
			metadata: JSON.parse(await this._rootCrypt.decrypt(keyData.metadata)),
		})
	}

	async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	): Promise<void> {
		return Promise.resolve()
	}

	async deleteAccount(password: string, deleteLocal: boolean): Promise<void> {
		console.log('Deleting account:')
		return Promise.resolve()
	}

	async verifyPassword(password: string): Promise<boolean> {
		console.log('Verifying password:')
		return Promise.resolve(false)
	}

	async createNotificationUrl(): Promise<{ url: string; token: string }> {
		console.log('Creating notification URL for:')
		return Promise.resolve({ url: '', token: '' })
	}

	async createNote(note: Note): Promise<void> {
		await this.writeNote(note)
	}

	async writeNote(note: Note): Promise<void> {
		if (!this.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		const keySet = await this.getKeyByName(note.keyName)
		const noteData: NoteData = {
			id: note.id,
			keyName: note.keyName,
			sync: note.sync,
			items: await Promise.all(
				note.items.map(async item => ({
					version: item.version,
					type: item.type,
					data: await this._localCrypt.encrypt(JSON.stringify(item.data)),
					modified: item.modified,
					created: item.created,
				})),
			),
			modified: note.modified,
			created: note.created,
		}
		await this.db.setLocalNote(noteData)
		this.noteUpdatedCallback(await this.readNote(note.id))
	}

	private async deleteNote(id: Guid): Promise<void> {
		// TODO: Implement delete note logic
	}

	private async tryDecryptNoteItemObject(item: { data: string; type: string }, crypt: SymmetricCrypt): Promise<any> {
		try {
			return JSON.parse(await crypt.decrypt(item.data))
		} catch (ex) {
			console.error('Decryption failed:', ex)
			if (item.type === 'metadata') {
				return {
					title: '[MISSING]',
					notes: [],
				}
			}
			return {}
		}
	}

	private async tryDecryptNoteItemText(item: { data: string; type: string }, crypt: SymmetricCrypt): Promise<any> {
		try {
			return await crypt.decrypt(item.data)
		} catch (ex) {
			console.error('Decryption failed:', ex)
			if (item.type === 'metadata') {
				return JSON.stringify({
					title: '[MISSING]',
					notes: [],
				})
			}
			return JSON.stringify({})
		}
	}

	private async tryReencryptNoteItemData(
		item: { data: string; type: string },
		oldKey: SymmetricCrypt,
		newKey: SymmetricCrypt,
	): Promise<any> {
		try {
			return await newKey.encrypt(await oldKey.decrypt(item.data))
		} catch (ex) {
			console.error('Re-encryption failed:', ex)
			if (item.type === 'metadata') {
				return await newKey.encrypt(
					JSON.stringify({
						title: '[MISSING]',
						notes: [],
					}),
				)
			}
			return await newKey.encrypt(JSON.stringify({}))
		}
	}

	async readNote(id: Guid, base?: Note): Promise<Note> {
		if (!this.isLoggedIn) {
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
		const keySet = await this.getKeyByName(noteData.keyName)
		const note = new Note()
		note.id = noteData.id
		note.keyName = noteData.keyName
		note.isCache = false
		note.modified = noteData.modified
		note.created = noteData.created
		note.sync = noteData.sync
		const crypt = local ? this._localCrypt : keySet?.symmetric

		note.items = await Promise.all(
			noteData.items.map(async item => ({
				version: item.version,
				type: item.type,
				data: await this.tryDecryptNoteItemObject(item, crypt),
				changed: false,
				size: item.data.length,
				modified: item.modified,
				created: item.created,
			})),
		)
		// console.log('readNote', note.id, note, local)
		return note
	}

	async createKey(id: Guid, metadata: any): Promise<void> {
		console.log('Creating key:', id)

		const sym = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
		const signer = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

		const keyData: KeyData = {
			id,
			userId: this._userId,
			name: newGuid(),
			algorithm: sym.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this._rootCrypt.encryptBytes(await sym.getKey()),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this._rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this._rootCrypt.encrypt(JSON.stringify(metadata)),
			sync: 0,
			modified: new Date().toISOString(),
			created: new Date().toISOString(),
		}
		await this.db.setLocalKey(keyData)
		await this.loadKeyById(id)
	}

	async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		console.log('Creating key from note share:', id)
	}

	getKeyByName(name: Guid): KeySet {
		return this._keys.find(key => key.name === name) || undefined
	}

	getKeyById(id: Guid): KeySet {
		return this._keys.find(key => key.id === id) || undefined
	}

	keyWithIdExists(id: Guid): boolean {
		return this._keys.some(key => key.id === id)
	}

	keyWithNameExists(name: Guid): boolean {
		return this._keys.some(key => key.name === name)
	}

	async getPublicKey(keyOwnerName: string, pow: string) {
		console.log('Getting public key for:', keyOwnerName, 'with pow:', pow)
		return Promise.resolve(undefined)
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
		const keySet = await this.getKeyByName(note.keyName)
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
		const keySet = await this.getKeyByName(note.keyName)
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
		const keySet = await this.getKeyByName(newKeyName)
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
								data: await this.tryReencryptNoteItemData(
									item,
									this.getKeyByName(action.keyName).symmetric,
									this._localCrypt,
								),
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
							existingItem.data = await this.tryReencryptNoteItemData(
								newItem,
								this.getKeyByName(action.keyName).symmetric,
								this._localCrypt,
							)
							existingItem.version = newItem.version
						} else if (!newItem && existingItem && !local) {
							existingItem.data = await this.tryReencryptNoteItemData(
								existingItem,
								this.getKeyByName(action.keyName).symmetric,
								this._localCrypt,
							)
						} else if (newItem && !existingItem) {
							note.items.push({
								version: newItem.version,
								type: newItem.type,
								data: await this.tryReencryptNoteItemData(
									newItem,
									this.getKeyByName(action.keyName).symmetric,
									this._localCrypt,
								),
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
				this.noteUpdatedCallback(await this.readNote(noteId))
			}
		} catch (error) {
			await transaction.rollback()
			throw error
		}
		return []
	}

	async updateUserData(): Promise<void> {
		if (!this.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		await this.db.setUserData(this._userData)
	}

	async shareNote(recipient: string, keyName: Guid, noteId: Guid, name: string, pow: string): Promise<ShareResponse> {
		console.log(
			'Sharing note:',
			noteId,
			'with recipient:',
			recipient,
			'using key:',
			keyName,
			'for user:',
			this._userData.username,
		)
		return Promise.resolve(undefined)
	}

	async getShareOffers(): Promise<NoteShareInfo[]> {
		console.log('Getting share offers for user:')
		return Promise.resolve([])
	}

	async getShareOffer(code: string): Promise<NoteShareInfo> {
		console.log('Getting share offer for code:', code)
		return Promise.resolve(undefined)
	}

	async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		console.log('Getting share participants for offer:', id)
		return Promise.resolve([])
	}

	async deleteShareOffer(id: Guid): Promise<void> {
		console.log('Deleting share offer:', id)
		// no-op
	}

	logout(): void {
		this._userData = undefined
		this._keys = []
		this._rootCrypt = undefined
		this._rootSignature = undefined
		this._username = undefined
		this._userId = emptyGuid()
		this.db
			.close()
			.then(() => {
				console.log('Database closed after logout')
			})
			.catch(err => {
				console.error('Error closing database:', err)
			})
	}

	get userData(): any {
		return this._userData
	}

	get isOnline(): boolean {
		return this._online
	}

	get isLoggedIn(): boolean {
		return this._userData !== undefined
	}

	get userId(): Guid {
		return this._userId
	}

	get username(): string {
		return this._username
	}

	public get usedBytes() {
		return this._userStats.size
	}

	public get maxBytes() {
		return this._userStats.maxTotalBytes
	}

	public get noteCount() {
		return this._userStats.noteCount
	}

	public get maxNoteCount() {
		return this._userStats.maxNoteCount
	}

	public get maxNoteSize() {
		return this._userStats.maxNoteBytes
	}

	public get clientConfig(): ClientConfig {
		return this._clientConfig
	}
}
