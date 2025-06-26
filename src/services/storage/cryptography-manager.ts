import { CryptSignature } from '../crypt-signature'
import { SymmetricCrypt } from '../symmetric-crypt'
import { newGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import type { KeyData, SharedState } from './type'
import type { MimiriDb } from './mimiri-browser-db'

export class CryptographyManager {
	private _localCrypt: SymmetricCrypt
	private _keys: KeySet[] = []

	constructor(
		private db: MimiriDb,
		private sharedState: SharedState,
	) {}

	public async ensureLocalCrypt(): Promise<void> {
		let localData = await this.db.getLocalData()
		if (!localData) {
			this._localCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			localData = {
				localCrypt: {
					algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
					key: await this.sharedState.rootCrypt.encryptBytes(await this._localCrypt.getKey()),
				},
			}
			await this.db.setLocalData(localData)
		} else {
			this._localCrypt = await SymmetricCrypt.fromKey(
				localData.localCrypt.algorithm,
				await this.sharedState.rootCrypt.decryptBytes(localData.localCrypt.key),
			)
		}
	}

	public async tryDecryptNoteItemObject(item: { data: string; type: string }, crypt: SymmetricCrypt): Promise<any> {
		try {
			return JSON.parse(await crypt.decrypt(item.data))
		} catch (ex) {
			console.error('Decryption failed:', ex)
			if (item.type === 'metadata') {
				return {
					title: '[MISSING]',
					notes: [],
				}
			}
			return {}
		}
	}

	public async tryDecryptNoteItemText(item: { data: string; type: string }, crypt: SymmetricCrypt): Promise<any> {
		try {
			return await crypt.decrypt(item.data)
		} catch (ex) {
			console.error('Decryption failed:', ex)
			if (item.type === 'metadata') {
				return JSON.stringify({
					title: '[MISSING]',
					notes: [],
				})
			}
			return JSON.stringify({})
		}
	}

	public async tryReencryptNoteItemDataToLocal(item: { data: string; type: string }, oldKeyName: Guid): Promise<any> {
		try {
			const oldKey = await this.getKeyByName(oldKeyName)
			return await this._localCrypt.encrypt(await oldKey.symmetric.decrypt(item.data))
		} catch (ex) {
			console.error('Re-encryption failed:', ex)
			if (item.type === 'metadata') {
				return await this._localCrypt.encrypt(
					JSON.stringify({
						title: '[MISSING]',
						notes: [],
					}),
				)
			}
			return await this._localCrypt.encrypt(JSON.stringify({}))
		}
	}

	public async tryReencryptNoteItemDataFromLocal(item: { data: string; type: string }, newKeyName: Guid): Promise<any> {
		const newKey = await this.getKeyByName(newKeyName)
		try {
			return await newKey.symmetric.encrypt(await this._localCrypt.decrypt(item.data))
		} catch (ex) {
			console.error('Re-encryption failed:', ex)
			if (item.type === 'metadata') {
				return await newKey.symmetric.encrypt(
					JSON.stringify({
						title: '[MISSING]',
						notes: [],
					}),
				)
			}
			return await newKey.symmetric.encrypt(JSON.stringify({}))
		}
	}

	public async loadAllKeys(): Promise<void> {
		const localKeys = await this.db.getAllLocalKeys()
		const removeKeys = await this.db.getAllKeys()
		this._keys = []
		for (const keyData of [...localKeys, ...removeKeys]) {
			if (!this._keys.some(key => key.id === keyData.id)) {
				const sym = await SymmetricCrypt.fromKey(
					keyData.algorithm,
					await this.sharedState.rootCrypt.decryptBytes(keyData.keyData),
				)
				const signer = await CryptSignature.fromPem(
					keyData.asymmetricAlgorithm,
					keyData.publicKey,
					await this.sharedState.rootCrypt.decrypt(keyData.privateKey),
				)
				this._keys.push({
					id: keyData.id,
					name: keyData.name,
					symmetric: sym,
					signature: signer,
					metadata: JSON.parse(await this.sharedState.rootCrypt.decrypt(keyData.metadata)),
				})
			}
		}
	}

	public async loadKeyById(id: Guid): Promise<KeySet | undefined> {
		let keyData = await this.db.getLocalKey(id)
		if (!keyData) {
			keyData = await this.db.getKey(id)
		}
		if (!keyData) {
			return undefined
		}
		const sym = await SymmetricCrypt.fromKey(
			keyData.algorithm,
			await this.sharedState.rootCrypt.decryptBytes(keyData.keyData),
		)
		const signer = await CryptSignature.fromPem(
			keyData.asymmetricAlgorithm,
			keyData.publicKey,
			await this.sharedState.rootCrypt.decrypt(keyData.privateKey),
		)
		const keySet = {
			id: keyData.id,
			name: keyData.name,
			symmetric: sym,
			signature: signer,
			metadata: JSON.parse(await this.sharedState.rootCrypt.decrypt(keyData.metadata)),
		}
		this._keys.push(keySet)
		return keySet
	}

	public async createKey(id: Guid, metadata: any): Promise<void> {
		console.log('Creating key:', id)

		const sym = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
		const signer = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

		const keyData: KeyData = {
			id,
			userId: this.sharedState.userId,
			name: newGuid(),
			algorithm: sym.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this.sharedState.rootCrypt.encryptBytes(await sym.getKey()),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this.sharedState.rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this.sharedState.rootCrypt.encrypt(JSON.stringify(metadata)),
			sync: 0,
			modified: new Date().toISOString(),
			created: new Date().toISOString(),
		}
		await this.db.setLocalKey(keyData)
		await this.loadKeyById(id)
	}

	public getKeyByName(name: Guid): KeySet {
		return this._keys.find(key => key.name === name) || undefined
	}

	public getKeyById(id: Guid): KeySet {
		return this._keys.find(key => key.id === id) || undefined
	}

	public clearKeys(): void {
		this._keys = []
	}

	public get localCrypt(): SymmetricCrypt {
		return this._localCrypt
	}
}
