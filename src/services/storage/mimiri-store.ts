import { emptyGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import { type NoteAction } from '../types/requests'
import type { ClientConfig, ShareResponse } from '../types/responses'
import type { LoginData, SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { SharingService } from './sharing-service'
import { MimiriDb } from './mimiri-browser-db'
import { MimiriClient } from './mimiri-client'
import { MultiAction } from './multi-action'

export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export class MimiriStore {
	private authManager: AuthenticationManager
	private cryptoManager: CryptographyManager
	private syncService: SynchronizationService
	private noteService: NoteService
	private sharingService: SharingService
	private sharedState: SharedState
	private db: MimiriDb
	private api: MimiriClient

	constructor(host: string, serverKeyId: string, serverKey: string, noteUpdatedCallback: (note: Note) => void) {
		this.sharedState = {
			userId: null,
			rootCrypt: null,
			isLoggedIn: false,
			isOnline: false,
			clientConfig: { features: [] },
			userStats: {
				size: 0,
				noteCount: 0,
				maxTotalBytes: 0,
				maxNoteBytes: 0,
				maxNoteCount: 0,
			},
		}
		this.db = new MimiriDb()
		this.api = new MimiriClient(host, serverKeyId, serverKey, this.sharedState)
		this.authManager = new AuthenticationManager(this.db, this.api, this.sharedState)
		this.cryptoManager = new CryptographyManager(this.db, this.sharedState)
		this.syncService = new SynchronizationService(
			this.db,
			this.api,
			this.cryptoManager,
			this.sharedState,
			async (noteId: Guid) => {
				const note = await this.noteService.readNote(noteId)
				noteUpdatedCallback(note)
			},
		)
		this.noteService = new NoteService(this.db, this.cryptoManager, this.sharedState, async (noteId: Guid) => {
			const note = await this.noteService.readNote(noteId)
			noteUpdatedCallback(note)
		})
		this.sharingService = new SharingService((keyOwnerName: string, pow: string) => Promise.resolve(undefined))
	}

	public async checkUsername(username: string, pow: string) {
		return this.authManager.checkUsername(username, pow)
	}

	public async setLoginData(data: string) {
		return this.authManager.setLoginData(data)
	}

	public async getLoginData() {
		return this.authManager.getLoginData()
	}

	public async restoreLogin() {
		if (await this.authManager.restoreLogin()) {
			await this.cryptoManager.ensureLocalCrypt()
			await this.syncService.initialSync()
			await this.cryptoManager.loadAllKeys()
			await this.syncService.sync()
			return true
		}
		return false
	}

	public async createUser(username: string, password: string, userData: any, pow: string, iterations: number) {
		await this.authManager.createUser(username, password, userData, pow, iterations)
		await this.cryptoManager.loadAllKeys()
	}

	public async login(data: LoginData): Promise<boolean> {
		if (await this.authManager.login(data)) {
			await this.syncService.initialSync()
			await this.cryptoManager.loadAllKeys()
			await this.syncService.sync()
			return true
		}
		return false
	}

	public async goOnline(password?: string): Promise<boolean> {
		return this.authManager.goOnline()
	}

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		return this.authManager.changeUserNameAndPassword(username, oldPassword, newPassword, iterations)
	}

	public async deleteAccount(password: string, deleteLocal: boolean) {
		return this.authManager.deleteAccount(password, deleteLocal)
	}

	public async verifyPassword(password: string) {
		return this.authManager.verifyPassword(password)
	}

	public async createKey(id: Guid, metadata: any): Promise<void> {
		return this.cryptoManager.createKey(id, metadata)
	}

	public getKeyByName(name: Guid): KeySet {
		return this.cryptoManager.getKeyByName(name)
	}

	public getKeyById(id: Guid): KeySet {
		return this.cryptoManager.getKeyById(id)
	}

	public async createNote(note: Note): Promise<void> {
		return this.noteService.createNote(note)
	}

	public async writeNote(note: Note): Promise<void> {
		return this.noteService.writeNote(note)
	}

	public async readNote(id: Guid, base?: Note): Promise<Note> {
		return this.noteService.readNote(id, base)
	}

	public beginMultiAction(): MultiAction {
		return new MultiAction(this.noteService)
	}

	public async createNotificationUrl(): Promise<{ url: string; token: string }> {
		return this.sharingService.createNotificationUrl()
	}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		return this.sharingService.createKeyFromNoteShare(id, share, metadata)
	}

	public async getPublicKey(keyOwnerName: string, pow: string) {
		return this.sharingService.getPublicKey(keyOwnerName, pow)
	}

	public async shareNote(
		recipient: string,
		keyName: Guid,
		noteId: Guid,
		name: string,
		pow: string,
	): Promise<ShareResponse> {
		return this.sharingService.shareNote(recipient, keyName, noteId, name, pow)
	}

	public async getShareOffers(): Promise<NoteShareInfo[]> {
		return this.sharingService.getShareOffers()
	}

	public async getShareOffer(code: string): Promise<NoteShareInfo> {
		return this.sharingService.getShareOffer(code)
	}

	public async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		return this.sharingService.getShareParticipants(id)
	}

	public async deleteShareOffer(id: Guid): Promise<void> {
		return this.sharingService.deleteShareOffer(id)
	}

	public async updateUserData(): Promise<void> {
		if (!this.isLoggedIn) {
			throw new Error('Not Logged in')
		}
		return this.db.setUserData(this.userData)
	}

	public logout(): void {
		this.authManager.logout()
		this.cryptoManager.clearKeys()
		this.sharedState.clientConfig = { features: [] }
		this.sharedState.userStats = {
			size: 0,
			noteCount: 0,
			maxTotalBytes: 0,
			maxNoteBytes: 0,
			maxNoteCount: 0,
		}
	}

	public get userData(): any {
		return this.authManager.userData
	}

	public get isOnline(): boolean {
		return this.sharedState.isOnline
	}

	public get isLoggedIn(): boolean {
		return this.sharedState.isLoggedIn
	}

	public get userId(): Guid {
		return this.sharedState.userId ?? emptyGuid()
	}

	public get username(): string {
		return this.authManager.username
	}

	public get usedBytes() {
		return this.sharedState.userStats.size
	}

	public get maxBytes() {
		return this.sharedState.userStats.maxTotalBytes
	}

	public get noteCount() {
		return this.sharedState.userStats.noteCount
	}

	public get maxNoteCount() {
		return this.sharedState.userStats.maxNoteCount
	}

	public get maxNoteSize() {
		return this.sharedState.userStats.maxNoteBytes
	}

	public get clientConfig(): ClientConfig {
		return this.sharedState.clientConfig
	}
}
