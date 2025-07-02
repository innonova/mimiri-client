import { reactive, watch } from 'vue'
import { type Guid } from '../types/guid'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import { ViewMode, type SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { SharingService } from './sharing-service'
import { MimiriDb } from './mimiri-db'
import { MimiriClient } from './mimiri-client'
import { PaymentClient } from './payment-client'
import { controlPanel, type MimerNote, type NoteViewModel } from '../types/mimer-note'
import { createControlPanelTree } from '../types/control-panel'
import { mimiriPlatform } from '../mimiri-platform'
import { blogManager, browserHistory, updateManager } from '../../global'
import { UIStateManager } from './ui-state-manager'
import { NoteTreeManager, type ActionListener } from './note-tree-manager'
import { NoteOperationsManager } from './note-operations-manager'
import { SessionManager, type LoginListener } from './session-manager'
import type { ShareResponse } from '../types/responses'

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
					void blogManager.refreshAll()
					break
				case 'sync':
					this.syncService.queueSync()
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
		this.treeManager = new NoteTreeManager(this, this.state, this.noteService, this.authManager)
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
			this.state,
			this.authManager,
			this.cryptoManager,
			this.noteService,
			this.operationsManager,
			this.syncService,
			this.uiManager,
			this.treeManager,
			this.api,
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

	private _ui: {
		newNote: () => void
		newRootNote: () => void
		closeEditorIfMobile: () => void
		findNextNoteStartingWith: (text: string) => void
		isMobile: boolean
	}
	public get ui() {
		if (!this._ui) {
			const uiManager = this.uiManager
			this._ui = {
				newNote: () => this.uiManager.newNote(),
				newRootNote: () => this.uiManager.newRootNote(),
				closeEditorIfMobile: () => this.uiManager.closeEditorIfMobile(),
				findNextNoteStartingWith: (text: string) =>
					this.uiManager.findNextNoteStartingWith(text, this.treeManager.root, this.treeManager.selectedNote),
				get isMobile() {
					return uiManager.isMobile
				},
			}
		}
		return this._ui
	}

	private _tree: {
		register: (id: Guid, note: MimerNote) => void
		select: (id: Guid) => void
		openNote: (id?: Guid, mobileOpen?: boolean) => void
		openProperties: (id?: Guid) => void
		getNoteById: (id: Guid) => MimerNote | undefined
		getViewModelById: (id: Guid) => NoteViewModel | undefined
		loadState: () => void
		registerActionListener: (listener: ActionListener) => void
		get root(): MimerNote | undefined
		get controlPanelId(): Guid
		get controlPanel(): MimerNote
		get recycleBin(): MimerNote
		get selectedNote(): MimerNote | undefined
		get selectedViewModel(): NoteViewModel | undefined
	}
	public get tree() {
		if (!this._tree) {
			const treeManager = this.treeManager
			this._tree = {
				register: (id: Guid, note: MimerNote) => this.treeManager.register(id, note),
				select: (id: Guid) => this.treeManager.select(id),
				openNote: (id?: Guid, mobileOpen = true) => this.treeManager.openNote(id, mobileOpen),
				openProperties: (id?: Guid) => this.treeManager.openProperties(id),
				getNoteById: (id: Guid) => this.treeManager.getNoteById(id),
				getViewModelById: (id: Guid) => this.treeManager.getViewModelById(id),
				loadState: () => this.treeManager.loadState(),
				registerActionListener: (listener: ActionListener) => this.treeManager.registerActionListener(listener),
				get root() {
					return treeManager.root
				},
				get controlPanelId() {
					return treeManager.controlPanelId
				},
				get controlPanel() {
					return treeManager.controlPanel
				},
				get recycleBin() {
					return treeManager.recycleBin
				},
				get selectedNote() {
					return treeManager.selectedNote
				},
				get selectedViewModel() {
					return treeManager.selectedViewModel
				},
			}
		}
		return this._tree
	}

	private _operations: {
		createMimerNote: (parentNote: MimerNote, title: string) => Promise<void>
		saveNote: (note: MimerNote) => Promise<void>
		delete: (mimerNote: MimerNote, physicallyDelete: boolean) => Promise<void>
		copy: (targetId: Guid, mimerNote: MimerNote, index: number) => Promise<void>
		move: (
			sourceId: Guid,
			targetId: Guid,
			mimerNote: MimerNote,
			index: number,
			keepKey: boolean,
			select: boolean,
		) => Promise<void>
	}
	public get operations() {
		if (!this._operations) {
			this._operations = {
				createMimerNote: (parentNote: MimerNote, title: string) =>
					this.operationsManager.createMimerNote(parentNote, title),
				saveNote: (note: MimerNote) => this.operationsManager.saveNote(note),
				delete: (mimerNote: MimerNote, physicallyDelete: boolean) =>
					this.operationsManager.delete(mimerNote, physicallyDelete),
				copy: (targetId: Guid, mimerNote: MimerNote, index: number) =>
					this.operationsManager.copy(targetId, mimerNote, index),
				move: (
					sourceId: Guid,
					targetId: Guid,
					mimerNote: MimerNote,
					index: number,
					keepKey: boolean,
					select: boolean,
				) =>
					this.operationsManager.move(sourceId, targetId, mimerNote, index, keepKey, select, this.treeManager.root.id),
			}
		}
		return this._operations
	}

	private _session: {
		addGettingStarted: (note?: Note) => Promise<void>
		isAccountPristine: (isAnonymous?: boolean) => Promise<boolean>
		recoverLogin: () => Promise<void>
		login: (username: string, password: string) => Promise<boolean>
		goOnline: (password?: string) => Promise<boolean>
		openLocal: () => Promise<boolean>
		updateUserStats: () => Promise<void>
		logout: () => Promise<void>
		promoteToCloudAccount: (username: string, password: string, iterations: number) => Promise<void>
		promoteToLocalAccount: (username: string, password: string, iterations: number) => Promise<void>
		registerListener: (listener: LoginListener) => void
		queueSync: () => void
		toggleWorkOffline: () => void
		isAnonymous: boolean
	}
	public get session() {
		const state = this.state
		if (!this._session) {
			this._session = {
				addGettingStarted: (note?: Note) => this.sessionManager.addGettingStarted(note),
				isAccountPristine: () =>
					this.sessionManager.isAccountPristine(this.treeManager.root, !!state.username?.startsWith('mimiri_a_')),
				recoverLogin: () => this.sessionManager.recoverLogin(),
				login: (username: string, password: string): Promise<boolean> => this.sessionManager.login(username, password),
				goOnline: (password?: string): Promise<boolean> => this.sessionManager.goOnline(password),
				openLocal: () => this.sessionManager.openLocal(),
				updateUserStats: () => this.sessionManager.updateUserStats(),
				logout: (): Promise<void> => this.sessionManager.logout(),
				promoteToCloudAccount: (username: string, password: string, iterations: number) => {
					return this.sessionManager.promoteToCloudAccount(username, password, iterations)
				},
				promoteToLocalAccount: (username: string, password: string, iterations: number) => {
					return this.sessionManager.promoteToLocalAccount(username, password, iterations)
				},
				registerListener: (listener: LoginListener) => this.sessionManager.registerListener(listener),
				queueSync: () => this.syncService.queueSync(),
				toggleWorkOffline: () => {
					this.api.workOffline = !this.state.workOffline
				},
				get isAnonymous() {
					return !!state.username?.startsWith('mimiri_a_')
				},
			}
		}
		return this._session
	}

	private _auth: {
		checkUsername: (username: string) => Promise<boolean>
		setLoginData: (data: string) => Promise<void>
		changeUserNameAndPassword: (
			username: string,
			oldPassword: string,
			newPassword?: string,
			iterations?: number,
		) => Promise<void>
		deleteAccount: (password: string, deleteLocal: boolean) => Promise<void>
		verifyPassword: (password: string) => Promise<boolean>
	}
	public get auth() {
		if (!this._auth) {
			this._auth = {
				checkUsername: (username: string) => this.authManager.checkUsername(username),
				setLoginData: (data: string) => this.authManager.setLoginData(data),
				changeUserNameAndPassword: (username: string, oldPassword: string, newPassword?: string, iterations?: number) =>
					this.authManager.changeUserNameAndPassword(username, oldPassword, newPassword, iterations),
				deleteAccount: (password: string, deleteLocal: boolean) =>
					this.authManager.deleteAccount(password, deleteLocal),
				verifyPassword: (password: string) => this.authManager.verifyPassword(password),
			}
		}
		return this._auth
	}

	private _note: {
		getNote: (id: Guid) => Promise<Note>
		isShared: (note: Note) => boolean
		shareMimerNote: (mimerNote: MimerNote, recipient: string) => Promise<ShareResponse>
		getShareOffer: (code: string) => Promise<NoteShareInfo>
		getShareParticipants: (id: Guid) => Promise<{ username: string; since: string }[]>
		acceptShare: (share: NoteShareInfo, parent?: MimerNote) => Promise<void>
	}
	public get note() {
		if (!this._note) {
			this._note = {
				getNote: (id: Guid) => {
					return this.noteService.readNote(id)
				},
				isShared: (note: Note) => {
					return !!this.cryptoManager.getKeyByName(note.keyName).metadata.shared
				},
				shareMimerNote: (mimerNote: MimerNote, recipient: string) => {
					return this.operationsManager.shareMimerNote(mimerNote, recipient)
				},
				getShareOffer: (code: string) => {
					return this.sharingService.getShareOffer(code)
				},
				getShareParticipants: (id: Guid) => {
					return this.sharingService.getShareParticipants(id)
				},
				acceptShare: (share: NoteShareInfo, parent?: MimerNote) => {
					return this.operationsManager.acceptShare(share, parent)
				},
			}
		}
		return this._note
	}

	private _feedback: {
		addComment: (postId: Guid, displayName: string, comment: string) => Promise<void>
	}
	public get feedback() {
		if (!this._feedback) {
			this._feedback = {
				addComment: async (postId: Guid, displayName: string, comment: string) => {
					await this.api.addComment(postId, displayName, comment)
				},
			}
		}
		return this._feedback
	}

	public get payment() {
		return this.paymentClient
	}
}
