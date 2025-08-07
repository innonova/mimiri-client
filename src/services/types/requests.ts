import type { DateTime } from './date-time'
import type { Guid } from './guid'
import type { NoteItem } from './note'

export interface BasicRequest {
	username: string
	signatures: {
		name: string
		signature: string
	}[]
	timestamp: DateTime
	requestId: Guid
}

export interface CreateKeyRequest extends BasicRequest {
	id: Guid
	name: Guid
	algorithm: string
	keyData: string
	asymmetricAlgorithm: string
	publicKey: string
	privateKey: string
	metadata: string
}

export interface CreateUserRequest extends BasicRequest {
	publicKey: string
	privateKey: string
	asymmetricAlgorithm: string
	salt: string
	iterations: number
	algorithm: string
	password: {
		salt: string
		hash: string
		iterations: number
		algorithm: string
	}
	symmetricAlgorithm: string
	symmetricKey: string
	data: string
	pow: string
}

export interface DeleteKeyRequest extends BasicRequest {
	id: Guid
}

export interface DeleteNoteRequest extends BasicRequest {
	id: Guid
}

export interface DeleteShareRequest extends BasicRequest {
	id: Guid
}

export interface LoginRequest {
	username: string
	response: string
	hashLength: number
}

export interface PublicKeyRequest extends BasicRequest {
	pow: string
	keyOwnerName: string
}

export interface ReadKeyRequest extends BasicRequest {
	id: Guid
}

export interface NoteItemVersion {
	type: string
	version: number
}

export interface ReadNoteRequest extends BasicRequest {
	id: Guid
	include: string
	versions?: NoteItemVersion[]
}

export interface ShareNoteRequest extends BasicRequest {
	recipient: string
	keyName: Guid
	data: string
}

export interface UpdateUserDataRequest extends BasicRequest {
	data: string
}

export interface UpdateUserRequest extends BasicRequest {
	oldUsername: string
	response: string
	hashLength: number
	publicKey: string
	privateKey: string
	asymmetricAlgorithm: string
	salt: string
	iterations: number
	algorithm: string
	password: {
		salt: string
		hash: string
		iterations: number
		algorithm: string
	}
	symmetricAlgorithm: string
	symmetricKey: string
	data: string
}

export interface WriteNoteRequest extends BasicRequest {
	keyName: Guid
	oldKeyName?: Guid
	id: Guid
	items: Omit<NoteItem, 'changed' | 'isCache'>[]
}

export interface DeleteAccountRequest extends BasicRequest {
	response: string
	hashLength: number
}

export enum NoteActionType {
	Create = 'create',
	Delete = 'delete',
	Update = 'update',
	Unregister = 'unregister',
}

export interface NoteAction {
	type: NoteActionType
	id: Guid
	keyName: Guid
	oldKeyName?: Guid
	items: Omit<NoteItem, 'changed' | 'isCache'>[]
}

export interface MultiNoteRequest extends BasicRequest {
	actions: NoteAction[]
}

export interface CheckUsernameRequest {
	username: string
	pow: string
	timestamp: DateTime
	requestId: Guid
}

export interface ShareOfferRequest extends BasicRequest {
	code: string
}

export interface ShareParticipantsRequest extends BasicRequest {
	id: Guid
}

export interface AddCommentRequest extends BasicRequest {
	postId: Guid
	displayName: string
	comment: string
}

export interface SyncRequest extends BasicRequest {
	noteSince: number
	keySince: number
}

export interface NoteSyncItem {
	type: string
	data: string
	version: number
}

export interface NoteSyncAction {
	id: Guid
	keyName: Guid
	type: 'create' | 'update' | 'delete'
	items: NoteSyncItem[]
}

export interface KeySyncAction {
	id: Guid
	name: Guid
	type: 'create' | 'delete'
	data: string
}

export interface SyncPushRequest extends BasicRequest {
	notes: NoteSyncAction[]
	keys: KeySyncAction[]
	syncId: string
}
