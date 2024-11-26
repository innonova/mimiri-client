import type { CryptSignature } from '../crypt-signature'
import type { SymmetricCrypt } from '../symmetric-crypt'
import type { Guid } from './guid'

export interface KeySet {
	id: Guid
	name: Guid
	symmetric: SymmetricCrypt
	signature: CryptSignature
	metadata: { shared: boolean }
}
