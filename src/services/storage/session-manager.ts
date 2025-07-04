import { MimerNote } from '../types/mimer-note'
import { Note } from '../types/note'
import { dateTimeNow } from '../types/date-time'
import { browserHistory, debug, env, ipcClient, updateManager } from '../../global'
import type { AuthenticationManager } from './authentication-manager'
import type { CryptographyManager } from './cryptography-manager'
import type { NoteService } from './note-service'
import type { NoteOperationsManager } from './note-operations-manager'
import { AccountType, MimerError, type SharedState } from './type'
import type { SynchronizationService } from './synchronization-service'
import { Capacitor } from '@capacitor/core'
import type { UIStateManager } from './ui-state-manager'
import type { NoteTreeManager } from './note-tree-manager'
import type { MimiriClient } from './mimiri-client'

export interface LoginListener {
	login()
	logout()
	online()
}

export class SessionManager {
	private _listener: LoginListener
	constructor(
		private state: SharedState,
		private authManager: AuthenticationManager,
		private cryptoManager: CryptographyManager,
		private noteService: NoteService,
		private operationsManager: NoteOperationsManager,
		private syncService: SynchronizationService,
		private uiManager: UIStateManager,
		private treeManager: NoteTreeManager,
		private api: MimiriClient,
	) {}

	public registerListener(listener: LoginListener) {
		this._listener = listener
	}

	public async ensureCreateComplete() {
		try {
			if (!this.authManager.userData.createComplete) {
				if (!this.cryptoManager.getKeyById(this.authManager.userData.rootKey)) {
					const keyMetadata = {
						shared: false,
						root: true,
					}
					await this.cryptoManager.createKey(this.authManager.userData.rootKey, keyMetadata)
				}
				let rootNote
				try {
					rootNote = await this.noteService.readNote(this.authManager.userData.rootNote)
				} catch {}
				if (!rootNote) {
					const recycleBin = new Note()
					recycleBin.keyName = this.cryptoManager.getKeyById(this.authManager.userData.rootKey).name
					recycleBin.changeItem('metadata').notes = []
					recycleBin.changeItem('metadata').isRecycleBin = true
					await this.operationsManager.createNote(recycleBin)
					const controlPanel = new Note()
					controlPanel.keyName = this.cryptoManager.getKeyById(this.authManager.userData.rootKey).name
					controlPanel.changeItem('metadata').notes = []
					controlPanel.changeItem('metadata').isControlPanel = true
					await this.operationsManager.createNote(controlPanel)
					const rootNote = new Note()
					rootNote.id = this.authManager.userData.rootNote
					rootNote.keyName = this.cryptoManager.getKeyById(this.authManager.userData.rootKey).name
					rootNote.changeItem('metadata').recycleBin = recycleBin.id
					rootNote.changeItem('metadata').controlPanel = controlPanel.id
					rootNote.changeItem('metadata').notes = [controlPanel.id, recycleBin.id]
					await this.addGettingStarted(rootNote)
					await this.operationsManager.createNote(rootNote)
				}
				this.authManager.userData.createComplete = true
				await this.authManager.updateUserData()
			}
			await this.ensureControlPanel()
			await this.ensureRecycleBin()
		} catch (ex) {
			debug.logError('Failed to ensure notes structure', ex)
		}
	}

	private async ensureRecycleBin() {
		const root = await this.noteService.readNote(this.authManager.userData.rootNote)
		if (!root.getItem('metadata').recycleBin) {
			const recycleBin = new Note()
			recycleBin.keyName = root.keyName
			recycleBin.changeItem('metadata').title = 'Recycle Bin'
			recycleBin.changeItem('metadata').notes = []
			recycleBin.changeItem('metadata').isRecycleBin = true
			await this.operationsManager.createNote(recycleBin)
			root.changeItem('metadata').recycleBin = recycleBin.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [recycleBin.id, ...rootChildren]
			await this.operationsManager.writeNote(root)
		}
	}

	private async ensureControlPanel() {
		const root = await this.noteService.readNote(this.authManager.userData.rootNote)
		if (!root.getItem('metadata').controlPanel) {
			const controlPanel = new Note()
			controlPanel.keyName = root.keyName
			controlPanel.changeItem('metadata').title = 'System'
			controlPanel.changeItem('metadata').notes = []
			controlPanel.changeItem('metadata').isControlPanel = true
			await this.operationsManager.createNote(controlPanel)
			root.changeItem('metadata').controlPanel = controlPanel.id
			const rootChildren = root.changeItem('metadata').notes
			root.changeItem('metadata').notes = [controlPanel.id, ...rootChildren]
			await this.operationsManager.writeNote(root)
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
			await this.operationsManager.createNote(note)
			parent.changeItem('metadata').notes.push(note.id)
		}
	}

	public async addGettingStarted(note?: Note) {
		try {
			const json = await fetch(`${env.VITE_MIMER_UPDATE_HOST}/getting-started.json`).then(res => res.json())
			await this.addGettingStartedNotesRecursive(
				note ?? (await this.noteService.readNote(this.authManager.userData.rootNote)),
				json.notes,
			)
			if (!note) {
				await this.operationsManager.writeNote(await this.noteService.readNote(this.authManager.userData.rootNote))
			}
		} catch (ex) {
			debug.log('Failed to load getting started notes', ex)
		}
	}

	public async isAccountPristine(rootNote: MimerNote) {
		if (this.state.isAnonymous) {
			return false
		}
		const userNotes = rootNote.children.filter(child => !child.isSystem)
		if (userNotes.length !== 1) {
			return false
		}
		if (!(await this.isNotePristine(userNotes[0]))) {
			return false
		}
		return true
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
				this.state.noteOpen = !this.state.isMobile
				browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
				await this.ensureCreateComplete()
				await this.loadRootNote()
				await this.treeManager.loadState()
				updateManager.good()
			} else {
				await this.logout()
			}
		} finally {
			this.state.initInProgress = false
		}
	}

	public async login(username: string, password: string): Promise<boolean> {
		this.uiManager.beginAction(10000)
		this.state.noteOpen = !this.state.isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		try {
			if (await this.authManager.login(username, password)) {
				await this.cryptoManager.ensureLocalCrypt()
				await this.syncService.initialSync()
				await this.cryptoManager.loadAllKeys()
				await this.syncService.sync()
				await this.ensureCreateComplete()
				await this.loadRootNote()
				await this.treeManager.loadState()
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
		this.state.noteOpen = !this.state.isMobile
		browserHistory.openTree(ipcClient.isAvailable && Capacitor.getPlatform() === 'web')
		try {
			await this.authManager.openLocal()
			await this.cryptoManager.ensureLocalCrypt()
			await this.cryptoManager.loadAllKeys()
			if (this.state.isLoggedIn) {
				await this.ensureCreateComplete()
				await this.loadRootNote()
				await this.treeManager.loadState()
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

	public async updateUserStats() {
		this.uiManager.beginAction()
		try {
			await this.authManager.goOnline()
		} finally {
			this.uiManager.endAction()
		}
	}

	private async loadRootNote() {
		await this.treeManager.ensureRoot()
		if (this.treeManager.root) {
			if (this.treeManager.root.note.getItem('metadata').controlPanel) {
				await this.ensureCreateComplete()
			}
			if (this.treeManager.root.note.getItem('metadata').recycleBin) {
				await this.ensureCreateComplete()
			}
		} else {
			await this.logout()
			throw new MimerError('Login Error', 'Failed to read root node')
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
		this.treeManager.logout()
	}
}
