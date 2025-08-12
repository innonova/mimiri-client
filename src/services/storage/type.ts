import type { Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ClientConfig } from '../types/responses'

export interface UserData {
	rootNote: Guid
	rootKey: Guid
	createComplete: boolean
	needsToChooseTier?: boolean
}

export interface LoginData {
	username: string
	password: string
}

export interface UserStats {
	size: number
	noteCount: number
	localSizeDelta: number
	localNoteCountDelta: number
	localSize: number
	localNoteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export enum ActionType {
	Save,
	CreateChild,
	Share,
	Delete,
	Copy,
	Move,
	AcceptShare,
	DeleteShareOffer,
}

export enum ViewMode {
	Content = 'content',
	Properties = 'properties',
}

export enum AccountType {
	None = 'none',
	Local = 'local',
	Cloud = 'cloud',
}

export interface SharedState {
	username: string
	userId: Guid | null
	isLoggedIn: boolean
	isOnline: boolean
	accountType: AccountType
	isAnonymous: boolean
	workOffline: boolean
	serverAuthenticated: boolean
	clientConfig: ClientConfig
	userStats: UserStats
	needsToChooseTier: boolean

	busy: boolean
	busyLong: boolean
	busyLongDelay: number
	spinner: boolean
	noteOpen: boolean
	selectedNoteId?: Guid
	stateLoaded: boolean
	initInProgress: boolean
	viewMode: ViewMode
	shareOffers: NoteShareInfo[]

	isMobile: boolean
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
	token: string
	local?: boolean
}

export interface LocalData {
	localCrypt: {
		algorithm: string
		key: string
	}
}

export interface LocalState {
	firstLogin: boolean
	workOffline: boolean
	sizeDelta: number
	noteCountDelta: number
	size: number
	noteCount: number
}

export interface LocalUserData {
	rootCrypt: {
		algorithm: string
		key: string
	}
	userData: UserData
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
	size: number
}

export interface NoteData {
	id: Guid
	keyName: Guid
	items: NoteItem[]
	modified: string
	created: string
	sync: number
	size: number
	base?: NoteData
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
	size: number
}

export interface NoteInfo {
	id: Guid
	keyName: Guid
	modified: string
	created: string
	sync: number
	size: number
	items: NoteInfoItem[]
}

export interface SyncInfo {
	notes: NoteInfo[]
	keys: KeyInfo[]
	deletedNotes: Guid[]
	noteCount: number
	size: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
}

export class MimerError extends Error {
	constructor(
		public title: string,
		msg: string,
	) {
		super(msg)
	}
}

export interface Limits {
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
	noteSize: number
	noteCount: number
	size: number
}

export class LimitError extends Error {
	constructor(
		msg: string,
		public limits: Limits,
	) {
		super(msg)
	}
}
