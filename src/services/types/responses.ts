import type { Guid } from './guid'
import type { NoteItem } from './note'

export interface ClientConfig {
	features: string[]
}

export interface BasicResponse {}

export interface KeyResponse {
	id: Guid
	name: Guid
	algorithm: string
	keyData: string
	asymmetricAlgorithm: string
	publicKey: string
	privateKey: string
	metadata: string
}

export interface AllKeysResponse {
	keys: KeyResponse[]
}

export interface LoginResponse {
	userId: Guid
	publicKey: string
	privateKey: string
	asymmetricAlgorithm: string
	salt: string
	iterations: number
	algorithm: string
	symmetricAlgorithm: string
	symmetricKey: string
	data: string
	config: string
	size: number
	noteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export interface UserDataResponse {
	data: string
	config: string
	size: number
	noteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export interface PreLoginResponse {
	salt: string
	iterations: number
	algorithm: string
	challenge: string
}

export interface PublicKeyResponse {
	asymmetricAlgorithm: string
	publicKey: string
}

export interface ReadNoteResponse {
	id: Guid
	keyName: Guid
	items: Omit<NoteItem, 'changed' | 'isCache'>[]
}

export interface ShareOffer {
	id: Guid
	sender: string
	data: string
}

export interface ShareOffersResponse {
	offers: ShareOffer[]
}

export interface ShareParticipantsResponse {
	participants: { username: string; since: string }[]
}

export interface NotificationUrlResponse {
	url: string
	token: string
}

export interface UrlResponse {
	url: string
}

export interface VersionConflict {
	type: string
	expected: number
	actual: number
}

export interface UpdateNoteResponse {
	success: boolean
	conflicts: VersionConflict[]
	size: number
	noteCount: number
}

export interface CheckUsernameResponse {
	username: string
	available: boolean
	proofAccepted: boolean
	bitsExpected: number
}

export interface ShareResponse {
	code: string
}

export interface BlogPost {
	id: Guid
	title: string
	created: string
	url: string
	published: boolean
	publishDate: string
}

export interface SyncResponse {
	keys: any[]
	notes: any[]
	deletedNotes: Guid[]
	noteCount: number
	size: number
}

export interface SyncPushResponse {
	status: 'success' | 'conflict' | 'no-data' | 'error'
}
