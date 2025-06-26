import { type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ShareResponse } from '../types/responses'
import type { MimiriClient } from './mimiri-client'

export class SharingService {
	constructor(private api: MimiriClient) {}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		console.log('Creating key from note share:', id)
	}

	public async getPublicKey(keyOwnerName: string, pow: string) {
		return this.api.getPublicKey(keyOwnerName, pow)
	}

	public async shareNote(
		recipient: string,
		keyName: Guid,
		noteId: Guid,
		name: string,
		pow: string,
	): Promise<ShareResponse> {
		return this.api.shareNote(recipient, keyName, noteId, name, pow)
	}

	public async getShareOffers(): Promise<NoteShareInfo[]> {
		console.log('Getting share offers for user:')
		return Promise.resolve([])
	}

	public async getShareOffer(code: string): Promise<NoteShareInfo> {
		console.log('Getting share offer for code:', code)
		return Promise.resolve(undefined)
	}

	public async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		console.log('Getting share participants for offer:', id)
		return Promise.resolve([])
	}

	public async deleteShareOffer(id: Guid): Promise<void> {
		console.log('Deleting share offer:', id)
		// no-op
	}
}
