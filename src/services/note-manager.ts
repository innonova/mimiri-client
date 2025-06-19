import { reactive, ref } from 'vue'
import { MimerClient, VersionConflictError, type LoginData } from './mimer-client'
import { dateTimeNow } from './types/date-time'
import { newGuid, type Guid } from './types/guid'
import { controlPanel, MimerNote } from './types/mimer-note'
import { Note } from './types/note'
import type { NoteShareInfo } from './types/note-share-info'
import type { ICacheManager } from './types/cache-manager'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { type NoteAction } from './types/requests'
import {
	blogManager,
	browserHistory,
	createNewNode,
	createNewRootNode,
	debug,
	env,
	ipcClient,
	limitDialog,
	updateManager,
} from '../global'
import { Capacitor } from '@capacitor/core'
import { mimiriPlatform } from './mimiri-platform'
import { persistedState } from './persisted-state'
import { ProofOfWork } from './proof-of-work'
import { PaymentClient } from './payment-client'
import type { ClientConfig } from './types/responses'
import { createControlPanelTree } from './types/control-panel'
import { settingsManager } from './settings-manager'
import { deObfuscate, obfuscate } from './helpers'
import { toHex } from './hex-base64'

export enum ActionType {
	Save,
	CreateChild,
	Share,
	Delete,
	Copy,
	Move,
	AcceptShare,
	DeleteShareOffer,
}

export enum ViewMode {
	Content = 'content',
	Properties = 'properties',
}

interface NoteManagerState {
	authenticated: boolean
	online: boolean
	busy: boolean
	busyLong: boolean
	busyLongDelay: number
	spinner: boolean
	noteOpen: boolean
	selectedNoteId?: Guid
	shareOffers: NoteShareInfo[]
	stateLoaded: boolean
	initInProgress: boolean
	viewMode: ViewMode
}

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

export class NoteManager {
	public ignoreFirstWALError: boolean = false

	public state: NoteManagerState
	private busyStart: number

	private client: MimerClient
	private _paymentClient: PaymentClient
	private _root: MimerNote
	private notes: { [id: Guid]: MimerNote } = {}
	private outstandingActions: number = 0
	private whenOnlineCallbacks: (() => void)[] = []
	private _isMobile = false
	private _ensureWhenOnline: Note[] = []
	private _proofBits = 15
	private _listener: LoginListener
	private _actionListeners: ActionListener[] = []

	constructor(host: string, paymentHost: string, serverKey: string, serverKeyId: string) {
		controlPanel.createChildren = (owner: NoteManager, parent: MimerNote) => {
			return createControlPanelTree(owner, parent)
		}
		this._isMobile = mimiriPlatform.isPhoneSize
		this.state = reactive({
			busy: false,
			busyLong: false,
			busyLongDelay: 1000,
			spinner: true,
			authenticated: false,
			online: false,
			noteOpen: !this._isMobile,
			shareOffers: [],
			stateLoaded: false,
			initInProgress: true,
			viewMode: ViewMode.Content,
		})
		this.client = new MimerClient(host, serverKey, serverKeyId)
		this._paymentClient = new PaymentClient(this.client, paymentHost)
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

	private checkBusyLength() {
		if (this.state.busy && !this.state.busyLong) {
			if (Date.now() - this.busyStart > this.state.busyLongDelay) {
				this.state.busyLong = true
				this.state.spinner = true
			}
		}
		if (!this.client.testId) {
			setTimeout(() => this.checkBusyLength(), 100)
		}
	}

	private emitStatusUpdated() {
		this.state.online = this.isOnline
		this.state.authenticated = this.isLoggedIn
		if (this.isOnline) {
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
		if (this.isOnline) {
			callback()
		} else {
			this.whenOnlineCallbacks.push(callback)
		}
	}

	public async checkUsername(username: string) {
		if (env.DEV && username.startsWith('auto_test_')) {
			return true
		}
		while (true) {
			const pow = await ProofOfWork.compute(username, this._proofBits)
			const res = await this.client.checkUsername(username, pow)
			if (res.bitsExpected) {
				this._proofBits = res.bitsExpected
			}
			if (!res.proofAccepted) {
				continue
			}
			return res.available
		}
	}

	public async createAccount(username: string, password: string, iterations: number) {
		const userData = {
			rootNote: newGuid(),
			rootKey: newGuid(),
			createComplete: false,
		}
		let pow = ''
		if (env.DEV && username.startsWith('auto_test_')) {
			pow = 'test-mode'
		} else {
			pow = await ProofOfWork.compute(username, this._proofBits)
		}
		await this.client.createUser(username, password, userData, pow, iterations)

		await this.ensureCreateComplete()

		const note = await this.client.readNote(this.client.userData.rootNote)
		if (note) {
			this.root = new MimerNote(this, undefined, note)
			this.emitStatusUpdated()
		} else {
			this.root = undefined
			this.client.logout()
			this.emitStatusUpdated()
			throw new MimerError('Login Error', 'Failed to read root node')
		}
	}

	public async setLoginData(data: string) {
		await this.client.setLoginData(data)
		await this.recoverLogin()
	}

	public async getLoginData() {
		return this.client.getLoginData()
	}

	public async recoverLogin() {
		try {
			if (await this.client.restoreLogin()) {
				this.state.noteOpen = !this._isMobile
				browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
				await this.ensureCreateComplete()
				await this.loadRootNote()
				await this.loadState()
				await this.connectForNotifications()
				this.loadShareOffers()
				updateManager.good()
			} else {
				this.logout()
			}
		} finally {
			this.state.initInProgress = false
		}
	}

	public async loginAnonymousAccount() {
		if (settingsManager.anonymousUsername && settingsManager.anonymousPassword) {
			const password = await deObfuscate(settingsManager.anonymousPassword)
			await this.login({
				username: settingsManager.anonymousUsername,
				password: password,
			})
			if (this.isLoggedIn) {
				if (mimiriPlatform.isElectron || (mimiriPlatform.isWeb && env.DEV)) {
					settingsManager.autoLoginData = await obfuscate(await this.getLoginData())
					settingsManager.autoLogin = true
				}
				await settingsManager.waitForSaveComplete()
				await this.loadState()
			}
		} else if (!mimiriPlatform.isWeb || env.DEV) {
			const username = `mimiri_a_${Date.now()}_${`${Math.random()}`.substring(2, 6)}`
			const password = toHex(crypto.getRandomValues(new Uint8Array(128)))
			// high password complexity obviates the need for high iteration count so we can save time here
			await this.createAccount(username, password, 100)
			settingsManager.anonymousUsername = username
			settingsManager.anonymousPassword = await obfuscate(password)
			if (mimiriPlatform.isElectron || (mimiriPlatform.isWeb && env.DEV)) {
				settingsManager.autoLoginData = await obfuscate(await this.getLoginData())
				settingsManager.autoLogin = true
			}
			await settingsManager.waitForSaveComplete()
			if (this.isLoggedIn) {
				await this.root.ensureChildren()
			}
			const gettingStartedNote = this.root.children.find(note => note.note.getItem('metadata').isGettingStarted)
			gettingStartedNote.expand()
			gettingStartedNote.select()
		}
	}

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
			await this.client.createNote(note)
			parent.changeItem('metadata').notes.push(note.id)
		}
	}

	public async addGettingStarted(note?: Note) {
		try {
			const json = await fetch(`${env.VITE_MIMER_UPDATE_HOST}/getting-started.json`).then(res => res.json())
			await this.addGettingStartedNotesRecursive(note ?? this._root.note, json.notes)
			if (!note) {
				await this.client.updateNote(this._root.note)
				await this.refreshNote(this._root.note.id)
			}
		} catch (ex) {
			debug.log('Failed to load getting started notes', ex)
		}
	}

	private async ensureCreateComplete() {
		try {
			if (!this.client.userData.createComplete) {
				if (!this.client.keyWithIdExists(this.client.userData.rootKey)) {
					const keyMetadata = {
						shared: false,
						root: true,
					}
					await this.client.createKey(this.client.userData.rootKey, keyMetadata)
				}
				let rootNote
				try {
					rootNote = await this.client.readNote(this.client.userData.rootNote, false)
				} catch {}
				if (!rootNote) {
					const recycleBin = new Note()
					recycleBin.keyName = this.client.getKeyById(this.client.userData.rootKey).name
					recycleBin.changeItem('metadata').notes = []
					recycleBin.changeItem('metadata').isRecycleBin = true
					await this.client.createNote(recycleBin)

					const controlPanel = new Note()
					controlPanel.keyName = this.client.getKeyById(this.client.userData.rootKey).name
					controlPanel.changeItem('metadata').notes = []
					controlPanel.changeItem('metadata').isControlPanel = true
					await this.client.createNote(controlPanel)

					const rootNote = new Note()
					rootNote.id = this.client.userData.rootNote
					rootNote.keyName = this.client.getKeyById(this.client.userData.rootKey).name
					rootNote.changeItem('metadata').recycleBin = recycleBin.id
					rootNote.changeItem('metadata').controlPanel = controlPanel.id
					rootNote.changeItem('metadata').notes = [controlPanel.id, recycleBin.id]
					await this.addGettingStarted(rootNote)
					await this.client.createNote(rootNote)
				}
				this.client.userData.createComplete = true
				await this.client.updateUserData()
			}
			await this.ensureControlPanel()
			await this.ensureRecycleBin()
		} catch (ex) {
			debug.logError('Failed to ensure notes structure', ex)
		}
	}

	private async ensureRecycleBin() {
		const root = await this.client.readNote(this.client.userData.rootNote, false)
		if (!root.getItem('metadata').recycleBin) {
			const recycleBin = new Note()
			recycleBin.keyName = root.keyName
			recycleBin.changeItem('metadata').title = 'Recycle Bin'
			recycleBin.changeItem('metadata').notes = []
			recycleBin.changeItem('metadata').isRecycleBin = true
			await this.client.createNote(recycleBin)
			root.changeItem('metadata').recycleBin = recycleBin.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [recycleBin.id, ...rootChildren]
			await this.client.updateNote(root)
		}
	}

	private async ensureControlPanel() {
		const root = await this.client.readNote(this.client.userData.rootNote, false)
		if (!root.getItem('metadata').controlPanel) {
			const controlPanel = new Note()
			controlPanel.keyName = root.keyName
			controlPanel.changeItem('metadata').title = 'System'
			controlPanel.changeItem('metadata').notes = []
			controlPanel.changeItem('metadata').isControlPanel = true
			await this.client.createNote(controlPanel)
			root.changeItem('metadata').controlPanel = controlPanel.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [controlPanel.id, ...rootChildren]
			await this.client.updateNote(root)
		}
	}

	private async loadRootNote() {
		const note = await this.client.readNote(this.client.userData.rootNote, true)
		if (note) {
			this.root = new MimerNote(this, undefined, note)
			if (note.getItem('metadata').controlPanel) {
				this.ensureControlPanel()
			}
			if (note.getItem('metadata').recycleBin) {
				this.ensureRecycleBin()
			}
			this.emitStatusUpdated()
		} else {
			this.root = undefined
			this.client.logout()
			this.emitStatusUpdated()
			throw new MimerError('Login Error', 'Failed to read root node')
		}
	}

	public async login(data: LoginData) {
		this.state.busy = true
		this.state.spinner = false
		this.state.busyLong = false
		this.state.busyLongDelay = 10000
		this.state.noteOpen = !this._isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		this.busyStart = Date.now()
		try {
			await this.client.login({ ...data, preferOffline: this.cacheEnabled })
			while (true) {
				if (this.client.isLoggedIn) {
					await this.ensureCreateComplete()
					await this.loadRootNote()
					if (!this.client.isOnline && !this.workOffline) {
						setTimeout(() => {
							void this.goOnline(data.password)
						}, 1000)
					} else {
						await this.connectForNotifications()
						this.loadShareOffers()
						updateManager.good()
					}
					this._listener?.login()
					return true
				} else {
					await this.client.login({ ...data, preferOffline: false })
					if (!this.client.isLoggedIn) {
						return false
					}
				}
			}
		} finally {
			this.state.busy = false
			this.state.busyLong = false
		}
	}

	public async verifyPassword(password: string) {
		return this.client.verifyPassword(password)
	}

	public async goOnline(password?: string) {
		this.beginAction()
		try {
			await this.client.goOnline(password)
			await this.connectForNotifications()
			await this.root.refresh()
			await this.selectedNote?.refresh()
			await this.loadShareOffers()
			this.emitStatusUpdated()
			updateManager.good()
			if (this._ensureWhenOnline.length > 0) {
				const items = this._ensureWhenOnline
				this._ensureWhenOnline = []
				for (const note of items) {
					void this.ensureLiveNode(note)
				}
			}
			this._listener?.online()
		} catch (ex) {
			debug.logError('Failed to go online', ex)
		} finally {
			this.endAction()
		}
	}
	public async updateUserStats() {
		this.beginAction()
		try {
			await this.client.goOnline()
		} finally {
			this.endAction()
		}
	}

	public logout() {
		settingsManager.autoLogin = false
		settingsManager.autoLoginData = undefined
		this._listener?.logout()
		this.root = undefined
		this.notes = {}
		this._ensureWhenOnline = []
		this.client.logout()
		this.emitStatusUpdated()
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

	public async deleteAccount(password: string, deleteLocal: boolean) {
		await this.client.deleteAccount(password, deleteLocal)
		this.state.online = false
	}

	public async connectForNotifications() {
		if (mimiriPlatform.isElectron || mimiriPlatform.isWeb) {
			if (!this.client.testId) {
				try {
					const response = await this.client.createNotificationUrl()
					const connection = new HubConnectionBuilder()
						.withUrl(response.url, { accessTokenFactory: () => response.token })
						// .configureLogging(LogLevel.Warning)
						.withAutomaticReconnect()
						.build()
					connection.on('notification', async (sender, type, payload) => {
						if (type === 'note-update') {
							const json = JSON.parse(payload)
							const note = this.notes[json.id]
							if (note) {
								for (const version of json.versions) {
									if (version.version > note.note.getVersion(version.type)) {
										await note.refresh()
										break
									}
								}
							}
						}
						if (type === 'bundle-update') {
							void updateManager.check()
						}
						if (type === 'blog-post') {
							void blogManager.refreshAll()
						}
					})
					connection.onreconnecting(error => {
						console.log('SignalR Reconnecting', error)
					})
					connection.onreconnected(() => {
						console.log('SignalR Reconnected')
						void updateManager.check()
						void blogManager.refreshAll()
						this.loadShareOffers()
					})
					connection.onclose(error => {
						console.log('SignalR Closed', error)
					})
					await connection.start()
					void updateManager.check()
					void blogManager.refreshAll()
				} catch (ex) {
					debug.logError('Failed to connect for notifications', ex)
				}
			}
		} else {
			void updateManager.check()
			void blogManager.refreshAll()
		}
	}

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		await this.client.changeUserNameAndPassword(username, oldPassword, newPassword, iterations)
	}

	public async getShareOffers() {
		return await this.client.getShareOffers()
	}

	public async getShareOffer(code: string) {
		return await this.client.getShareOffer(code)
	}

	public async loadShareOffers() {
		try {
			this.state.shareOffers = await this.client.getShareOffers()
		} catch (ex) {
			debug.logError('Failed to load share offers', ex)
		}
	}

	public async getShareParticipants(id: Guid) {
		return await this.client.getShareParticipants(id)
	}

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

	private async sendUpdate(note: Note) {
		await this.notes[note.id]?.update(note)
	}

	public async refreshNote(id: Guid) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot refresh while offline')
		}
		const note = await this.client.readNote(id)
		if (note) {
			await this.sendUpdate(note)
		}
	}

	public async refreshNoteWithBase(base: Note) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot refresh while offline')
		}
		const note = await this.client.readNote(base.id, false, undefined, base)
		if (note) {
			await this.sendUpdate(note)
		}
	}

	public async refreshTreeShallow(id: Guid) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot refresh while offline')
		}
		const note = await this.client.readNote(id)
		if (note) {
			this.sendUpdate(note)
			for (const childId of note.getItem('metadata').notes) {
				const childNote = await this.client.readNote(childId)
				if (childNote) {
					this.sendUpdate(childNote)
				}
			}
		}
	}

	public async refreshTree(id: Guid) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot refresh while offline')
		}
		const note = await this.client.readNote(id)
		if (note) {
			this.sendUpdate(note)
			for (const childId of note.getItem('metadata').notes) {
				await this.refreshTree(childId)
			}
		}
	}

	private async readFlatTree(noteId: Guid, whereKey?: Guid) {
		const result: Note[] = []
		const note = await this.client.readNote(noteId)
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

	public async createNote(parentNote: MimerNote, title: string) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot create notes while offline')
		}
		let parent = parentNote.note
		this.beginAction()
		try {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').notes = []
			note.changeItem('metadata').title = title
			note.changeItem('metadata').created = dateTimeNow()
			await this.client.createNote(note)
			for (let i = 0; ; i++) {
				try {
					parent.changeItem('metadata').notes.push(note.id)
					await this.client.updateNote(parent)
					break
				} catch (exi) {
					if (i >= 3) {
						throw exi
					}
					const reload = await this.client.readNote(parent.id)
					if (!reload) {
						debug.logError('Failed to reload parent note after create', exi)
						throw exi
					}
					parent = reload
				}
			}
			await this.refreshNote(parent.id)
			await parentNote.expand()
			this.getNoteById(note.id)?.select()
		} finally {
			this.endAction()
		}
	}

	public async saveNote(note: MimerNote) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot save while offline')
		}
		this.beginAction()
		try {
			if (note.note.types.includes('created')) {
				if (!note.note.getItem('metadata').created) {
					note.note.changeItem('metadata').created = note.note.getItem('created').title
				}
				note.note.changeItem('created').delete = dateTimeNow()
			}
			try {
				await this.client.updateNote(note.note)
			} catch (err) {
				if (err instanceof VersionConflictError) {
					await this.refreshNote(note.id)
				}
				debug.logError('Failed to save note', err)
				throw err
			}
			try {
				await this.refreshNote(note.id)
			} catch (err) {
				debug.logError('Failed to refresh note after save', err)
			}
		} finally {
			this.endAction()
		}
	}

	private async ensureLiveNode(existing: Note) {
		const note = await this.client.readNote(existing.id, false, undefined, existing)
		if (note) {
			this.sendUpdate(note)
		}
	}

	public async getNote(id: Guid) {
		const note = await this.client.readNote(id, true)
		if (note != null) {
			this.sendUpdate(note)
			if (note.isCache) {
				if (this.client.isOnline) {
					void this.ensureLiveNode(note)
				} else {
					this._ensureWhenOnline.push(note)
				}
			}
		}
		return note
	}

	private async ensureShareAllowable(note: MimerNote) {
		if (note.isRoot) {
			throw new MimerError('Cannot Share', 'Cannot share the root note')
		}
		let ancestor = note.parent
		while (!ancestor.isRoot) {
			const ancestorKey = this.client.getKeyByName(ancestor.note.keyName)
			if (ancestorKey.metadata.shared) {
				throw new MimerError('Cannot Share', 'Cannot share a note that is inside an already shared note')
			}
			ancestor = ancestor.parent
		}
		const key = this.client.getKeyByName(note.note.keyName)
		const affectedNotes = await this.readFlatTree(note.id)
		for (const subNote of affectedNotes) {
			if (subNote.keyName !== note.note.keyName) {
				const subKey = this.client.getKeyByName(subNote.keyName)
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

	public async shareNote(mimerNote: MimerNote, recipient: string) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.beginAction()
		try {
			const actions: NoteAction[] = []
			const pow = await ProofOfWork.compute(recipient, this._proofBits)
			await this.ensureShareAllowable(mimerNote)
			await this.client.getPublicKey(recipient, pow)

			let sharedKey
			if (mimerNote.isShared) {
				sharedKey = this.client.getKeyByName(mimerNote.keyName)
			} else {
				const sharedKeyId = newGuid()
				await this.client.createKey(sharedKeyId, { shared: true })
				sharedKey = this.client.getKeyById(sharedKeyId)
			}

			const affectedNotes = await this.readFlatTree(mimerNote.id)
			for (const affectedNote of affectedNotes) {
				if (affectedNote.keyName !== sharedKey.name) {
					actions.push(await this.client.createChangeKeyAction(affectedNote.id, sharedKey.name))
				}
			}
			const affectedIds = await this.client.multiAction(actions)
			const response = await this.client.shareNote(recipient, sharedKey.name, mimerNote.id, mimerNote.title, pow)
			for (const id of affectedIds) {
				await this.refreshNote(id)
			}
			return response
		} finally {
			this.endAction()
		}
	}

	public async acceptShare(share: NoteShareInfo, parent?: MimerNote) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot share while offline')
		}
		this.beginAction()
		try {
			const offers = await this.client.getShareOffers()
			const offer = offers.find(o => o.id === share.id)
			if (offer) {
				const actions: NoteAction[] = []
				if (!this.client.keyWithNameExists(offer.keyName)) {
					await this.client.createKeyFromNoteShare(newGuid(), offer, { shared: true })
				}
				const shareParent = parent?.note ?? (await this.client.readNote(this.root.id))

				if (!shareParent.getItem('metadata').notes.includes(offer.noteId)) {
					shareParent.changeItem('metadata').notes.push(offer.noteId)
				}
				actions.push(await this.client.createUpdateAction(shareParent))

				await this.client.multiAction(actions)

				await this.refreshNote(shareParent.id)
				await this.refreshNote(offer.noteId)
				await this.client.deleteShareOffer(offer.id)
				await parent?.expand()
				this.getNoteById(offer.noteId)?.select()
			}
			await this.loadShareOffers()
		} finally {
			this.endAction()
		}
	}

	public async deleteShareOffer(share: NoteShareInfo) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot delete share offer while offline')
		}
		this.beginAction()
		try {
			await this.client.deleteShareOffer(share.id)
			await this.loadShareOffers()
		} finally {
			this.endAction()
		}
	}

	private async recursiveDelete(actions: NoteAction[], id: Guid) {
		const note = await this.client.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveDelete(actions, childId)
			}
			actions.push(await this.client.createDeleteAction(note))
		}
	}

	public async delete(mimerNote: MimerNote, physicallyDelete: boolean) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot delete while offline')
		}
		this.beginAction()
		try {
			const actions: NoteAction[] = []
			const parent = await this.client.readNote(mimerNote.parent.id)
			if (parent) {
				const index = parent.getItem('metadata').notes.indexOf(mimerNote.id)
				if (index >= 0) {
					parent.changeItem('metadata').notes.splice(index, 1)
					actions.push(await this.client.createUpdateAction(parent))
				}
			}
			if (physicallyDelete) {
				await this.recursiveDelete(actions, mimerNote.id)
			}
			await this.client.multiAction(actions)
			await this.refreshNote(parent.id)
			;(await this.getNoteById(parent.id))?.select()
		} finally {
			this.endAction()
		}
	}

	private async copyTree(actions: NoteAction[], id: Guid, keyName: Guid) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot copy while offline')
		}
		const note = await this.client.readNote(id)
		if (note) {
			const copied: Guid[] = []
			for (const childId of note.getItem('metadata').notes) {
				const newChildId = await this.copyTree(actions, childId, keyName)
				if (newChildId) {
					copied.push(newChildId)
				}
			}
			note.id = newGuid()
			note.keyName = keyName
			note.changeItem('metadata').notes = copied

			actions.push(await this.client.createCreateAction(note))
			return note.id
		}
		return undefined
	}

	public async copy(targetId: Guid, mimerNote: MimerNote, index: number) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot copy while offline')
		}
		this.beginAction()
		try {
			const target = await this.client.readNote(targetId)
			const actions: NoteAction[] = []
			const newId = await this.copyTree(actions, mimerNote.id, target.keyName)
			if (newId && !target.getItem('metadata').notes.includes(newId)) {
				if (index >= 0 && index < target.getItem('metadata').notes.length) {
					target.changeItem('metadata').notes.splice(index, 0, newId)
				} else {
					target.changeItem('metadata').notes.push(newId)
				}
				actions.push(await this.client.createUpdateAction(target))
			}
			const affectedIds = await this.client.multiAction(actions)

			const targetMimerNote = await this.getNoteById(targetId)
			await targetMimerNote.expand()
			for (const id of affectedIds) {
				await this.refreshNote(id)
			}

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
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot move while offline')
		}
		this.beginAction()
		try {
			const source = await this.client.readNote(sourceId)
			const target = await this.client.readNote(targetId)
			const note = await this.client.readNote(mimerNote.id)
			const actions: NoteAction[] = []
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
					actions.push(await this.client.createUpdateAction(target))
				}
			} else {
				if (!keepKey && note.keyName !== target.keyName) {
					const affectedNotes = await this.readFlatTree(note.id, note.keyName)
					for (const affectedNote of affectedNotes) {
						actions.push(await this.client.createChangeKeyAction(affectedNote.id, target.keyName))
					}
				}
				if (!target.getItem('metadata').notes.includes(note.id)) {
					if (index >= 0 && index < target.getItem('metadata').notes.length) {
						target.changeItem('metadata').notes.splice(index, 0, note.id)
					} else {
						target.changeItem('metadata').notes.push(note.id)
					}
					actions.push(await this.client.createUpdateAction(target))
				}
				const sourceIndex = source.getItem('metadata').notes.indexOf(note.id)
				if (sourceIndex >= 0) {
					source.changeItem('metadata').notes.splice(sourceIndex, 1)
					actions.push(await this.client.createUpdateAction(source))
				}
			}
			const affectedIds = await this.client.multiAction(actions)
			for (const id of affectedIds) {
				await this.refreshNote(id)
			}
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

	public async beginTest(name: string) {
		const workOffline = this.client.workOffline
		this.client.workOffline = false
		await this.client.beginTest(name)
		this.client.workOffline = workOffline
	}

	public async endTest(keep: boolean) {
		this.client.workOffline = false
		await this.client.endTest(keep)
	}

	public isShared(note: Note) {
		return !!this.client.getKeyByName(note.keyName).metadata.shared
	}

	public cloneTest() {
		const result = new NoteManager('', '', '', '')
		result.client = this.client.cloneTest()
		return result
	}

	public setCacheManager(cacheManager: ICacheManager) {
		this.client.setCacheManager(cacheManager)
	}

	public newNote() {
		if (this.noteCount >= this.maxNoteCount) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.usedBytes >= this.maxBytes) {
			limitDialog.value.show('create-note-size')
			return
		}
		createNewNode.value = true
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

	public newRootNote() {
		if (this.noteCount >= this.maxNoteCount) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.usedBytes >= this.maxBytes) {
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

	public async accountUrl() {
		return this.client.getAccountUrl()
	}

	public featureEnabled(name: string) {
		return this.client.clientConfig?.features?.includes(name)
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

	public async addComment(postId: Guid, displayName: string, comment: string) {
		return this.client.addComment(postId, displayName, comment)
	}

	public get paymentClient() {
		return this._paymentClient
	}

	public get userId() {
		return this.client.userId
	}

	public get username() {
		return this.client.username
	}

	public get cacheEnabled() {
		return this.client.cacheEnabled
	}

	public get isOnline() {
		return this.client.isOnline
	}

	public get workOffline() {
		return this.client.workOffline
	}

	public set workOffline(value: boolean) {
		this.client.workOffline = value
	}

	public get testId() {
		return this.client.testId
	}

	public get isLoggedIn() {
		return this.client.isLoggedIn
	}

	public get authenticated() {
		return this.state.authenticated
	}

	public get root() {
		return this._root
	}

	private set root(value: MimerNote) {
		this._root = value
	}

	public get controlPanel() {
		return this.root.children.find(child => child.id === this.root.note.getItem('metadata').controlPanel)
	}

	public get recycleBin() {
		return this.root.children.find(child => child.id === this.root.note.getItem('metadata').recycleBin)
	}

	public get selectedNote() {
		return this.getNoteById(this.state.selectedNoteId)
	}

	public get selectedViewModel() {
		return this.getViewModelById(this.state.selectedNoteId)
	}

	public get usedBytes() {
		return this.client.usedBytes
	}

	public get maxBytes() {
		return this.client.maxBytes
	}

	public get noteCount() {
		return this.client.noteCount
	}

	public get maxNoteCount() {
		return this.client.maxNoteCount
	}

	public get maxNoteSize() {
		return this.client.maxNoteSize
	}

	public get initInProgress() {
		return this.state.initInProgress
	}

	public get clientConfig(): ClientConfig {
		return this.client.clientConfig
	}

	public get controlPanelId(): Guid {
		return this._root.note.getItem('metadata').controlPanel
	}

	public get isAnonymous() {
		return !!this.client.username?.startsWith('mimiri_a_')
	}

	public get isMobile() {
		return this._isMobile
	}

	public get viewMode() {
		return this.state.viewMode
	}
}
