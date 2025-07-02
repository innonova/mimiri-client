import { reactive, watch } from 'vue'
import { type Guid } from '../types/guid'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import { MimerError, ViewMode, type SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { SharingService } from './sharing-service'
import { MimiriDb } from './mimiri-db'
import { MimiriClient } from './mimiri-client'
import { PaymentClient } from './payment-client'
import { controlPanel, type MimerNote } from '../types/mimer-note'
import { createControlPanelTree } from '../types/control-panel'
import { mimiriPlatform } from '../mimiri-platform'
import { browserHistory, debug, ipcClient, updateManager } from '../../global'
import { Capacitor } from '@capacitor/core'
import type {
	ChargeExistingMethodRequest,
	CreateCustomerRequest,
	CreatePaymentMethodRequest,
	InvoiceToLinkRequest,
	NewSubscriptionRequest,
} from '../types/payment-requests'
import type { Invoice } from '../types/subscription'
import { UIStateManager } from './ui-state-manager'
import { NoteTreeManager, type ActionListener } from './note-tree-manager'
import { NoteOperationsManager } from './note-operations-manager'
import { SessionManager } from './session-manager'

export interface LoginListener {
	login()
	logout()
	online()
}

export const DEFAULT_PROOF_BITS = 15
export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export class MimiriStore {
	public ignoreFirstWALError: boolean = false
	public state: SharedState

	private authManager: AuthenticationManager
	private cryptoManager: CryptographyManager
	private syncService: SynchronizationService
	private noteService: NoteService
	private sharingService: SharingService
	private db: MimiriDb
	private api: MimiriClient
	private paymentClient: PaymentClient

	private uiManager: UIStateManager
	private treeManager: NoteTreeManager
	private operationsManager: NoteOperationsManager
	private sessionManager: SessionManager

	private _root: MimerNote
	private _listener: LoginListener

	constructor(
		host: string,
		paymentHost: string,
		serverKeyId: string,
		serverKey: string,
		noteUpdatedCallback: (note: Note) => Promise<void>,
		statusCallback?: (status: SharedState) => void,
	) {
		controlPanel.createChildren = (owner: any, parent: MimerNote) => {
			return createControlPanelTree(owner, parent)
		}

		this.state = reactive<SharedState>({
			username: '',
			userId: null,
			isLoggedIn: false,
			isOnline: false,
			isLocal: false,
			isLocalOnly: false,
			workOffline: false,
			clientConfig: { features: [] },
			userStats: {
				size: 0,
				noteCount: 0,
				maxTotalBytes: 0,
				maxNoteBytes: 0,
				maxNoteCount: 0,
			},
			busy: false,
			busyLong: false,
			busyLongDelay: 1000,
			spinner: true,
			noteOpen: !mimiriPlatform.isPhoneSize,
			stateLoaded: false,
			initInProgress: true,
			viewMode: ViewMode.Content,
			shareOffers: [],
		})

		watch(
			this.state,
			newState => {
				if (statusCallback) {
					statusCallback(newState)
				}
			},
			{ deep: true },
		)

		this.db = new MimiriDb()
		this.cryptoManager = new CryptographyManager(this.db, this.state)
		this.api = new MimiriClient(host, serverKeyId, serverKey, this.state, this.cryptoManager, type => {
			switch (type) {
				case 'connected':
					void updateManager.check()
					void import('../../global').then(({ blogManager }) => blogManager.refreshAll())
					break
				case 'sync':
					this.syncService.queueSync()
					break
				case 'bundle-update':
					void updateManager.check()
					break
				case 'blog-post':
					void import('../../global').then(({ blogManager }) => blogManager.refreshAll())
					break
				case 'reconnected':
					void updateManager.check()
					void import('../../global').then(({ blogManager }) => blogManager.refreshAll())
					this.syncService.queueSync()
					break
			}
		})

		this.authManager = new AuthenticationManager(this.db, this.api, this.cryptoManager, this.state)
		this.paymentClient = new PaymentClient(this.authManager, this.state, paymentHost)
		this.syncService = new SynchronizationService(
			this.db,
			this.api,
			this.cryptoManager,
			this.state,
			async (noteId: Guid) => {
				const note = await this.noteService.readNote(noteId)
				await noteUpdatedCallback(note)
			},
		)
		this.noteService = new NoteService(this.db, this.cryptoManager, this.state, async (noteId: Guid) => {
			const note = await this.noteService.readNote(noteId)
			await noteUpdatedCallback(note)
		})
		this.sharingService = new SharingService(this.api)

		this.uiManager = new UIStateManager(this.state)
		this.treeManager = new NoteTreeManager(this.state)
		this.operationsManager = new NoteOperationsManager(
			this.state,
			this.noteService,
			this.syncService,
			this.api,
			this.uiManager,
			this.treeManager,
			this.cryptoManager,
			this.sharingService,
		)

		this.sessionManager = new SessionManager(
			this.authManager,
			this.cryptoManager,
			this.noteService,
			this.operationsManager,
		)

		browserHistory.init(noteId => {
			if (noteId) {
				this.treeManager.getNoteById(noteId)?.select()
				if (this.uiManager.isMobile) {
					this.state.noteOpen = true
				}
			} else if (this.uiManager.isMobile) {
				this.state.noteOpen = false
			}
		})
	}

	public beginAction() {
		return this.uiManager.beginAction()
	}
	public endAction() {
		return this.uiManager.endAction()
	}
	public newNote() {
		return this.uiManager.newNote()
	}
	public newRootNote() {
		return this.uiManager.newRootNote()
	}
	public closeEditorIfMobile() {
		return this.uiManager.closeEditorIfMobile()
	}
	public findNextNoteStartingWith(text: string) {
		return this.uiManager.findNextNoteStartingWith(text, this.root, this.selectedNote)
	}

	public register(id: Guid, note: MimerNote) {
		return this.treeManager.register(id, note)
	}
	public select(id: Guid) {
		return this.treeManager.select(id)
	}
	public openNote(id?: Guid, mobileOpen = true) {
		return this.treeManager.openNote(id, mobileOpen)
	}
	public openProperties(id?: Guid) {
		return this.treeManager.openProperties(id)
	}
	public getNoteById(id: Guid) {
		return this.treeManager.getNoteById(id)
	}
	public getViewModelById(id: Guid) {
		return this.treeManager.getViewModelById(id)
	}
	public loadState() {
		return this.treeManager.loadState(this.root)
	}
	public registerActionListener(listener: ActionListener) {
		return this.treeManager.registerActionListener(listener)
	}

	public async createMimerNote(parentNote: MimerNote, title: string) {
		return this.operationsManager.createMimerNote(parentNote, title)
	}
	public async saveNote(note: MimerNote) {
		return this.operationsManager.saveNote(note)
	}
	public async delete(mimerNote: MimerNote, physicallyDelete: boolean) {
		return this.operationsManager.delete(mimerNote, physicallyDelete)
	}
	public async copy(targetId: Guid, mimerNote: MimerNote, index: number) {
		return this.operationsManager.copy(targetId, mimerNote, index)
	}

	public async move(
		sourceId: Guid,
		targetId: Guid,
		mimerNote: MimerNote,
		index: number,
		keepKey: boolean,
		select: boolean,
	) {
		return this.operationsManager.move(sourceId, targetId, mimerNote, index, keepKey, select, this.root.id)
	}

	public registerListener(listener: LoginListener) {
		this._listener = listener
	}

	public async addGettingStarted(note?: Note) {
		return this.sessionManager.addGettingStarted(note)
	}

	public async isAccountPristine() {
		return this.sessionManager.isAccountPristine(this.root, this.isAnonymous)
	}

	public queueSync(): void {
		if (this.state.isLoggedIn) {
			this.syncService.queueSync()
		}
	}

	public async checkUsername(username: string) {
		return this.authManager.checkUsername(username)
	}

	public async setLoginData(data: string) {
		return this.authManager.setLoginData(data)
	}

	private async restoreLogin() {
		if (await this.authManager.restoreLogin()) {
			await this.cryptoManager.ensureLocalCrypt()
			if (this.state.isOnline) {
				await this.syncService.initialSync()
				await this.cryptoManager.loadAllKeys()
				await this.syncService.sync()
			} else {
				await this.cryptoManager.loadAllKeys()
			}
			return true
		}
		return false
	}

	public async recoverLogin() {
		try {
			if (await this.restoreLogin()) {
				this.state.noteOpen = !this.uiManager.isMobile
				browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
				await this.sessionManager.ensureCreateComplete()
				await this.loadRootNote()
				await this.loadState()
				updateManager.good()
			} else {
				await this.logout()
			}
		} finally {
			this.state.initInProgress = false
		}
	}

	public async promoteToCloudAccount(username: string, password: string, iterations: number) {
		await this.authManager.promoteToCloudAccount(username, password, iterations)
		await this.logout()
		await this.login(username, password)
	}

	public async promoteToLocalAccount(username: string, password: string, iterations: number) {
		await this.authManager.promoteToLocalAccount(username, password, iterations)
		await this.logout()
		await this.login(username, password)
	}

	public async login(username: string, password: string): Promise<boolean> {
		this.uiManager.beginAction(10000)
		this.state.noteOpen = !this.uiManager.isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		try {
			if (await this.authManager.login(username, password)) {
				await this.cryptoManager.ensureLocalCrypt()
				await this.syncService.initialSync()
				await this.cryptoManager.loadAllKeys()
				await this.syncService.sync()
				await this.sessionManager.ensureCreateComplete()
				await this.loadRootNote()
				await this.loadState()
				if (!this.state.isOnline && !this.state.workOffline) {
					setTimeout(() => {
						void this.goOnline(password)
					}, 1000)
				} else {
					updateManager.good()
				}
				this._listener?.login()
				return true
			} else {
				return false
			}
		} finally {
			this.uiManager.endAction()
		}
	}

	public async goOnline(password?: string): Promise<boolean> {
		this.uiManager.beginAction()
		try {
			const result = await this.authManager.goOnline()
			updateManager.good()
			this._listener?.online()
			return result
		} catch (ex) {
			debug.logError('Failed to go online', ex)
			return false
		} finally {
			this.uiManager.endAction()
		}
	}

	public async openLocal() {
		this.uiManager.beginAction(10000)
		this.state.noteOpen = !this.uiManager.isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		try {
			await this.authManager.openLocal()
			await this.cryptoManager.ensureLocalCrypt()
			await this.cryptoManager.loadAllKeys()
			if (this.state.isLoggedIn) {
				await this.sessionManager.ensureCreateComplete()
				await this.loadRootNote()
				await this.loadState()
				updateManager.good()
				this._listener?.login()
				return true
			} else {
				return false
			}
		} finally {
			this.uiManager.endAction()
		}
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

	public async updateUserStats() {
		this.uiManager.beginAction()
		try {
			await this.authManager.goOnline()
		} finally {
			this.uiManager.endAction()
		}
	}

	private async loadRootNote() {
		const note = await this.noteService.readNote(this.authManager.userData.rootNote)
		if (note) {
			this.root = new (await import('../types/mimer-note')).MimerNote(this as any, undefined, note)
			if (note.getItem('metadata').controlPanel) {
				await this.sessionManager.ensureCreateComplete()
			}
			if (note.getItem('metadata').recycleBin) {
				await this.sessionManager.ensureCreateComplete()
			}
		} else {
			this.root = undefined
			await this.logout()
			throw new MimerError('Login Error', 'Failed to read root node')
		}
	}

	public async logout(): Promise<void> {
		await this.authManager.logout()
		this.api.logout()
		this.cryptoManager.clearKeys()
		this.state.clientConfig = { features: [] }
		this.state.userStats = {
			size: 0,
			noteCount: 0,
			maxTotalBytes: 0,
			maxNoteBytes: 0,
			maxNoteCount: 0,
		}
		this.state.stateLoaded = false
		this._listener?.logout()
		this.root = undefined
		this.treeManager.clearNotes()
	}

	public async getNote(id: Guid) {
		return await this.noteService.readNote(id)
	}

	public isShared(note: Note) {
		return !!this.cryptoManager.getKeyByName(note.keyName).metadata.shared
	}

	public async shareMimerNote(mimerNote: MimerNote, recipient: string) {
		return this.operationsManager.shareMimerNote(mimerNote, recipient)
	}

	public async getShareOffer(code: string): Promise<NoteShareInfo> {
		return this.sharingService.getShareOffer(code)
	}

	public async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		return this.sharingService.getShareParticipants(id)
	}

	public async acceptShare(share: NoteShareInfo, parent?: MimerNote) {
		return this.operationsManager.acceptShare(share, parent)
	}

	public async addComment(postId: Guid, displayName: string, comment: string) {
		return this.api.addComment(postId, displayName, comment)
	}

	public setWorkOffline(value: boolean) {
		this.api.workOffline = value
	}

	public get payment() {
		return this.paymentClient
	}

	public get root() {
		return this.treeManager.root
	}

	private set root(value: MimerNote) {
		this.treeManager.root = value
	}

	public get controlPanel() {
		return this.treeManager.controlPanel
	}

	public get recycleBin() {
		return this.treeManager.recycleBin
	}

	public get selectedNote() {
		return this.treeManager.selectedNote
	}

	public get selectedViewModel() {
		return this.treeManager.selectedViewModel
	}

	public get controlPanelId(): Guid {
		return this._root?.note.getItem('metadata').controlPanel
	}

	public get isAnonymous() {
		return !!this.state.username?.startsWith('mimiri_a_')
	}

	public get isMobile() {
		return this.uiManager.isMobile
	}
}
