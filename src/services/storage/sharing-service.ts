import { type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ShareResponse } from '../types/responses'

export class SharingService {
	constructor(private getPublicKeyCallback: (keyOwnerName: string, pow: string) => Promise<any>) {}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		console.log('Creating key from note share:', id)
	}

	public async getPublicKey(keyOwnerName: string, pow: string) {
		console.log('Getting public key for:', keyOwnerName, 'with pow:', pow)
		return this.getPublicKeyCallback(keyOwnerName, pow)
	}

	public async shareNote(
		recipient: string,
		keyName: Guid,
		noteId: Guid,
		name: string,
		pow: string,
	): Promise<ShareResponse> {
		console.log('Sharing note:', noteId, 'with recipient:', recipient, 'using key:', keyName)
		return Promise.resolve(undefined)
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
