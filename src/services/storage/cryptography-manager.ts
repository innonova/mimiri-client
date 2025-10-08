import { CryptSignature } from '../crypt-signature'
import { SymmetricCrypt } from '../symmetric-crypt'
import { newGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import type { KeyData, SharedState } from './type'
import type { MimiriDb } from './mimiri-db'
import { fromBase64 } from '../hex-base64'
import type { NoteShareInfo } from '../types/note-share-info'

export class CryptographyManager {
	private _rootCrypt: SymmetricCrypt
	private _localCrypt: SymmetricCrypt
	private _keys: KeySet[] = []

	constructor(
		private db: MimiriDb,
		private state: SharedState,
	) {}

	public async ensureLocalCrypt(): Promise<void> {
		let localData = await this.db.getLocalData()
		if (!localData) {
			this._localCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			localData = {
				localCrypt: {
					algorithm: this._localCrypt.algorithm,
					key: await this._rootCrypt.encryptBytes(await this._localCrypt.getKey()),
				},
			}
			await this.db.setLocalData(localData)
		} else {
			this._localCrypt = await SymmetricCrypt.fromKey(
				localData.localCrypt.algorithm,
				await this._rootCrypt.decryptBytes(localData.localCrypt.key),
			)
		}
	}

	public async reencryptLocalCrypt(): Promise<void> {
		const localData = await this.db.getLocalData()
		if (!localData) {
			throw new Error('Local data not found, cannot re-encrypt local crypt.')
		}
		localData.localCrypt = {
			algorithm: this._localCrypt.algorithm,
			key: await this._rootCrypt.encryptBytes(await this._localCrypt.getKey()),
		}
		await this.db.setLocalData(localData)
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

	public async tryDecryptNoteItemText(item: { data: string; type: string }, crypt: SymmetricCrypt): Promise<string> {
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

	public async tryReencryptNoteItemDataToLocal(
		item: { data: string; type: string },
		oldKeyName: Guid,
	): Promise<string> {
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

	public async tryReencryptNoteItemDataFromLocal(
		item: { data: string; type: string },
		newKeyName: Guid,
	): Promise<string> {
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
		return this.db.syncLock.withLock('loadAllKeys', async () => {
			await this.loadAllKeysNoLock()
		})
	}

	public async loadAllKeysNoLock(): Promise<void> {
		const localKeys = await this.db.getAllLocalKeys()
		const remoteKeys = await this.db.getAllKeys()
		const keys = []
		await this.loadKeysFromSource(localKeys, this._localCrypt, keys)
		await this.loadKeysFromSource(remoteKeys, this._rootCrypt, keys)
		this._keys = keys
	}

	private async loadKeysFromSource(keyDataArray: KeyData[], crypt: SymmetricCrypt, keys: KeySet[]): Promise<void> {
		for (const keyData of keyDataArray) {
			if (!keys.some(key => key.id === keyData.id)) {
				try {
					const sym = await SymmetricCrypt.fromKey(keyData.algorithm, await crypt.decryptBytes(keyData.keyData))
					const signer = await CryptSignature.fromPem(
						keyData.asymmetricAlgorithm,
						keyData.publicKey,
						await crypt.decrypt(keyData.privateKey),
					)
					keys.push({
						id: keyData.id,
						name: keyData.name,
						symmetric: sym,
						signature: signer,
						metadata: JSON.parse(await crypt.decrypt(keyData.metadata)),
					})
					// console.log(`Key ${keyData.name} loaded successfully`)
				} catch (ex) {
					console.error('Error loading key:', keyData, await crypt.decryptBytes(keyData.keyData))
				}
			}
		}
	}

	private async loadKeyById(id: Guid): Promise<KeySet | undefined> {
		let local = true
		let keyData = await this.db.getLocalKey(id)
		if (!keyData) {
			local = false
			keyData = await this.db.getKey(id)
		}
		if (!keyData) {
			return undefined
		}

		const crypt = local ? this._localCrypt : this._rootCrypt

		const sym = await SymmetricCrypt.fromKey(keyData.algorithm, await crypt.decryptBytes(keyData.keyData))
		const signer = await CryptSignature.fromPem(
			keyData.asymmetricAlgorithm,
			keyData.publicKey,
			await crypt.decrypt(keyData.privateKey),
		)
		const keySet = {
			id: keyData.id,
			name: keyData.name,
			symmetric: sym,
			signature: signer,
			metadata: JSON.parse(await crypt.decrypt(keyData.metadata)),
		}
		this._keys.push(keySet)
		return keySet
	}

	public async createKey(id: Guid, metadata: any): Promise<void> {
		return this.db.syncLock.withLock('createKey', async () => {
			const sym = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			const signer = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

			const keyData: KeyData = {
				id,
				userId: this.state.userId,
				name: newGuid(),
				algorithm: sym.algorithm,
				asymmetricAlgorithm: signer.algorithm,
				keyData: await this._localCrypt.encryptBytes(await sym.getKey()),
				publicKey: await signer.publicKeyPem(),
				privateKey: await this._localCrypt.encrypt(await signer.privateKeyPem()),
				metadata: await this._localCrypt.encrypt(JSON.stringify(metadata)),
				sync: 0,
				modified: new Date().toISOString(),
				created: new Date().toISOString(),
			}
			await this.db.setLocalKey(keyData)
			await this.loadKeyById(id)
		})
	}

	public async createKeyFromNoteShare(
		id: Guid,
		share: NoteShareInfo,
		metadata: any,
	): Promise<{ keyData: KeyData; signer: CryptSignature }> {
		// return this.db.syncLock.withLock('createKeyFromNoteShare', async () => {
		const signer = await CryptSignature.fromPem(
			CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
			share.publicKey,
			share.privateKey,
		)
		const keyData: KeyData = {
			id,
			userId: this.state.userId,
			name: share.keyName,
			algorithm: share.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this._rootCrypt.encryptBytes(await fromBase64(share.keyData)),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this._rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this._rootCrypt.encrypt(JSON.stringify(metadata)),
			sync: 0,
			modified: new Date().toISOString(),
			created: new Date().toISOString(),
		}
		return {
			keyData,
			signer,
		}
		// 	await this.db.setLocalKey(keyData)
		// 	await this.loadKeyById(id)
		// })
	}

	public async deleteKey(name: Guid): Promise<void> {
		return this.db.syncLock.withLock('deleteKey', async () => {
			const key = this.getKeyByName(name)
			if (key) {
				await this.db.deleteRemoteKey(key.id)
				this._keys = this._keys.filter(k => k !== key)
			}
		})
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

	public get rootCrypt(): SymmetricCrypt {
		return this._rootCrypt
	}

	public set rootCrypt(crypt: SymmetricCrypt) {
		this._rootCrypt = crypt
	}
}
