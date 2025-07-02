import type { MimerNote } from '../types/mimer-note'
import { Note } from '../types/note'
import { dateTimeNow } from '../types/date-time'
import { debug, env } from '../../global'
import type { AuthenticationManager } from './authentication-manager'
import type { CryptographyManager } from './cryptography-manager'
import type { NoteService } from './note-service'
import type { NoteOperationsManager } from './note-operations-manager'

export class SessionManager {
	constructor(
		private authManager: AuthenticationManager,
		private cryptoManager: CryptographyManager,
		private noteService: NoteService,
		private operationsManager: NoteOperationsManager,
	) {}

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

	public async isAccountPristine(rootNote: MimerNote, isAnonymous: boolean) {
		if (!isAnonymous) {
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
}
