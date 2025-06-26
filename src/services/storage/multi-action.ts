import type { Guid } from '../types/guid'
import { Note } from '../types/note'
import type { NoteAction } from '../types/requests'
import type { NoteService } from './note-service'

export class MultiAction {
	private actions: NoteAction[] = []

	constructor(private noteService: NoteService) {}
	async createNote(note: Note): Promise<void> {
		this.actions.push(await this.noteService.createCreateAction(note))
	}

	async updateNote(note: Note): Promise<void> {
		this.actions.push(await this.noteService.createUpdateAction(note))
	}

	async deleteNote(note: Note): Promise<void> {
		this.actions.push(await this.noteService.createDeleteAction(note))
	}

	async changeNoteKey(noteId: Guid, newKeyName: Guid): Promise<void> {
		this.actions.push(await this.noteService.createChangeKeyAction(noteId, newKeyName))
	}

	async commit(): Promise<Guid[]> {
		if (this.actions.length === 0) {
			throw new Error('No actions to commit')
		}
		return await this.noteService.multiAction(this.actions)
	}
}
