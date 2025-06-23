import type { Guid } from '../types/guid'

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
}

export interface KeyData {
	id: Guid
	name: Guid
	algorithm: string
	keyData: string
	asymmetricAlgorithm: string
	publicKey: string
	privateKey: string
	metadata: string
}

export interface NoteItem {
	version: number
	type: string
	data: string
}

export interface NoteData {
	id: Guid
	keyName: Guid
	items: NoteItem[]
}
