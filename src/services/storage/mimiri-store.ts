import { reactive, watch } from 'vue'
import { type Guid } from '../types/guid'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import { AccountType, ViewMode, type SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { MimiriDb } from './mimiri-db'
import { MimiriClient } from './mimiri-client'
import { PaymentClient } from './payment-client'
import { controlPanel, type MimerNote } from '../types/mimer-note'
import { createControlPanelTree } from '../types/control-panel'
import { mimiriPlatform } from '../mimiri-platform'
import { blogManager, browserHistory, updateManager } from '../../global'
import { UIStateManager } from './ui-state-manager'
import { NoteTreeManager, type ActionListener } from './note-tree-manager'
import { NoteOperationsManager } from './note-operations-manager'
import { SessionManager, type LoginListener } from './session-manager'
import { LocalStateManager } from './local-state-manager'

export const DEFAULT_PROOF_BITS = 15
export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export class MimiriStore {
	public ignoreFirstWALError: boolean = false
	public state: SharedState

	private localStateManager: LocalStateManager
	private authManager: AuthenticationManager
	private cryptoManager: CryptographyManager
	private syncService: SynchronizationService
	private noteService: NoteService
	private db: MimiriDb
	private api: MimiriClient
	private paymentClient: PaymentClient

	private uiManager: UIStateManager
	private treeManager: NoteTreeManager
	private operationsManager: NoteOperationsManager
	private sessionManager: SessionManager

	constructor(
		host: string,
		paymentHost: string,
		serverKeyId: string,
		serverKey: string,
		noteUpdatedCallback: (note: Note) => Promise<void>,
		statusCallback?: (status: SharedState) => void,
	) {
		controlPanel.createChildren = (owner: MimiriStore, parent: MimerNote) => {
			return createControlPanelTree(owner, parent)
		}

		this.state = reactive<SharedState>({
			username: '',
			userId: null,
			isLoggedIn: false,
			isOnline: false,
			accountType: AccountType.None,
			isAnonymous: false,
			workOffline: false,
			serverAuthenticated: false,
			clientConfig: { features: [] },
			userStats: {
				size: 0,
				noteCount: 0,
				localSizeDelta: 0,
				localNoteCountDelta: 0,
				localSize: 0,
				localNoteCount: 0,
				maxTotalBytes: 0,
				maxNoteBytes: 0,
				maxNoteCount: 0,
			},
			needsToChooseTier: false,
			busy: false,
			busyLong: false,
			busyLongDelay: 1000,
			spinner: true,
			noteOpen: !mimiriPlatform.isPhoneSize,
			stateLoaded: false,
			initInProgress: true,
			viewMode: ViewMode.Content,
			shareOffers: [],
			isMobile: false,
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
		this.localStateManager = new LocalStateManager(this.db, this.state)
		this.cryptoManager = new CryptographyManager(this.db, this.state)
		this.api = new MimiriClient(
			host,
			serverKeyId,
			serverKey,
			this.state,
			this.cryptoManager,
			this.localStateManager,
			(type, payload) => {
				switch (type) {
					case 'connected':
						void updateManager.check()
						void blogManager.refreshAll()
						this.syncService.queueSync(true)
						break
					case 'sync':
						if (!this.syncService.isSyncIdIssued(payload)) {
							this.syncService.queueSync()
						}
						break
					case 'bundle-update':
						void updateManager.check()
						break
					case 'blog-post':
						void blogManager.refreshAll()
						break
					case 'reconnected':
						void updateManager.check()
						void blogManager.refreshAll()
						this.syncService.queueSync(true)
						break
				}
			},
		)

		this.authManager = new AuthenticationManager(
			this.db,
			this.api,
			this.cryptoManager,
			this.localStateManager,
			this.state,
			async () => {
				await this.sessionManager.logout()
			},
			async (username: string, password: string) => {
				await this.sessionManager.login(username, password)
			},
		)
		this.noteService = new NoteService(
			this.db,
			this.api,
			this.cryptoManager,
			this.localStateManager,
			this.state,
			async (noteId: Guid) => {
				const note = await this.noteService.readNote(noteId)
				await noteUpdatedCallback(note)
			},
		)

		this.uiManager = new UIStateManager(this.state)
		this.treeManager = new NoteTreeManager(this, this.state, this.noteService, this.authManager)
		this.paymentClient = new PaymentClient(this.authManager, this.state, paymentHost)
		this.syncService = new SynchronizationService(
			this.db,
			this.api,
			this.cryptoManager,
			this.localStateManager,
			this.state,
			this.treeManager,
			async (noteId: Guid) => {
				const note = await this.noteService.readNote(noteId)
				await noteUpdatedCallback(note)
			},
		)
		this.operationsManager = new NoteOperationsManager(
			this.state,
			this.noteService,
			this.syncService,
			this.api,
			this.uiManager,
			this.treeManager,
			this.cryptoManager,
		)

		this.sessionManager = new SessionManager(
			this.state,
			this.authManager,
			this.cryptoManager,
			this.noteService,
			this.operationsManager,
			this.syncService,
			this.uiManager,
			this.treeManager,
			this.localStateManager,
			this.api,
			this.db,
		)

		browserHistory.init(noteId => {
			if (noteId) {
				void this.treeManager.getNoteById(noteId)?.select()
				if (this.state.isMobile) {
					this.state.noteOpen = true
				}
			} else if (this.state.isMobile) {
				this.state.noteOpen = false
			}
		})
	}

	public readonly ui = {
		newNote: () => this.uiManager.newNote(),
		newRootNote: () => this.uiManager.newRootNote(),
		closeEditorIfMobile: () => this.uiManager.closeEditorIfMobile(),
		findNextNoteStartingWith: (text: string) =>
			this.uiManager.findNextNoteStartingWith(text, this.treeManager.root, this.treeManager.selectedNote),
	}

	public readonly tree = {
		register: (id: Guid, note: MimerNote) => this.treeManager.register(id, note),
		select: (id: Guid) => this.treeManager.select(id),
		openNote: (id?: Guid, mobileOpen = true) => this.treeManager.openNote(id, mobileOpen),
		openProperties: (id?: Guid) => this.treeManager.openProperties(id),
		getNoteById: (id: Guid) => this.treeManager.getNoteById(id),
		getViewModelById: (id: Guid) => this.treeManager.getViewModelById(id),
		loadState: () => this.treeManager.loadState(),
		registerActionListener: (listener: ActionListener) => this.treeManager.registerActionListener(listener),
		root: () => this.treeManager.root,
		rootRef: () => this.treeManager.rootRef,
		controlPanelId: () => this.treeManager.controlPanelId,
		controlPanel: () => this.treeManager.controlPanel,
		recycleBin: () => this.treeManager.recycleBin,
		selectedNoteRef: () => this.treeManager.selectedNoteRef,
		selectedNote: () => this.treeManager.selectedNote,
		selectedViewModelRef: () => this.treeManager.selectedViewModelRef,
		selectedViewModel: () => this.treeManager.selectedViewModel,
	}

	public readonly operations = {
		createMimerNote: (parentNote: MimerNote, title: string) =>
			this.operationsManager.createMimerNote(parentNote, title),
		saveNote: (note: MimerNote) => this.operationsManager.saveNote(note),
		delete: (mimerNote: MimerNote, physicallyDelete: boolean, unregister: boolean) =>
			this.operationsManager.delete(mimerNote, physicallyDelete, unregister),
		copy: (targetId: Guid, mimerNote: MimerNote, index: number) =>
			this.operationsManager.copy(targetId, mimerNote, index),
		move: (sourceId: Guid, targetId: Guid, mimerNote: MimerNote, index: number, keepKey: boolean, select: boolean) =>
			this.operationsManager.move(sourceId, targetId, mimerNote, index, keepKey, select, this.treeManager.root.id),
		deleteKey: (keyName: Guid) => this.operationsManager.deleteKey(keyName),
	}

	public readonly session = {
		addGettingStarted: (note?: Note) => this.sessionManager.addGettingStarted(note),
		recoverLogin: () => this.sessionManager.recoverLogin(),
		login: (username: string, password: string): Promise<boolean> => this.sessionManager.login(username, password),
		goOnline: (password?: string): Promise<boolean> => this.sessionManager.goOnline(password),
		openLocal: () => this.sessionManager.openLocal(),
		updateUserStats: () => this.sessionManager.updateUserStats(),
		logout: (): Promise<void> => this.sessionManager.logout(),
		promoteToCloudAccount: (username: string, oldPassword: string, newPassword: string, iterations: number) =>
			this.sessionManager.promoteToCloudAccount(username, oldPassword, newPassword, iterations),
		promoteToLocalAccount: (username: string, password: string, iterations: number) =>
			this.sessionManager.promoteToLocalAccount(username, password, iterations),
		registerListener: (listener: LoginListener) => this.sessionManager.registerListener(listener),
		queueSync: () => this.syncService.queueSync(),
		toggleWorkOffline: async () => this.sessionManager.toggleWorkOffline(),
	}

	public readonly auth = {
		checkUsername: (username: string) => this.authManager.checkUsername(username),
		setLoginData: (data: string) => this.authManager.setLoginData(data),
		changeUserNameAndPassword: (username: string, oldPassword: string, newPassword?: string, iterations?: number) =>
			this.authManager.changeUserNameAndPassword(username, oldPassword, newPassword, iterations),
		deleteAccount: (password: string, deleteLocal: boolean) => this.authManager.deleteAccount(password, deleteLocal),
		verifyPassword: (password: string) => this.authManager.verifyPassword(password),
		hasOneOrMoreAccounts: () => this.authManager.hasOneOrMoreAccounts(),
		clearNeedsToChooseTier: () => this.authManager.clearNeedsToChooseTier(),
	}

	public readonly note = {
		getNote: (id: Guid) => this.noteService.readNote(id),
		isShared: (note: Note) => !!this.cryptoManager.getKeyByName(note?.keyName)?.metadata?.shared,
		shareMimerNote: (mimerNote: MimerNote, recipient: string) =>
			this.operationsManager.shareMimerNote(mimerNote, recipient),
		getShareOffer: (code: string) => this.api.getShareOffer(code),
		getShareParticipants: (id: Guid) => this.api.getShareParticipants(id),
		acceptShare: (share: NoteShareInfo, parent?: MimerNote) => this.operationsManager.acceptShare(share, parent),
	}

	public readonly feedback = {
		addComment: async (postId: Guid, displayName: string, comment: string) => {
			await this.api.addComment(postId, displayName, comment)
		},
	}

	public async checkForConsistency(): Promise<boolean> {
		return this.syncService.checkForConsistency()
	}

	public get payment() {
		return this.paymentClient
	}
}
