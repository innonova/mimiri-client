import { debug, env, ipcClient } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { fromBase64, toBase64, toHex } from '../hex-base64'
import { mimiriPlatform } from '../mimiri-platform'
import { SymmetricCrypt } from '../symmetric-crypt'
import { emptyGuid, newGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import type { NoteAction } from '../types/requests'
import type { ClientConfig, ShareResponse } from '../types/responses'
import type { InitializationData, KeyData, NoteData } from './type'

export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export interface ChangeItem {
	id: string
	type: string
	data: any
}

export interface MimiriApi {
	authenticate(username: string, password: string): Promise<InitializationData | undefined>
	verifyCredentials(): Promise<boolean>
	getChangesSince(lastSync: Date, afterId?: Guid): Promise<any>
	syncChanges(changes: ChangeItem[]): Promise<void>
	registerForChanges(callback: (changes: ChangeItem[]) => void): Promise<void>
}

export interface MimiriDb {
	open(username: string): Promise<void>
	close(): Promise<void>

	setInitializationData(data: InitializationData): Promise<void>
	getInitializationData(): Promise<InitializationData | undefined>

	setObfuscationKey(obfuscationKey: string): Promise<void>
	getObfuscationKey(): Promise<string | undefined>

	setNoAccountData(data: any): Promise<void>
	getNoAccountData(): Promise<any | undefined>

	setUserData(userData: any): Promise<void>
	getUserData(): Promise<any | undefined>

	setNote(note: NoteData): Promise<void>
	getNote(id: Guid): Promise<NoteData | undefined>

	setKey(key: KeyData): Promise<void>
	getKey(id: Guid): Promise<KeyData | undefined>
	getAllKeys(): Promise<KeyData[]>
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
				if (!(await this.goOnline())) {
					const data = JSON.parse(await this._rootCrypt.decrypt(loginData.data))
					this._clientConfig = data.clientConfig
					this._userStats = data.userStats
					this._userData = data.userData
					await this.loadAllKeys()
				}
				return true
			} catch (ex) {
				debug.logError('Failed to restore login data', ex)
			}
		}
		return false
	}
	async createUser(username: string, password: string, userData: any, pow: string, iterations: number): Promise<void> {
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

	async login(data: LoginData): Promise<void> {
		console.log('Logging in user:', data.username)
		await this.db.open(data.username)
		let initializationData = await this.db.getInitializationData()
		if (!initializationData) {
			throw new Error('No initialization data found. Please create an account first.')
		}
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
		this._userData = await this.db.getUserData()
		this._username = data.username
		await this.loadAllKeys()

		console.log('User logged in:', this._username)
		console.log('authenticating')
		await this.api.authenticate('pgtest', '1234')
		console.log('authenticated')
		let changes = await this.api.getChangesSince(new Date(0))
		for (let i = 0; i < 10; i++) {
			if (changes.notes.length === 0) {
				break
			}
			const lastNote = changes.notes[changes.notes.length - 1]
			console.log('Processing changes for note:', lastNote.id)

			changes = await this.api.getChangesSince(new Date(lastNote.modified), lastNote.id)
		}
	}

	private async loadAllKeys(): Promise<void> {
		console.log('Loading all keys for user:')
		const keysData = await this.db.getAllKeys()
		this._keys = []
		for (const keyData of keysData) {
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

	private async loadKeyById(id: Guid): Promise<KeySet | undefined> {
		console.log('Loading key by id:', id)
		const keyData = await this.db.getKey(id)
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

	async goOnline(password?: string): Promise<boolean> {
		console.log('Going online:')
		return Promise.resolve(true)
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
			items: await Promise.all(
				note.items.map(async item => ({
					version: item.version + (item.changed ? 1 : 0),
					type: item.type,
					data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
				})),
			),
		}
		await this.db.setNote(noteData)
	}

	async readNote(id: Guid, base?: Note): Promise<Note> {
		if (!this.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		const noteData = await this.db.getNote(id)
		if (!noteData) {
			throw new Error(`Note with id ${id} not found`)
		}
		const keySet = await this.getKeyByName(noteData.keyName)
		const note = new Note()
		note.id = noteData.id
		note.keyName = noteData.keyName
		note.isCache = false
		note.items = await Promise.all(
			noteData.items.map(async item => ({
				version: item.version,
				type: item.type,
				data: JSON.parse(await keySet.symmetric.decrypt(item.data)),
				changed: false,
				size: item.data.length,
			})),
		)
		return note
	}

	async createKey(id: Guid, metadata: any): Promise<void> {
		console.log('Creating key:', id)

		const sym = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
		const signer = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

		const keyData: KeyData = {
			id,
			name: newGuid(),
			algorithm: sym.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this._rootCrypt.encryptBytes(await sym.getKey()),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this._rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this._rootCrypt.encrypt(JSON.stringify(metadata)),
		}
		this.db.setKey(keyData)
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

	createDeleteAction(note: Note): NoteAction {
		console.log('Creating delete action for note:', note.id)
		return undefined
	}

	createUpdateAction(note: Note): NoteAction {
		console.log('Creating update action for note:', note.id)
		return undefined
	}

	createCreateAction(note: Note): NoteAction {
		console.log('Creating create action for note:', note.id)
		return undefined
	}

	createChangeKeyAction(noteId: Guid, newKeyName: Guid): NoteAction {
		console.log(
			'Creating change key action for note:',
			noteId,
			'to new key:',
			newKeyName,
			'for user:',
			this._userData?.username,
		)
		return undefined
	}

	async multiAction(actions: NoteAction[]): Promise<Guid[]> {
		console.log('Performing multi-action for user:', 'with actions:', actions)
		return Promise.resolve([])
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
