import type { DateTime } from './date-time'
import type { Guid } from './guid'

export interface NoteShareInfo {
	id: Guid
	created: DateTime
	sender: string
	name: string
	noteId: Guid
	keyName: Guid
	algorithm: string
	keyData: string
	asymmetricAlgorithm: string
	publicKey: string
	privateKey: string
	error?: Error
}
