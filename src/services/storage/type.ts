import type { SymmetricCrypt } from '../symmetric-crypt'
import type { Guid } from '../types/guid'
import type { ClientConfig } from '../types/responses'

export interface LoginData {
	username: string
	password: string
	preferOffline?: boolean
}

export interface UserStats {
	size: number
	noteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export interface SharedState {
	userId: Guid | null
	rootCrypt: SymmetricCrypt | null
	isLoggedIn: boolean
	isOnline: boolean
	clientConfig: ClientConfig
	userStats: UserStats
}

export interface InitializationData {
	password: {
		algorithm: string
		salt: string
		iterations: number
	}
	userCrypt: {
		algorithm: string
		salt: string
		iterations: number
	}
	rootCrypt: {
		algorithm: string
		key: string
	}
	rootSignature: {
		algorithm: string
		publicKey: string
		privateKey: string
	}
	userId: Guid
	userData: string
}

export interface LocalData {
	localCrypt: {
		algorithm: string
		key: string
	}
}

export interface KeyData {
	id: Guid
	userId: Guid
	name: Guid
	algorithm: string
	keyData: string
	asymmetricAlgorithm: string
	publicKey: string
	privateKey: string
	metadata: string
	modified: string
	created: string
	sync: number
}

export interface NoteItem {
	version: number
	type: string
	data: string
	modified: string
	created: string
}

export interface NoteData {
	id: Guid
	keyName: Guid
	items: NoteItem[]
	modified: string
	created: string
	sync: number
}

export interface KeyInfo {
	id: Guid
	name: Guid
	data: string
	modified: string
	created: string
	sync: number
}

export interface NoteInfoItem {
	noteId: Guid
	itemType: string
	version: number
	data: string
	modified: string
	created: string
}

export interface NoteInfo {
	id: Guid
	keyName: Guid
	modified: string
	created: string
	sync: number
	items: NoteInfoItem[]
}

export interface SyncInfo {
	notes: NoteInfo[]
	keys: KeyInfo[]
}
