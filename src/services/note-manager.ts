import { reactive, ref } from 'vue'
import { MimerClient, VersionConflictError, type LoginData } from './mimer-client'
import { dateTimeNow } from './types/date-time'
import { newGuid, type Guid } from './types/guid'
import { MimerNote } from './types/mimer-note'
import { Note } from './types/note'
import type { NoteShareInfo } from './types/note-share-info'
import type { ICacheManager } from './types/cache-manager'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { type NoteAction } from './types/requests'
import {
	browserHistory,
	createNewNode,
	createNewRootNode,
	env,
	ipcClient,
	limitDialog,
	mobileLog,
	updateManager,
} from '../global'
import { Capacitor } from '@capacitor/core'
import { mimiriPlatform } from './mimiri-platform'
import { persistedState } from './persisted-state'
import { ProofOfWork } from './proof-of-work'

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
}

class MimerError extends Error {
	constructor(
		public title: string,
		msg: string,
	) {
		super(msg)
	}
}

export class NoteManager {
	public ignoreFirstWALError: boolean = false

	public state: NoteManagerState
	private busyStart: number

	private client: MimerClient
	private _root: MimerNote
	private notes: { [id: Guid]: MimerNote } = {}
	private outstandingActions: number = 0
	private whenOnlineCallbacks: (() => void)[] = []
	private _isMobile = false
	private _ensureWhenOnline: Note[] = []
	private _proofBits = 15

	constructor(host: string, serverKey: string, serverKeyId: string) {
		this._isMobile = !window.matchMedia?.('(min-width: 768px)')?.matches
		window.addEventListener('resize', () => {
			this._isMobile = !window.matchMedia?.('(min-width: 768px)')?.matches
			if (!this._isMobile) {
				this.state.noteOpen = true
			}
		})
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
		})
		this.client = new MimerClient(host, serverKey, serverKeyId)
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
		setTimeout(() => this.recoverLogin(), 100)
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

	public async createAccount(username: string, password: string) {
		const userData = {
			rootNote: newGuid(),
			rootKey: newGuid(),
			createComplete: false,
		}
		const pow = await ProofOfWork.compute(username, this._proofBits)
		await this.client.createUser(username, password, userData, pow)

		// const keyMetadata = {
		// 	shared: false,
		// 	root: true,
		// }
		// await this.client.createKey(this.client.userData.rootKey, keyMetadata)

		// const rootNote = new Note()
		// rootNote.id = userData.rootNote
		// rootNote.keyName = this.client.getKeyById(this.client.userData.rootKey).name
		// rootNote.changeItem('metadata').notes = []

		// await this.client.createNote(rootNote)

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

	private async recoverLogin() {
		const loginData = await this.client.getPersistedLogin()
		if (loginData) {
			if (await this.login(loginData)) {
				this.loadState()
			}
		}
	}

	private async addNotesRecursive(parent: Note, notes: any[]) {
		for (const noteData of notes) {
			const note = new Note()
			note.keyName = parent.keyName
			note.changeItem('metadata').title = noteData.title
			note.changeItem('metadata').created = dateTimeNow()
			note.changeItem('metadata').notes = []
			note.changeItem('text').text = noteData.content
			await this.addNotesRecursive(note, noteData.notes)
			await this.client.createNote(note)
			parent.changeItem('metadata').notes.push(note.id)
		}
	}

	public async addGettingStarted(note?: Note) {
		try {
			const json = await fetch(`${env.VITE_MIMER_UPDATE_HOST}/getting-started.json`).then(res => res.json())
			await this.addNotesRecursive(note ?? this._root.note, json.notes)
			if (!note) {
				await this.client.updateNote(this._root.note)
				await this.refreshNote(this._root.note.id)
			}
		} catch (ex) {
			console.log(ex)
		}
	}

	private async ensureCreateComplete() {
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
				const rootNote = new Note()
				rootNote.id = this.client.userData.rootNote
				rootNote.keyName = this.client.getKeyById(this.client.userData.rootKey).name
				rootNote.changeItem('metadata').notes = []
				await this.addGettingStarted(rootNote)
				await this.client.createNote(rootNote)
			}
			this.client.userData.createComplete = true
			await this.client.updateUserData()
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
					const note = await this.client.readNote(this.client.userData.rootNote, true)
					if (note) {
						this.root = new MimerNote(this, undefined, note)
						this.emitStatusUpdated()
					} else {
						this.root = undefined
						this.client.logout()
						this.emitStatusUpdated()
						throw new MimerError('Login Error', 'Failed to read root node')
					}
					if (!this.client.isOnline && !this.workOffline) {
						setTimeout(() => {
							void this.goOnline(data.password)
						}, 1000)
					} else {
						await this.connectForNotifications()
						this.loadShareOffers()
						updateManager.good()
					}
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

	public async goOnline(password?: string) {
		mobileLog.log('Going online')
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
			mobileLog.log('Online')
		} catch (ex) {
			mobileLog.log('Failed to go online ' + ex.message)
		} finally {
			this.endAction()
		}
	}

	public logout() {
		mobileLog.log('Logging out')
		this.root = undefined
		this.client.logout()
		this.emitStatusUpdated()
	}

	public async loadState() {
		const selectedList = persistedState.readSelectedNote()
		const expanded = persistedState.expanded
		await this.root.ensureChildren()

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

		maxIterations = 1000
		while (selectedList.length > 0 && --maxIterations > 0) {
			const note = this.getNoteById(selectedList.pop())
			if (selectedList.length === 0) {
				note?.select()
			}
		}
		this.state.stateLoaded = true
	}

	public async deleteAccount(deleteLocal: boolean) {
		await this.client.deleteAccount(deleteLocal)
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
					})
					connection.onreconnecting(error => {
						console.log('SignalR Reconnecting', error)
					})
					connection.onreconnected(() => {
						console.log('SignalR Reconnected')
						updateManager.check()
						this.loadShareOffers()
					})
					connection.onclose(error => {
						console.log('SignalR Closed', error)
					})
					await connection.start()
				} catch (ex) {
					console.log('Failed to set up for notifications', ex)
				}
			}
		}
	}

	public async changeUserNameAndPassword(username: string, oldPassword: string, newPassword: string) {
		await this.client.changeUserNameAndPassword(username, oldPassword, newPassword)
	}

	public async getShareOffers() {
		return await this.client.getShareOffers()
	}

	public async loadShareOffers() {
		try {
			this.state.shareOffers = await this.client.getShareOffers()
		} catch (ex) {
			console.log(ex)
		}
	}

	public register(id: Guid, note: MimerNote) {
		this.notes[id] = note
	}

	public select(id: Guid) {
		this.state.selectedNoteId = id
		if (!this._isMobile) {
			browserHistory.open(id)
		}
	}

	public closeNote() {
		if (this._isMobile) {
			this.state.noteOpen = false
		}
	}

	public openNote() {
		if (this._isMobile) {
			this.state.noteOpen = true
			browserHistory.open(this.state.selectedNoteId)
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
						throw exi
					}
					parent = reload
				}
			}
			await this.refreshNote(parent.id)
			;(await this.getNoteById(note.id))?.select()
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
				throw err
			}
			await this.refreshNote(note.id)
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
			await this.ensureShareAllowable(mimerNote)
			await this.client.getPublicKey(recipient)

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
			await this.client.shareNote(recipient, sharedKey.name, mimerNote.id, mimerNote.title)
			for (const id of affectedIds) {
				await this.refreshNote(id)
			}
		} finally {
			this.endAction()
		}
	}

	public async acceptShare(share: NoteShareInfo) {
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
				const root = await this.client.readNote(this.root.id)
				if (!root.getItem('metadata').notes.includes(offer.noteId)) {
					root.changeItem('metadata').notes.push(offer.noteId)
				}
				actions.push(await this.client.createUpdateAction(root))

				await this.client.multiAction(actions)

				await this.refreshNote(this.root.id)
				await this.refreshNote(offer.noteId)
				await this.client.deleteShareOffer(offer.id)
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

	public async move(sourceId: Guid, targetId: Guid, mimerNote: MimerNote, index: number, keepKey: boolean) {
		if (!this.client.isOnline) {
			throw new MimerError('Offline', 'Cannot move while offline')
		}
		this.beginAction()
		try {
			const source = await this.client.readNote(sourceId)
			const target = await this.client.readNote(targetId)
			const note = await this.client.readNote(mimerNote.id)
			const actions: NoteAction[] = []
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
			;(await this.getNoteById(mimerNote.id))?.select()
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

	public validatePassword(password: string) {
		return this.client.validatePassword(password)
	}

	public cloneTest() {
		const result = new NoteManager('', '', '')
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
		}
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

	public get simulateOffline() {
		return this.client.simulateOffline
	}

	public set simulateOffline(value: boolean) {
		this.client.simulateOffline = value
	}

	public get testId() {
		return this.client.testId
	}

	public get isLoggedIn() {
		return this.client.isLoggedIn
	}

	public get root() {
		return this._root
	}

	private set root(value: MimerNote) {
		this._root = value
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

	public get maxHistoryEntries() {
		return this.client.maxHistoryEntries
	}
}
