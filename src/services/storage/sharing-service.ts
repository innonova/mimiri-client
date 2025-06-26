import { CryptSignature } from '../crypt-signature'
import { type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ShareResponse } from '../types/responses'
import type { MimiriClient } from './mimiri-client'

export class SharingService {
	constructor(private api: MimiriClient) {}

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

	public async getShareOffer(code: string): Promise<NoteShareInfo> {
		return this.api.getShareOffer(code)
	}

	public async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		return this.api.getShareParticipants(id)
	}

	public async deleteShareOffer(id: Guid): Promise<void> {
		return this.api.deleteShareOffer(id)
	}
}
