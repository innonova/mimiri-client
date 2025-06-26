import { reactive } from 'vue'
import { VersionConflictError, type LoginData } from './mimer-client'
import { dateTimeNow } from './types/date-time'
import { newGuid, type Guid } from './types/guid'
import { controlPanel, MimerNote } from './types/mimer-note'
import { Note } from './types/note'
import type { NoteShareInfo } from './types/note-share-info'
import {
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
import { MimiriStore } from './storage/mimiri-store'
import type { MultiAction } from './storage/multi-action'

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
	stateLoaded: boolean
	initInProgress: boolean
	viewMode: ViewMode
	shareOffers: NoteShareInfo[]
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

	private client: MimiriStore
	private _paymentClient: PaymentClient
	private _root: MimerNote
	private notes: { [id: Guid]: MimerNote } = {}
	private outstandingActions: number = 0
	private whenOnlineCallbacks: (() => void)[] = []
	private _isMobile = false
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
			stateLoaded: false,
			initInProgress: true,
			viewMode: ViewMode.Content,
			shareOffers: [],
		})
		this.client = new MimiriStore(
			host,
			serverKeyId,
			serverKey,
			async note => {
				await this.notes[note.id]?.update(note)
			},
			status => {
				this.state.online = status.isOnline
				this.state.authenticated = status.isLoggedIn
			},
		)
		this._paymentClient = new PaymentClient(this.client as any, paymentHost)
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
		setTimeout(() => this.checkBusyLength(), 100)
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

	public queueSync() {
		if (this.client.isLoggedIn) {
			this.client.queueSync()
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
			this.root = new MimerNote(this as any, undefined, note)
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
				updateManager.good()
			} else {
				this.logout()
			}
		} finally {
			this.state.initInProgress = false
		}
	}

	public async loginAnonymousAccount() {
		console.log('Logging in anonymous account')

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
				await this.client.writeNote(this._root.note)
			}
		} catch (ex) {
			debug.log('Failed to load getting started notes', ex)
		}
	}

	private async ensureCreateComplete() {
		try {
			if (!this.client.userData.createComplete) {
				if (!this.client.getKeyById(this.client.userData.rootKey)) {
					const keyMetadata = {
						shared: false,
						root: true,
					}
					await this.client.createKey(this.client.userData.rootKey, keyMetadata)
				}
				let rootNote
				try {
					rootNote = await this.client.readNote(this.client.userData.rootNote)
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
		const root = await this.client.readNote(this.client.userData.rootNote)
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
			await this.client.writeNote(root)
		}
	}

	private async ensureControlPanel() {
		const root = await this.client.readNote(this.client.userData.rootNote)
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
			await this.client.writeNote(root)
		}
	}

	private async loadRootNote() {
		const note = await this.client.readNote(this.client.userData.rootNote)
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
			await this.client.login({ ...data })
			while (true) {
				if (this.client.isLoggedIn) {
					await this.ensureCreateComplete()
					await this.loadRootNote()
					if (!this.client.isOnline && !this.workOffline) {
						setTimeout(() => {
							void this.goOnline(data.password)
						}, 1000)
					} else {
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
			this.emitStatusUpdated()
			updateManager.good()
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

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		await this.client.changeUserNameAndPassword(username, oldPassword, newPassword, iterations)
	}

	public async getShareOffer(code: string) {
		return await this.client.getShareOffer(code)
	}

	public async getShareParticipants(id: Guid) {
		return await this.client.getShareParticipants(id)
	}

	public async addComment(postId: Guid, username: string, comment: string): Promise<void> {
		await this.client.addComment(postId, username, comment)
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
					await this.client.writeNote(parent)
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
				await this.client.writeNote(note.note)
			} catch (err) {
				if (err instanceof VersionConflictError) {
					// TODO: Handle version conflict
				}
				debug.logError('Failed to save note', err)
				throw err
			}
			try {
			} catch (err) {
				debug.logError('Failed to refresh note after save', err)
			}
		} finally {
			this.endAction()
		}
	}

	public async getNote(id: Guid) {
		return await this.client.readNote(id)
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
			const multiAction = this.client.beginMultiAction()
			multiAction.onlineOnly()
			const pow = await ProofOfWork.compute(recipient, this._proofBits)
			await this.ensureShareAllowable(mimerNote)
			await this.client.getPublicKey(recipient, pow)
			let sharedKey
			if (mimerNote.isShared) {
				sharedKey = this.client.getKeyByName(mimerNote.keyName)
			} else {
				const sharedKeyId = newGuid()
				await this.client.createKey(sharedKeyId, { shared: true })
				if (!(await this.client.waitForSync(15000))) {
					return
				}
				sharedKey = this.client.getKeyById(sharedKeyId)
			}
			const affectedNotes = await this.readFlatTree(mimerNote.id)
			for (const affectedNote of affectedNotes) {
				if (affectedNote.keyName !== sharedKey.name) {
					await multiAction.changeNoteKey(affectedNote.id, sharedKey.name)
				}
			}
			await multiAction.commit()
			const response = await this.client.shareNote(recipient, sharedKey.name, mimerNote.id, mimerNote.title, pow)
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
			if (share) {
				const multiAction = this.client.beginMultiAction()
				multiAction.onlineOnly()
				if (!this.client.getKeyByName(share.keyName)) {
					await this.client.createKeyFromNoteShare(newGuid(), share, { shared: true })
					if (!(await this.client.waitForSync(15000))) {
						return
					}
				}
				const shareParent = parent?.note ?? (await this.client.readNote(this.root.id))
				if (!shareParent.getItem('metadata').notes.includes(share.noteId)) {
					shareParent.changeItem('metadata').notes.push(share.noteId)
				}
				await multiAction.updateNote(shareParent)
				await multiAction.commit()
				await this.client.deleteShareOffer(share.id)
				await parent?.expand()
				this.getNoteById(share.noteId)?.select()
			}
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
		} finally {
			this.endAction()
		}
	}

	private async recursiveDelete(multiAction: MultiAction, id: Guid) {
		const note = await this.client.readNote(id)
		if (note) {
			for (const childId of note.getItem('metadata').notes) {
				await this.recursiveDelete(multiAction, childId)
			}
			await multiAction.deleteNote(note)
		}
	}

	public async delete(mimerNote: MimerNote, physicallyDelete: boolean) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot delete while offline')
		}
		this.beginAction()
		try {
			const multiAction = this.client.beginMultiAction()
			const parent = await this.client.readNote(mimerNote.parent.id)
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
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot copy while offline')
		}
		const note = await this.client.readNote(id)
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
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot copy while offline')
		}
		this.beginAction()
		try {
			const target = await this.client.readNote(targetId)
			const multiAction = this.client.beginMultiAction()
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
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot move while offline')
		}
		this.beginAction()
		try {
			const source = await this.client.readNote(sourceId)
			const target = await this.client.readNote(targetId)
			const note = await this.client.readNote(mimerNote.id)
			const multiAction = this.client.beginMultiAction()
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
		return !!this.client.getKeyByName(note.keyName).metadata.shared
	}

	public newNote() {
		if (this.noteCount >= this.maxNoteCount && this.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.usedBytes >= this.maxBytes && this.maxBytes > 0) {
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
		if (this.noteCount >= this.maxNoteCount && this.maxNoteCount > 0) {
			limitDialog.value.show('create-note-count')
			return
		}
		if (this.usedBytes >= this.maxBytes && this.maxBytes > 0) {
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

	public get paymentClient() {
		return this._paymentClient
	}

	public get userId() {
		return this.client.userId
	}

	public get username() {
		return this.client.username
	}

	public get isOnline() {
		return this.client.isOnline
	}

	public get workOffline() {
		return false
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
