import { reactive, watch } from 'vue'
import { newGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ShareResponse } from '../types/responses'
import { ViewMode, type SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { SharingService } from './sharing-service'
import { MimiriDb } from './mimiri-db'
import { MimiriClient, VersionConflictError } from './mimiri-client'
import { MultiAction } from './multi-action'
import { PaymentClient } from './payment-client'
import { dateTimeNow } from '../types/date-time'
import { controlPanel, MimerNote } from '../types/mimer-note'
import { createControlPanelTree } from '../types/control-panel'
import { ProofOfWork } from '../proof-of-work'
import { mimiriPlatform } from '../mimiri-platform'
import { persistedState } from '../persisted-state'
import {
	browserHistory,
	createNewNode,
	createNewRootNode,
	debug,
	env,
	ipcClient,
	limitDialog,
	updateManager,
} from '../../global'
import { Capacitor } from '@capacitor/core'
import type {
	ChargeExistingMethodRequest,
	CreateCustomerRequest,
	CreatePaymentMethodRequest,
	InvoiceToLinkRequest,
	NewSubscriptionRequest,
} from '../types/payment-requests'
import type { Invoice } from '../types/subscription'

export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

class MimerError extends Error {
	constructor(
		public title: string,
		msg: string,
	) {
		super(msg)
	}
}

export interface LoginListener {
	login()
	logout()
	online()
}

export interface ActionListener {
	select(id: Guid)
}

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

	private busyStart: number
	private _root: MimerNote
	private notes: { [id: Guid]: MimerNote } = {}
	private outstandingActions: number = 0
	private whenOnlineCallbacks: (() => void)[] = []
	private _isMobile = false
	private _proofBits = 15
	private _listener: LoginListener
	private _actionListeners: ActionListener[] = []

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

		this._isMobile = mimiriPlatform.isPhoneSize

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
			noteOpen: !this._isMobile,
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
					// Access blogManager dynamically to avoid circular dependency
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

		browserHistory.init(noteId => {
			if (noteId) {
				this.getNoteById(noteId)?.select()
				if (this._isMobile) {
					this.state.noteOpen = true
				}
			} else if (this._isMobile) {
				this.state.noteOpen = false
			}
		})

		setTimeout(() => this.checkBusyLength(), 100)
	}

	// ===================
	// ACTION MANAGEMENT
	// ===================

	private checkBusyLength() {
		if (this.state.busy && !this.state.busyLong) {
			if (Date.now() - this.busyStart > this.state.busyLongDelay) {
				this.state.busyLong = true
				this.state.spinner = true
			}
		}
		setTimeout(() => this.checkBusyLength(), 100)
	}

	public beginAction() {
		this.outstandingActions++
		if (this.outstandingActions > 0) {
			if (!this.state.busy) {
				this.state.busy = true
				this.state.spinner = false
				this.state.busyLong = false
				this.state.busyLongDelay = 1000
				this.busyStart = Date.now()
			}
		}
	}

	public endAction() {
		if (--this.outstandingActions <= 0) {
			this.state.busy = false
			this.state.busyLong = false
		}
	}

	public whenOnline(callback: () => void) {
		if (this.state.isOnline) {
			callback()
		} else {
			this.whenOnlineCallbacks.push(callback)
		}
	}

	// ===================
	// EVENT MANAGEMENT
	// ===================

	private emitStatusUpdated() {
		if (this.state.isOnline) {
			const callbacks = this.whenOnlineCallbacks
			this.whenOnlineCallbacks = []
			callbacks.forEach(cb => cb())
		}
		if (updateManager.pendingActivation) {
			updateManager.idleActivate()
		}
	}

	public registerListener(listener: LoginListener) {
		this._listener = listener
	}

	public registerActionListener(listener: ActionListener) {
		this._actionListeners.push(listener)
	}

	private emitSelected(id: Guid) {
		for (const listener of this._actionListeners) {
			listener.select(id)
		}
	}

	// ===================
	// NOTE MANAGEMENT
	// ===================

	public register(id: Guid, note: MimerNote) {
		this.notes[id] = note
	}

	public select(id: Guid) {
		this.state.selectedNoteId = id
		if (!this._isMobile) {
			browserHistory.open(id)
		}
		this.emitSelected(id)
	}

	public closeNote() {
		if (this._isMobile) {
			this.state.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	public openNote(id?: Guid, mobileOpen = true) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			note.select()
			this.state.viewMode = ViewMode.Content
			if (this._isMobile && mobileOpen) {
				this.state.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.state.selectedNoteId)
			}
		}
	}

	public openProperties(id?: Guid) {
		const note = id ? this.getNoteById(id) : this.selectedNote
		if (note) {
			note.select()
			this.state.viewMode = ViewMode.Properties
			if (this._isMobile) {
				this.state.noteOpen = true
				persistedState.noteOpen = true
				browserHistory.open(this.state.selectedNoteId)
			}
		}
	}

	public getNoteById(id: Guid) {
		if (id) {
			return this.notes[id]
		}
		return undefined
	}

	public getViewModelById(id: Guid) {
		if (id && this.notes[id]) {
			return this.notes[id].viewModel
		}
		return undefined
	}

	// ===================
	// SYNC AND QUEUING
	// ===================

	public queueSync(): void {
		if (this.state.isLoggedIn) {
			this.syncService.queueSync()
		}
	}

	public async waitForSync(timeoutMs?: number): Promise<boolean> {
		return this.syncService.waitForSync(timeoutMs)
	}

	// ===================
	// AUTHENTICATION METHODS (enhanced from base)
	// ===================

	public async checkUsername(username: string) {
		if (env.DEV && username.startsWith('auto_test_')) {
			return true
		}
		while (true) {
			const pow = await ProofOfWork.compute(username, this._proofBits)
			const res = await this.authManager.checkUsername(username, pow)
			if (res.bitsExpected) {
				this._proofBits = res.bitsExpected
			}
			if (!res.proofAccepted) {
				continue
			}
			return res.available
		}
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
				this.state.noteOpen = !this._isMobile
				browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
				await this.ensureCreateComplete()
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
		let pow = ''
		if (env.DEV && username.startsWith('auto_test_')) {
			pow = 'test-mode'
		} else {
			pow = await ProofOfWork.compute(username, this._proofBits)
		}
		await this.authManager.promoteToCloudAccount(username, password, pow, iterations)
		await this.logout()
		await this.login(username, password)
	}

	public async promoteToLocalAccount(username: string, password: string, iterations: number) {
		await this.authManager.promoteToLocalAccount(username, password, iterations)
		await this.logout()
		await this.login(username, password)
	}

	public async login(username: string, password: string): Promise<boolean> {
		this.state.busy = true
		this.state.spinner = false
		this.state.busyLong = false
		this.state.busyLongDelay = 10000
		this.state.noteOpen = !this._isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		this.busyStart = Date.now()
		try {
			if (await this.authManager.login(username, password)) {
				await this.cryptoManager.ensureLocalCrypt()
				await this.syncService.initialSync()
				await this.cryptoManager.loadAllKeys()
				await this.syncService.sync()
				await this.ensureCreateComplete()
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
			this.state.busy = false
			this.state.busyLong = false
		}
	}

	public async goOnline(password?: string): Promise<boolean> {
		this.beginAction()
		try {
			const result = await this.authManager.goOnline()
			this.emitStatusUpdated()
			updateManager.good()
			this._listener?.online()
			return result
		} catch (ex) {
			debug.logError('Failed to go online', ex)
			return false
		} finally {
			this.endAction()
		}
	}

	public async openLocal() {
		this.state.busy = true
		this.state.spinner = false
		this.state.busyLong = false
		this.state.busyLongDelay = 10000
		this.state.noteOpen = !this._isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		this.busyStart = Date.now()
		try {
			await this.authManager.openLocal()
			await this.cryptoManager.ensureLocalCrypt()
			await this.cryptoManager.loadAllKeys()
			if (this.state.isLoggedIn) {
				await this.ensureCreateComplete()
				await this.loadRootNote()
				await this.loadState()
				updateManager.good()
				this._listener?.login()
				return true
			} else {
				return false
			}
		} finally {
			this.state.busy = false
			this.state.busyLong = false
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
		this.beginAction()
		try {
			await this.authManager.goOnline()
		} finally {
			this.endAction()
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
		this.notes = {}
		this.emitStatusUpdated()
	}

	// ===================
	// KEY MANAGEMENT
	// ===================

	public async createKey(id: Guid, metadata: any): Promise<void> {
		await this.cryptoManager.createKey(id, metadata)
		this.queueSync()
	}

	public getKeyByName(name: Guid): KeySet {
		return this.cryptoManager.getKeyByName(name)
	}

	public getKeyById(id: Guid): KeySet {
		return this.cryptoManager.getKeyById(id)
	}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		return this.cryptoManager.createKeyFromNoteShare(id, share, metadata)
	}

	// ===================
	// NOTE OPERATIONS
	// ===================

	public async createNote(note: Note): Promise<void> {
		await this.noteService.createNote(note)
		this.queueSync()
	}

	public async writeNote(note: Note): Promise<void> {
		await this.noteService.writeNote(note)
		this.queueSync()
	}

	public async readNote(id: Guid, base?: Note): Promise<Note> {
		return this.noteService.readNote(id, base)
	}

	public async createMimerNote(parentNote: MimerNote, title: string) {
		let parent = parentNote.note
		this.beginAction()
		try {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').notes = []
			note.changeItem('metadata').title = title
			note.changeItem('metadata').created = dateTimeNow()
			await this.createNote(note)
			for (let i = 0; ; i++) {
				try {
					parent.changeItem('metadata').notes.push(note.id)
					await this.writeNote(parent)
					break
				} catch (exi) {
					if (i >= 3) {
						throw exi
					}
					const reload = await this.readNote(parent.id)
					if (!reload) {
						debug.logError('Failed to reload parent note after create', exi)
						throw exi
					}
					parent = reload
				}
			}
			await parentNote.expand()
			this.getNoteById(note.id)?.select()
		} finally {
			this.endAction()
		}
	}

	public async saveNote(note: MimerNote) {
		this.beginAction()
		try {
			if (note.note.types.includes('created')) {
				if (!note.note.getItem('metadata').created) {
					note.note.changeItem('metadata').created = note.note.getItem('created').title
				}
				note.note.changeItem('created').delete = dateTimeNow()
			}
			try {
				await this.writeNote(note.note)
			} catch (err) {
				if (err instanceof VersionConflictError) {
					// TODO: Handle version conflict
				}
				debug.logError('Failed to save note', err)
				throw err
			}
		} finally {
			this.endAction()
		}
	}

	public async getNote(id: Guid) {
		return await this.readNote(id)
	}

	public beginMultiAction(): MultiAction {
		return new MultiAction(this.noteService, this.syncService, this.api)
	}

	private async readFlatTree(noteId: Guid, whereKey?: Guid) {
		const result: Note[] = []
		const note = await this.readNote(noteId)
		if (!note) {
			throw new MimerError('Not Found', `Note with id '${noteId}' not found`)
		}
		if (!whereKey || note.keyName === whereKey) {
			result.push(note)
		}
		for (const childId of note.getItem('metadata').notes) {
			result.push(...(await this.readFlatTree(childId, whereKey)))
		}
		return result
	}

	private async recursiveDelete(multiAction: MultiAction, id: Guid) {
		const note = await this.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveDelete(multiAction, childId)
			}
			await multiAction.deleteNote(note)
		}
	}

	public async delete(mimerNote: MimerNote, physicallyDelete: boolean) {
		this.beginAction()
		try {
			const multiAction = this.beginMultiAction()
			const parent = await this.readNote(mimerNote.parent.id)
			if (parent) {
				const index = parent.getItem('metadata').notes.indexOf(mimerNote.id)
				if (index >= 0) {
					parent.changeItem('metadata').notes.splice(index, 1)
					await multiAction.updateNote(parent)
				}
			}
			if (physicallyDelete) {
				await this.recursiveDelete(multiAction, mimerNote.id)
			}
			await multiAction.commit()
			;(await this.getNoteById(parent.id))?.select()
		} finally {
			this.endAction()
		}
	}

	private async copyTree(multiAction: MultiAction, id: Guid, keyName: Guid) {
		const note = await this.readNote(id)
		if (note) {
			const copied: Guid[] = []
			for (const childId of note.getItem('metadata').notes) {
				const newChildId = await this.copyTree(multiAction, childId, keyName)
				if (newChildId) {
					copied.push(newChildId)
				}
			}
			note.id = newGuid()
			note.keyName = keyName
			note.changeItem('metadata').notes = copied

			await multiAction.createNote(note)
			return note.id
		}
		return undefined
	}

	public async copy(targetId: Guid, mimerNote: MimerNote, index: number) {
		this.beginAction()
		try {
			const target = await this.readNote(targetId)
			const multiAction = this.beginMultiAction()
			const newId = await this.copyTree(multiAction, mimerNote.id, target.keyName)
			if (newId && !target.getItem('metadata').notes.includes(newId)) {
				if (index >= 0 && index < target.getItem('metadata').notes.length) {
					target.changeItem('metadata').notes.splice(index, 0, newId)
				} else {
					target.changeItem('metadata').notes.push(newId)
				}
				await multiAction.updateNote(target)
			}
			await multiAction.commit()

			const targetMimerNote = await this.getNoteById(targetId)
			await targetMimerNote.expand()
			;(await this.getNoteById(newId))?.select()
		} finally {
			this.endAction()
		}
	}

	public async move(
		sourceId: Guid,
		targetId: Guid,
		mimerNote: MimerNote,
		index: number,
		keepKey: boolean,
		select: boolean,
	) {
		this.beginAction()
		try {
			const source = await this.readNote(sourceId)
			const target = await this.readNote(targetId)
			const note = await this.readNote(mimerNote.id)
			const multiAction = this.beginMultiAction()
			if (target.id === this._root.id && index === 0) {
				// Do not allow moving above recycle bin
				index = 1
			}
			if (source.id === target.id) {
				const currentIndex = target.getItem('metadata').notes.indexOf(note.id)
				if (currentIndex !== index) {
					if (index > currentIndex) {
						index--
					}
					target.changeItem('metadata').notes.splice(currentIndex, 1)
					if (index >= 0 && index < target.getItem('metadata').notes.length) {
						target.changeItem('metadata').notes.splice(index, 0, note.id)
					} else {
						target.changeItem('metadata').notes.push(note.id)
					}
					await multiAction.updateNote(target)
				}
			} else {
				if (!keepKey && note.keyName !== target.keyName) {
					const affectedNotes = await this.readFlatTree(note.id, note.keyName)
					for (const affectedNote of affectedNotes) {
						await multiAction.changeNoteKey(affectedNote.id, target.keyName)
					}
				}
				if (!target.getItem('metadata').notes.includes(note.id)) {
					if (index >= 0 && index < target.getItem('metadata').notes.length) {
						target.changeItem('metadata').notes.splice(index, 0, note.id)
					} else {
						target.changeItem('metadata').notes.push(note.id)
					}
					await multiAction.updateNote(target)
				}
				const sourceIndex = source.getItem('metadata').notes.indexOf(note.id)
				if (sourceIndex >= 0) {
					source.changeItem('metadata').notes.splice(sourceIndex, 1)
					await multiAction.updateNote(source)
				}
			}
			await multiAction.commit()
			if (select) {
				;(await this.getNoteById(mimerNote.id))?.select()
			}
		} finally {
			this.endAction()
		}
	}

	public warn(message: string) {
		console.log(message)
	}

	public isShared(note: Note) {
		return !!this.getKeyByName(note.keyName).metadata.shared
	}

	// ===================
	// SHARING METHODS
	// ===================

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

	public async shareMimerNote(mimerNote: MimerNote, recipient: string) {
		if (!this.state.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.beginAction()
		try {
			const multiAction = this.beginMultiAction()
			multiAction.onlineOnly()
			const pow = await ProofOfWork.compute(recipient, this._proofBits)
			await this.ensureShareAllowable(mimerNote)
			await this.getPublicKey(recipient, pow)
			let sharedKey
			if (mimerNote.isShared) {
				sharedKey = this.getKeyByName(mimerNote.keyName)
			} else {
				const sharedKeyId = newGuid()
				await this.createKey(sharedKeyId, { shared: true })
				if (!(await this.waitForSync(15000))) {
					return
				}
				sharedKey = this.getKeyById(sharedKeyId)
			}
			const affectedNotes = await this.readFlatTree(mimerNote.id)
			for (const affectedNote of affectedNotes) {
				if (affectedNote.keyName !== sharedKey.name) {
					await multiAction.changeNoteKey(affectedNote.id, sharedKey.name)
				}
			}
			await multiAction.commit()
			const response = await this.shareNote(recipient, sharedKey.name, mimerNote.id, mimerNote.title, pow)
			return response
		} finally {
			this.endAction()
		}
	}

	private async ensureShareAllowable(note: MimerNote) {
		if (note.isRoot) {
			throw new MimerError('Cannot Share', 'Cannot share the root note')
		}
		let ancestor = note.parent
		while (!ancestor.isRoot) {
			const ancestorKey = this.getKeyByName(ancestor.note.keyName)
			if (ancestorKey.metadata.shared) {
				throw new MimerError('Cannot Share', 'Cannot share a note that is inside an already shared note')
			}
			ancestor = ancestor.parent
		}
		const key = this.getKeyByName(note.note.keyName)
		const affectedNotes = await this.readFlatTree(note.id)
		for (const subNote of affectedNotes) {
			if (subNote.keyName !== note.note.keyName) {
				const subKey = this.getKeyByName(subNote.keyName)
				if (subKey.metadata.shared) {
					throw new MimerError('Cannot Share', 'Cannot share a note that contains already shared notes')
				}
				throw new MimerError(
					'Cannot Share',
					'A child node with a different non-shared key exists. This should never happen!',
				)
			}
		}
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

	public async deleteShareOfferByInfo(share: NoteShareInfo) {
		if (!this.state.isOnline) {
			throw new MimerError('Offline', 'Cannot delete share offer while offline')
		}
		this.beginAction()
		try {
			await this.deleteShareOffer(share.id)
		} finally {
			this.endAction()
		}
	}

	public async acceptShare(share: NoteShareInfo, parent?: MimerNote) {
		if (!this.state.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.beginAction()
		try {
			if (share) {
				const multiAction = this.beginMultiAction()
				multiAction.onlineOnly()
				if (!this.getKeyByName(share.keyName)) {
					await this.createKeyFromNoteShare(newGuid(), share, { shared: true })
					if (!(await this.waitForSync(15000))) {
						return
					}
				}
				const shareParent = parent?.note ?? (await this.readNote(this.root.id))
				if (!shareParent.getItem('metadata').notes.includes(share.noteId)) {
					shareParent.changeItem('metadata').notes.push(share.noteId)
				}
				await multiAction.updateNote(shareParent)
				await multiAction.commit()
				await this.deleteShareOffer(share.id)
				await parent?.expand()
				this.getNoteById(share.noteId)?.select()
			}
		} finally {
			this.endAction()
		}
	}

	// ===================
	// NOTES STRUCTURE METHODS
	// ===================

	private async addGettingStartedNotesRecursive(parent: Note, notes: any[]) {
		for (const noteData of notes) {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').title = noteData.title
			note.changeItem('metadata').created = dateTimeNow()
			note.changeItem('metadata').isGettingStarted = true
			note.changeItem('metadata').notes = []
			note.changeItem('text').text = noteData.content
			await this.addGettingStartedNotesRecursive(note, noteData.notes)
			await this.createNote(note)
			parent.changeItem('metadata').notes.push(note.id)
		}
	}

	public async addGettingStarted(note?: Note) {
		try {
			const json = await fetch(`${env.VITE_MIMER_UPDATE_HOST}/getting-started.json`).then(res => res.json())
			await this.addGettingStartedNotesRecursive(note ?? this._root.note, json.notes)
			if (!note) {
				await this.writeNote(this._root.note)
			}
		} catch (ex) {
			debug.log('Failed to load getting started notes', ex)
		}
	}

	private async ensureCreateComplete() {
		try {
			if (!this.authManager.userData.createComplete) {
				if (!this.getKeyById(this.authManager.userData.rootKey)) {
					const keyMetadata = {
						shared: false,
						root: true,
					}
					await this.createKey(this.authManager.userData.rootKey, keyMetadata)
				}
				let rootNote
				try {
					rootNote = await this.readNote(this.authManager.userData.rootNote)
				} catch {}
				if (!rootNote) {
					const recycleBin = new Note()
					recycleBin.keyName = this.getKeyById(this.authManager.userData.rootKey).name
					recycleBin.changeItem('metadata').notes = []
					recycleBin.changeItem('metadata').isRecycleBin = true
					await this.createNote(recycleBin)
					const controlPanel = new Note()
					controlPanel.keyName = this.getKeyById(this.authManager.userData.rootKey).name
					controlPanel.changeItem('metadata').notes = []
					controlPanel.changeItem('metadata').isControlPanel = true
					await this.createNote(controlPanel)
					const rootNote = new Note()
					rootNote.id = this.authManager.userData.rootNote
					rootNote.keyName = this.getKeyById(this.authManager.userData.rootKey).name
					rootNote.changeItem('metadata').recycleBin = recycleBin.id
					rootNote.changeItem('metadata').controlPanel = controlPanel.id
					rootNote.changeItem('metadata').notes = [controlPanel.id, recycleBin.id]
					await this.addGettingStarted(rootNote)
					await this.createNote(rootNote)
				}
				this.authManager.userData.createComplete = true
				await this.updateUserData()
			}
			await this.ensureControlPanel()
			await this.ensureRecycleBin()
		} catch (ex) {
			debug.logError('Failed to ensure notes structure', ex)
		}
	}

	private async ensureRecycleBin() {
		const root = await this.readNote(this.authManager.userData.rootNote)
		if (!root.getItem('metadata').recycleBin) {
			const recycleBin = new Note()
			recycleBin.keyName = root.keyName
			recycleBin.changeItem('metadata').title = 'Recycle Bin'
			recycleBin.changeItem('metadata').notes = []
			recycleBin.changeItem('metadata').isRecycleBin = true
			await this.createNote(recycleBin)
			root.changeItem('metadata').recycleBin = recycleBin.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [recycleBin.id, ...rootChildren]
			await this.writeNote(root)
		}
	}

	private async ensureControlPanel() {
		const root = await this.readNote(this.authManager.userData.rootNote)
		if (!root.getItem('metadata').controlPanel) {
			const controlPanel = new Note()
			controlPanel.keyName = root.keyName
			controlPanel.changeItem('metadata').title = 'System'
			controlPanel.changeItem('metadata').notes = []
			controlPanel.changeItem('metadata').isControlPanel = true
			await this.createNote(controlPanel)
			root.changeItem('metadata').controlPanel = controlPanel.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [controlPanel.id, ...rootChildren]
			await this.writeNote(root)
		}
	}

	private async loadRootNote() {
		const note = await this.readNote(this.authManager.userData.rootNote)
		if (note) {
			this.root = new MimerNote(this as any, undefined, note)
			if (note.getItem('metadata').controlPanel) {
				this.ensureControlPanel()
			}
			if (note.getItem('metadata').recycleBin) {
				this.ensureRecycleBin()
			}
			this.emitStatusUpdated()
		} else {
			this.root = undefined
			await this.logout()
			this.emitStatusUpdated()
			throw new MimerError('Login Error', 'Failed to read root node')
		}
	}

	public async loadState() {
		const selectedList = persistedState.readSelectedNote()
		const expanded = persistedState.expanded
		await this.root.ensureChildren()

		if (expanded) {
			let maxIterations = 1000
			while (expanded.length > 0 && --maxIterations > 0) {
				for (let i = 0; i < expanded.length; i++) {
					const note = this.getNoteById(expanded[i])
					if (note) {
						await note.expand()
						expanded.splice(i, 1)
						break
					}
				}
			}
		}

		if (selectedList) {
			let maxIterations = 1000
			while (selectedList.length > 0 && --maxIterations > 0) {
				const note = this.getNoteById(selectedList.pop())
				if (selectedList.length === 0) {
					note?.select()
				}
			}
		}
		this.state.stateLoaded = true
	}

	// ===================
	// UI HELPERS
	// ===================

	public newNote() {
		if (this.state.userStats.noteCount >= this.state.userStats.maxNoteCount && this.state.userStats.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.state.userStats.size >= this.state.userStats.maxTotalBytes && this.state.userStats.maxTotalBytes > 0) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewNode.value = true
	}

	public newRootNote() {
		if (this.state.userStats.noteCount >= this.state.userStats.maxNoteCount && this.state.userStats.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.state.userStats.size >= this.state.userStats.maxTotalBytes && this.state.userStats.maxTotalBytes > 0) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewRootNode.value = true
	}

	public closeEditorIfMobile() {
		if (this._isMobile && this.state.noteOpen) {
			this.state.noteOpen = false
			persistedState.noteOpen = false
		}
	}

	private recurseExpandedNotes(note: MimerNote, check: (note: MimerNote) => boolean) {
		if (check(note)) {
			return note
		}
		if (note.expanded) {
			const result = this.recurseExpandedNotes(note.children[0], check)
			if (result) {
				return result
			}
		}
		if (note.nextSibling) {
			return this.recurseExpandedNotes(note.nextSibling, check)
		}
		return undefined
	}

	public findNextNoteStartingWith(text: string) {
		let current = this.selectedNote
		let note: MimerNote | undefined = undefined
		if (current) {
			note = this.recurseExpandedNotes(current, note => note !== current && note.title.toLowerCase().startsWith(text))
		}
		if (!note && this.root.children.length > 0) {
			note = this.recurseExpandedNotes(this.root.children[0], note => note.title.toLowerCase().startsWith(text))
		}
		if (note) {
			note.select()
		}
	}

	private async isNotePristine(note: MimerNote) {
		const metadata = note.note.getItem('metadata')
		const history = note.note.getItem('history')

		if (!metadata.isGettingStarted || history.active) {
			return false
		}
		await note.ensureChildren()
		for (const child of note.children) {
			if (!(await this.isNotePristine(child))) {
				return false
			}
		}
		return true
	}

	public async isAccountPristine() {
		if (!this.isAnonymous) {
			return false
		}
		const userNotes = this.root.children.filter(child => !child.isSystem)
		if (userNotes.length !== 1) {
			return false
		}
		if (!(await this.isNotePristine(userNotes[0]))) {
			return false
		}
		return true
	}

	// ===================
	// NOTIFICATION METHODS
	// ===================

	public async createNotificationUrl(): Promise<{ url: string; token: string }> {
		return this.api.createNotificationUrl()
	}

	public async updateUserData(): Promise<void> {
		return this.authManager.updateUserData()
	}

	public async addComment(postId: Guid, displayName: string, comment: string) {
		return this.api.addComment(postId, displayName, comment)
	}

	// ===================
	// PAYMENT METHODS
	// ===================

	public getIconPath(icon: string): string {
		return this.paymentClient.getIconPath(icon)
	}

	public async createPaymentLink(request: InvoiceToLinkRequest): Promise<any> {
		return this.paymentClient.createPaymentLink(request)
	}

	public async chargeExistingMethod(request: ChargeExistingMethodRequest): Promise<any> {
		return this.paymentClient.chargeExistingMethod(request)
	}

	public async createAuthQuery(request: any): Promise<string> {
		return this.paymentClient.createAuthQuery(request)
	}

	public async getPdfUrl(invoice: Invoice): Promise<string> {
		return this.paymentClient.getPdfUrl(invoice)
	}

	public async getCustomerData() {
		return this.paymentClient.getCustomerData()
	}

	public async saveCustomerData(data: CreateCustomerRequest) {
		return this.paymentClient.saveCustomerData(data)
	}

	public async verifyEmail() {
		return this.paymentClient.verifyEmail()
	}

	public async getCountries() {
		return this.paymentClient.getCountries()
	}

	public async getInvoices() {
		return this.paymentClient.getInvoices()
	}

	public async getOpenInvoices() {
		return this.paymentClient.getOpenInvoices()
	}

	public async getCurrentSubscriptionProduct() {
		return this.paymentClient.getCurrentSubscriptionProduct()
	}

	public async getCurrentSubscription() {
		return this.paymentClient.getCurrentSubscription()
	}

	public async cancelSubscription() {
		return this.paymentClient.cancelSubscription()
	}

	public async resumeSubscription() {
		return this.paymentClient.resumeSubscription()
	}

	public async getSubscriptionProducts() {
		return this.paymentClient.getSubscriptionProducts()
	}

	public async newSubscription(request: NewSubscriptionRequest) {
		return this.paymentClient.newSubscription(request)
	}

	public async getPaymentMethods() {
		return this.paymentClient.getPaymentMethods()
	}

	public async getInvoice(invoiceId: Guid, auth?: string) {
		return this.paymentClient.getInvoice(invoiceId, auth)
	}

	public async getInvoicePaymentStatus(invoiceId: Guid) {
		return this.paymentClient.getInvoicePaymentStatus(invoiceId)
	}

	public async createNewPaymentMethod(request: CreatePaymentMethodRequest) {
		return this.paymentClient.createNewPaymentMethod(request)
	}

	public async makePaymentMethodDefault(methodId: Guid) {
		return this.paymentClient.makePaymentMethodDefault(methodId)
	}

	public async deletePaymentMethodDefault(methodId: Guid) {
		return this.paymentClient.deletePaymentMethodDefault(methodId)
	}

	public setWorkOffline(value: boolean) {
		this.api.workOffline = value
	}

	// ===================
	// GETTERS
	// ===================

	public get root() {
		return this._root
	}

	private set root(value: MimerNote) {
		this._root = value
	}

	public get controlPanel() {
		return this._root?.children.find(child => child.id === this._root.note.getItem('metadata').controlPanel)
	}

	public get recycleBin() {
		return this._root?.children.find(child => child.id === this._root.note.getItem('metadata').recycleBin)
	}

	public get selectedNote() {
		return this.getNoteById(this.state.selectedNoteId)
	}

	public get selectedViewModel() {
		return this.getViewModelById(this.state.selectedNoteId)
	}

	public get controlPanelId(): Guid {
		return this._root?.note.getItem('metadata').controlPanel
	}

	public get isAnonymous() {
		return !!this.state.username?.startsWith('mimiri_a_')
	}

	public get isMobile() {
		return this._isMobile
	}
}
