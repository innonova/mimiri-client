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
import { controlPanel, type MimerNote } from '../types/mimer-note'
import { createControlPanelTree } from '../types/control-panel'
import { mimiriPlatform } from '../mimiri-platform'
import { browserHistory, updateManager } from '../../global'
import { UIStateManager } from './ui-state-manager'
import { NoteTreeManager, type ActionListener } from './note-tree-manager'
import { NoteOperationsManager } from './note-operations-manager'
import { SessionManager, type LoginListener } from './session-manager'
import { add } from 'date-fns/fp'

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

	public get ui() {
		const uiManager = this.uiManager
		return {
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

	public get tree() {
		const treeManager = this.treeManager
		return {
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

	public get operations() {
		return {
			createMimerNote: (parentNote: MimerNote, title: string) =>
				this.operationsManager.createMimerNote(parentNote, title),
			saveNote: (note: MimerNote) => this.operationsManager.saveNote(note),
			delete: (mimerNote: MimerNote, physicallyDelete: boolean) =>
				this.operationsManager.delete(mimerNote, physicallyDelete),
			copy: (targetId: Guid, mimerNote: MimerNote, index: number) =>
				this.operationsManager.copy(targetId, mimerNote, index),
			move: (sourceId: Guid, targetId: Guid, mimerNote: MimerNote, index: number, keepKey: boolean, select: boolean) =>
				this.operationsManager.move(sourceId, targetId, mimerNote, index, keepKey, select, this.treeManager.root.id),
		}
	}

	public get session() {
		const state = this.state
		return {
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

	public get auth() {
		return {
			checkUsername: (username: string) => this.authManager.checkUsername(username),
			setLoginData: (data: string) => this.authManager.setLoginData(data),
			changeUserNameAndPassword: (username: string, oldPassword: string, newPassword?: string, iterations?: number) =>
				this.authManager.changeUserNameAndPassword(username, oldPassword, newPassword, iterations),
			deleteAccount: (password: string, deleteLocal: boolean) => this.authManager.deleteAccount(password, deleteLocal),
			verifyPassword: (password: string) => this.authManager.verifyPassword(password),
		}
	}

	public get note() {
		return {
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

	public get feedback() {
		return {
			addComment: (postId: Guid, displayName: string, comment: string) =>
				this.api.addComment(postId, displayName, comment),
		}
	}

	public get payment() {
		return this.paymentClient
	}
}
