import { CryptSignature } from './crypt-signature'
import type { KeySet } from './types/key-set'
import { Note } from './types/note'
import { passwordHasher } from './password-hasher'
import { SymmetricCrypt } from './symmetric-crypt'
import { newGuid, type Guid } from './types/guid'
import type {
	AllKeysResponse,
	BasicResponse,
	CheckUsernameResponse,
	KeyResponse,
	LoginResponse,
	NotificationUrlResponse,
	PreLoginResponse,
	PublicKeyResponse,
	ReadNoteResponse,
	ShareOffersResponse,
	UpdateNoteResponse,
	VersionConflict,
} from './types/responses'
import {
	NoteActionType,
	type BasicRequest,
	type CheckUsernameRequest,
	type CreateKeyRequest,
	type CreateUserRequest,
	type DeleteKeyRequest,
	type DeleteNoteRequest,
	type DeleteShareRequest,
	type LoginRequest,
	type MultiNoteRequest,
	type NoteAction,
	type PublicKeyRequest,
	type ReadKeyRequest,
	type ReadNoteRequest,
	type ShareNoteRequest,
	type UpdateUserDataRequest,
	type UpdateUserRequest,
	type WriteNoteRequest,
} from './types/requests'
import { dateTimeNow } from './types/date-time'
import { fromBase64, toBase64, toHex } from './hex-base64'
import type { NoteShareInfo } from './types/note-share-info'
import type { ICacheManager } from './types/cache-manager'
import { env, ipcClient } from '../global'
import { mimiriPlatform } from './mimiri-platform'

export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;1024'

export interface LoginData {
	username: string
	password?: string
	preferOffline?: boolean
	passwordHash?: string
	userKey?: string
	userKeyAlgorithm?: string
}

export class HttpRequestError extends Error {
	constructor(
		msg: string,
		public statusCode: number,
	) {
		super(msg)
		Object.setPrototypeOf(this, HttpRequestError.prototype)
	}
}

export class PossibleConversionError extends Error {
	constructor() {
		super('Possible Conversion Exists')
		Object.setPrototypeOf(this, PossibleConversionError.prototype)
	}
}

export class VersionConflictError extends Error {
	constructor(public conflicts: VersionConflict[]) {
		super('Version Conflict')
		Object.setPrototypeOf(this, VersionConflictError.prototype)
	}
}

export class MimerClient {
	public static DEFAULT_ITERATIONS = 1000000
	public suppressErrorLog = false
	private _testId: string
	private _username: string
	private _userId: Guid
	private userCrypt: SymmetricCrypt
	private rootCrypt: SymmetricCrypt
	private rootSignature: CryptSignature
	private serverSignature: CryptSignature
	private _userData: any
	private keyChain: KeySet[] = []
	private passwordHash: string
	private loginResponse: LoginResponse
	private preLoginResponse: PreLoginResponse
	private cacheManager: ICacheManager
	private online: boolean = false
	private _workOffline: boolean = false
	private _simulateOffline: boolean = false
	private _sizeDelta = 0
	private _noteCountDelta = 0

	constructor(
		private host: string,
		private serverKey: string,
		private serverKeyId: string,
	) {
		if (serverKey) {
			CryptSignature.fromPem('RSA;3072', serverKey).then(sig => (this.serverSignature = sig))
		}
	}

	private getKey(name: Guid) {
		return this.keyChain.find(key => key.name == name)
	}

	private hasKey(name: Guid) {
		return !!this.keyChain.find(key => key.name == name)
	}

	private setKey(name: Guid, keySet: KeySet) {
		const index = this.keyChain.findIndex(key => key.name == name)
		if (index >= 0) {
			this.keyChain[index] = keySet
		} else {
			this.keyChain.push(keySet)
		}
	}

	private async get<T>(path: string): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		// console.log('GET', `${this.host}${path}`, window.location.origin)
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
		})
		if (response.status !== 200) {
			throw new HttpRequestError(`Get of ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	private async post<T>(path: string, data: any, encrypt: boolean = false): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		let body = data
		if (encrypt && this.serverSignature) {
			body = {
				keyId: this.serverKeyId,
				data: await this.serverSignature.encrypt(JSON.stringify(data)),
			}
		}
		// console.log('POST', `${this.host}${path}`, data)
		const response = await fetch(`${this.host}${path}`, {
			method: 'POST',
			body: JSON.stringify(body),
		})
		if (response.status !== 200) {
			throw new HttpRequestError(`Post to ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	public async beginTest(name: string) {
		this.testId = `${dateTimeNow().replace(/\:|\./g, '-')}-${name}`
		this.host = `http://localhost:5292/api/test/${this.testId}`
		if (this.cacheManager) {
			console.log('begin test set cachemanger test id')
			await this.cacheManager.setTestId(this.testId)
		}
		console.log('begin test', this.testId)
		await this.get<BasicResponse>('/begin')
	}

	public async endTest(keepLogs: boolean) {
		if (this.cacheManager) {
			this.cacheManager.tearDown(keepLogs)
		}
		await this.get<BasicResponse>(`/end/${keepLogs}`)
	}

	public async getPersistedLogin() {
		if (mimiriPlatform.isIos || mimiriPlatform.isAndroid) {
			if (!mimiriPlatform.supportsBiometry) {
				return undefined
			}
			if (!(await mimiriPlatform.verifyBiometry())) {
				return undefined
			}
		}
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			return ipcClient.session.get('mimiri-login-data')
		} else {
			const loginData = sessionStorage.getItem('mimiri-login-data')
			if (loginData) {
				return JSON.parse(loginData)
			}
		}
		return undefined
	}

	public async persistLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIos || mimiriPlatform.isAndroid) && mimiriPlatform.supportsBiometry)
		) {
			const loginData: LoginData = {
				username: this.username,
				passwordHash: this.passwordHash,
				userKey: await this.userCrypt.getKeyString(),
				userKeyAlgorithm: this.userCrypt.algorithm,
			}

			if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
				await ipcClient.session.set('mimiri-login-data', loginData)
			} else {
				sessionStorage.setItem('mimiri-login-data', JSON.stringify(loginData))
			}
		}
	}

	public async login(data: LoginData) {
		if (this.rootCrypt) {
			throw new Error('Already logged in')
		}
		if (!data.preferOffline) {
			data.preferOffline = false
		}
		try {
			this.username = data.username
			this.loginResponse = undefined
			this.preLoginResponse = undefined
			if (data.preferOffline && this.cacheManager) {
				this.loginResponse = await this.cacheManager.getUser(data.username)
				this.preLoginResponse = await this.cacheManager.getPreLogin(data.username)
				if (!this.loginResponse?.userId) {
					this.loginResponse = undefined
					this.preLoginResponse = undefined
				}
				if (this.preLoginResponse) {
					if (data.password) {
						this.passwordHash = await passwordHasher.hashPassword(
							data.password,
							this.preLoginResponse.salt,
							this.preLoginResponse.algorithm,
							this.preLoginResponse.iterations,
						)
					} else if (data.passwordHash) {
						this.passwordHash = data.passwordHash
					} else {
						throw new Error('Must provide either password or passwordHash')
					}
				}
				this.online = false
			}

			if (!this.loginResponse || !this.preLoginResponse) {
				try {
					this.preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${data.username}`)
				} catch (exi) {
					throw exi
				}

				if (data.password) {
					this.passwordHash = await passwordHasher.hashPassword(
						data.password,
						this.preLoginResponse.salt,
						this.preLoginResponse.algorithm,
						this.preLoginResponse.iterations,
					)
				} else if (data.passwordHash) {
					this.passwordHash = data.passwordHash
				} else {
					throw new Error('Must provide either password or passwordHash')
				}

				const loginRequest: LoginRequest = {
					username: data.username,
					response: await passwordHasher.computeResponse(this.passwordHash, this.preLoginResponse.challenge),
					hashLength: this.passwordHash.length / 2,
				}

				this.loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)

				if (this.cacheManager != null) {
					await this.cacheManager.setUser(data.username, this.loginResponse, this.preLoginResponse)
				}
				this.online = true
			}
			this._userId = this.loginResponse.userId
			if (data.password) {
				this.userCrypt = await SymmetricCrypt.fromPassword(
					this.loginResponse.algorithm,
					data.password,
					this.loginResponse.salt,
					this.loginResponse.iterations,
				)
			} else if (data.userKey && data.userKeyAlgorithm) {
				this.userCrypt = await SymmetricCrypt.fromKey(data.userKeyAlgorithm, fromBase64(data.userKey))
			} else {
				throw new Error('Must provide either password or userKey and userKeyAlgorithm')
			}
			this.rootCrypt = await SymmetricCrypt.fromKey(
				this.loginResponse.symmetricAlgorithm,
				await this.userCrypt.decryptBytes(this.loginResponse.symmetricKey),
			)
			this.rootSignature = await CryptSignature.fromPem(
				this.loginResponse.asymmetricAlgorithm,
				this.loginResponse.publicKey,
				await this.userCrypt.decrypt(this.loginResponse.privateKey),
			)
			this.userData = JSON.parse(await this.rootCrypt.decrypt(this.loginResponse.data))

			this._sizeDelta = 0
			this._noteCountDelta = 0
			await this.loadAllKeys(data.preferOffline)
			await this.persistLogin()
			return true
		} catch (ex) {
			if (ex instanceof PossibleConversionError) {
				throw ex
			}
			if (!this.suppressErrorLog) {
				console.log(ex)
			}
			return false
		}
	}

	public async goOnline(password?: string) {
		if (!this.online && this.username && this.passwordHash && this.userCrypt) {
			const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.username}`)
			if (
				password &&
				(preLoginResponse.salt !== this.preLoginResponse.salt ||
					preLoginResponse.algorithm !== this.preLoginResponse.algorithm ||
					preLoginResponse.iterations !== this.preLoginResponse.iterations)
			) {
				this.passwordHash = await passwordHasher.hashPassword(
					password,
					preLoginResponse.salt,
					preLoginResponse.algorithm,
					preLoginResponse.iterations,
				)
			}
			this.preLoginResponse = preLoginResponse

			const loginRequest: LoginRequest = {
				username: this.username,
				response: await passwordHasher.computeResponse(this.passwordHash, this.preLoginResponse.challenge),
				hashLength: this.passwordHash.length / 2,
			}

			this.loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)

			if (this.cacheManager != null) {
				await this.cacheManager.setUser(this.username, this.loginResponse, this.preLoginResponse)
			}

			this.rootCrypt = await SymmetricCrypt.fromKey(
				this.loginResponse.symmetricAlgorithm,
				await this.userCrypt.decryptBytes(this.loginResponse.symmetricKey),
			)
			this.rootSignature = await CryptSignature.fromPem(
				this.loginResponse.asymmetricAlgorithm,
				this.loginResponse.publicKey,
				await this.userCrypt.decrypt(this.loginResponse.privateKey),
			)
			this.userData = JSON.parse(await this.rootCrypt.decrypt(this.loginResponse.data))
			this._userId = this.loginResponse.userId
			await this.loadAllKeys()
			this.online = true
			return true
		}
		return false
	}

	public async deleteAccount(deleteLocal: boolean) {
		const request: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature!.sign('user', request)
		await this.post<BasicResponse>('/user/delete', request)
		this.online = false
		if (deleteLocal && this.cacheManager) {
			this.cacheManager.deleteUser(this.username)
		}
	}

	public logout() {
		this.rootCrypt = undefined
		this.rootSignature = undefined
		this.userCrypt = undefined
		this.keyChain = []
		this.preLoginResponse = undefined
		this.loginResponse = undefined
		this.passwordHash = undefined
		this.username = undefined
		this.userData = undefined
		this.online = false
		this.workOffline = false
		sessionStorage.removeItem('mimiri-login-data')
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			ipcClient.session.set('mimiri-login-data', undefined)
		}
	}

	public async checkUsername(username: string, pow: string) {
		const request: CheckUsernameRequest = {
			username,
			pow,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
		}
		return await this.post<CheckUsernameResponse>('/user/available', request)
	}

	public async createUser(username: string, password: string, userData: any, pow: string, iterations: number) {
		if (this.rootCrypt) {
			throw new Error('Already logged in')
		}
		try {
			this.username = username
			this.userData = userData
			this.rootCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			this.rootSignature = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

			const passwordAlgorithm = DEFAULT_PASSWORD_ALGORITHM
			const passwordIterations = iterations
			const passwordSalt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))
			this.passwordHash = await passwordHasher.hashPassword(
				password,
				passwordSalt,
				passwordAlgorithm,
				passwordIterations,
			)

			const salt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))

			this.userCrypt = await SymmetricCrypt.fromPassword(
				SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				password,
				salt,
				iterations,
			)

			const request: CreateUserRequest = {
				username,
				iterations,
				salt,
				algorithm: this.userCrypt.algorithm,
				asymmetricAlgorithm: this.rootSignature.algorithm,
				publicKey: await this.rootSignature.publicKeyPem(),
				privateKey: await this.userCrypt.encrypt(await this.rootSignature.privateKeyPem()),
				password: {
					algorithm: passwordAlgorithm,
					iterations: passwordIterations,
					salt: passwordSalt,
					hash: this.passwordHash,
				},
				symmetricAlgorithm: this.rootCrypt.algorithm,
				symmetricKey: await this.userCrypt.encryptBytes(await this.rootCrypt.getKey()),
				data: await this.rootCrypt.encrypt(JSON.stringify(this.userData)),
				pow,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				signatures: [],
			}
			await this.rootSignature.sign('user', request)
			await this.post<BasicResponse>('/user/create', request, true)
			this.logout()
			await this.login({ username, password })
		} catch (ex) {
			this.logout()
			throw ex
		}
	}

	public async updateUser(username: string, password: string, userData: any, iterations: number) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}

		const passwordAlgorithm = DEFAULT_PASSWORD_ALGORITHM
		const passwordIterations = iterations
		const passwordSalt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))
		this.passwordHash = await passwordHasher.hashPassword(password, passwordSalt, passwordAlgorithm, passwordIterations)

		const salt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))

		const userCrypt = await SymmetricCrypt.fromPassword(
			this.loginResponse?.algorithm ?? SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
			password,
			salt,
			iterations,
		)

		const request: UpdateUserRequest = {
			oldUsername: this.username,
			username,
			iterations,
			salt,
			algorithm: userCrypt.algorithm,
			asymmetricAlgorithm: this.rootSignature.algorithm,
			publicKey: await this.rootSignature.publicKeyPem(),
			privateKey: await userCrypt.encrypt(await this.rootSignature.privateKeyPem()),
			password: {
				algorithm: passwordAlgorithm,
				iterations: passwordIterations,
				salt: passwordSalt,
				hash: this.passwordHash,
			},
			symmetricAlgorithm: this.rootCrypt.algorithm,
			symmetricKey: await userCrypt.encryptBytes(await this.rootCrypt.getKey()),
			data: await this.rootCrypt.encrypt(JSON.stringify(userData)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await this.rootSignature.sign('old-user', request)
		await this.post<BasicResponse>('/user/update', request, true)
		this.userCrypt = userCrypt
		this.username = username
		this.userData = userData
		if (this.cacheManager != null) {
			await this.cacheManager.deleteUser(this.username)
		}
		this.logout()
		await this.login({ username, password })
	}

	public async validatePassword(password: string) {
		if (!this.preLoginResponse) {
			return false
		}
		const passwordHash = await passwordHasher.hashPassword(
			password,
			this.preLoginResponse.salt,
			this.preLoginResponse.algorithm,
			this.preLoginResponse.iterations,
		)
		return this.passwordHash === passwordHash
	}

	public async changeUserNameAndPassword(
		newUsername: string,
		oldPassword: string,
		newPassword: string,
		iterations: number,
	) {
		if (
			!this.rootCrypt ||
			!this.username ||
			!this.userData ||
			!this.loginResponse ||
			!this.userCrypt ||
			!this.preLoginResponse
		) {
			throw new Error('Not Logged in')
		}
		if (!this.online) {
			throw new Error('Cannot change password while offline')
		}
		if (!(await this.validatePassword(oldPassword))) {
			throw new Error('Old password does not match')
		}
		await this.updateUser(newUsername || this.username, newPassword || oldPassword, this.userData, iterations)
	}

	public async updateUserData() {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: UpdateUserDataRequest = {
			username: this.username,
			data: await this.rootCrypt.encrypt(JSON.stringify(this.userData)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await this.post<BasicResponse>('/user/update-data', request)
		if (this.cacheManager) {
			await this.cacheManager.setUserData(this.username!, request.data)
		}
	}

	public async createKey(id: Guid, metadata: any) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const sym = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
		const signer = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)

		const request: CreateKeyRequest = {
			username: this.username,
			id,
			name: newGuid(),
			algorithm: sym.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this.rootCrypt.encryptBytes(await sym.getKey()),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this.rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this.rootCrypt.encrypt(JSON.stringify(metadata)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await signer.sign('key', request)
		await this.post<BasicResponse>('/key/create', request)
		await this.loadKey(id)
	}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const signer = await CryptSignature.fromPem(
			CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
			share.publicKey,
			share.privateKey,
		)
		const request: CreateKeyRequest = {
			username: this.username,
			id,
			name: share.keyName,
			algorithm: share.algorithm,
			asymmetricAlgorithm: signer.algorithm,
			keyData: await this.rootCrypt.encryptBytes(await fromBase64(share.keyData)),
			publicKey: await signer.publicKeyPem(),
			privateKey: await this.rootCrypt.encrypt(await signer.privateKeyPem()),
			metadata: await this.rootCrypt.encrypt(JSON.stringify(metadata)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await signer.sign('key', request)
		await this.post<BasicResponse>('/key/create', request)
		await this.loadKey(id)
	}

	private async registerKey(key: KeyResponse) {
		const symmetric = await SymmetricCrypt.fromKey(key.algorithm, await this.rootCrypt.decryptBytes(key.keyData))
		const signature = await CryptSignature.fromPem(
			key.asymmetricAlgorithm,
			key.publicKey,
			await this.rootCrypt.decrypt(key.privateKey),
		)
		this.setKey(key.name, {
			id: key.id,
			name: key.name,
			symmetric,
			signature,
			metadata: JSON.parse(await this.rootCrypt.decrypt(key.metadata)),
		})
	}

	public async loadKey(id: Guid, preferOffline: boolean = false) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		let response: KeyResponse = undefined
		if (preferOffline && this.cacheManager) {
			response = await this.cacheManager.getKey(this.userId, id)
		}
		if (!response) {
			const request: ReadKeyRequest = {
				username: this.username,
				id,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				signatures: [],
			}
			await this.rootSignature.sign('user', request)
			response = await this.post<KeyResponse>('/key/read', request)
			if (this.cacheManager) {
				await this.cacheManager.setKey(this.userId, id, response)
			}
		}
		await this.registerKey(response)
	}

	private async loadAllKeys(preferOffline: boolean = false) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		let isCachedResult = true
		let response: AllKeysResponse = undefined
		if (preferOffline && this.cacheManager) {
			response = await this.cacheManager.getAllKeys(this.userId)
			if (response.keys.length === 0) {
				response = undefined
			}
		}
		if (!response) {
			isCachedResult = false
			const request: BasicRequest = {
				username: this.username,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				signatures: [],
			}
			await this.rootSignature.sign('user', request)
			response = await this.post<AllKeysResponse>('/key/read-all', request)
		}

		for (const key of response.keys) {
			if (this.cacheManager && !isCachedResult) {
				await this.cacheManager.setKey(this.userId, key.id, key)
			}
			await this.registerKey(key)
		}
	}

	public async deleteKey(name: Guid) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const keySet = this.getKey(name)
		const request: DeleteKeyRequest = {
			username: this.username,
			id: keySet.id,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature!.sign('user', request)
		await keySet.signature.sign('key', request)
		await this.post<KeyResponse>('/key/delete', request)

		if (this.cacheManager) {
			await this.cacheManager.deleteKey(keySet.id)
		}
		const i = this.keyChain.findIndex(ks => ks.name == name)
		if (i >= 0) {
			this.keyChain.splice(i, 1)
		}
	}

	public async shareNote(recipient: string, keyName: Guid, noteId: Guid, name: string) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const keySet = this.getKey(keyName)
		const pub = await this.getPublicKey(recipient)
		const info: NoteShareInfo = {
			id: newGuid(),
			sender: this.username,
			created: dateTimeNow(),
			name,
			noteId,
			keyName,
			algorithm: keySet.symmetric.algorithm,
			keyData: toBase64(await keySet.symmetric.getKey()),
			asymmetricAlgorithm: keySet.signature.algorithm,
			publicKey: await keySet.signature.publicKeyPem(),
			privateKey: await keySet.signature.privateKeyPem(),
		}
		const request: ShareNoteRequest = {
			username: this.username,
			recipient,
			keyName,
			data: await pub.encrypt(JSON.stringify(info)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await keySet.signature.sign('key', request)
		await this.post<BasicResponse>('/note/share', request)
	}

	public async getShareOffers() {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const response = await this.post<ShareOffersResponse>('/note/share-offers', request)
		const result: NoteShareInfo[] = []
		for (const offer of response.offers) {
			let offerData: any = {}
			try {
				offerData = JSON.parse(await this.rootSignature.decrypt(offer.data))
			} catch (ex) {
				console.log(ex)
				offerData.sender = 'error'
				offerData.name = 'error'
				offerData.error = ex
			}
			offerData.id = offer.id
			result.push(offerData)
			if (offerData.Sender !== offer.sender) {
				offerData.Sender = `Warning sender mismatch Claims to be: '${offerData.sender}' Server says: '${offer.sender}'`
			}
		}
		return result
	}

	public async deleteShareOffer(id: Guid) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: DeleteShareRequest = {
			username: this.username,
			id,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await this.post<BasicResponse>('/note/share/delete', request)
	}

	public async getPublicKey(keyOwnerName: string) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: PublicKeyRequest = {
			username: this.username,
			keyOwnerName,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const response = await this.post<PublicKeyResponse>('/user/public-key', request)
		return await CryptSignature.fromPem(response.asymmetricAlgorithm, response.publicKey)
	}

	public async createNote(note: Note): Promise<any> {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const keySet = await this.getKey(note.keyName)
		const request: WriteNoteRequest = {
			username: this.username,
			keyName: note.keyName,
			id: note.id,
			items: [],
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		let totalSize = 0
		for (const item of note.items) {
			const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
			totalSize += data.length
			request.items.push({
				version: 0,
				type: item.type,
				data,
			})
		}
		this._sizeDelta += totalSize
		this._noteCountDelta++
		await this.rootSignature.sign('user', request)
		await keySet.signature.sign('key', request)
		await this.post<BasicResponse>('/note/create', request)
	}

	public async updateNote(note: Note) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const keySet = await this.getKey(note.keyName)
		const request: WriteNoteRequest = {
			username: this.username,
			keyName: note.keyName,
			id: note.id,
			items: [],
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		let deltaSize = 0
		for (const item of note.items) {
			const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
			deltaSize += data.length - item.size
			if (item.changed) {
				request.items.push({
					version: item.version,
					type: item.type,
					data,
				})
			}
		}
		this._sizeDelta += deltaSize
		await this.rootSignature.sign('user', request)
		await keySet.signature.sign('key', request)
		try {
			const response = await this.post<UpdateNoteResponse>('/note/update', request)
			if (!response.success) {
				throw new VersionConflictError(response.conflicts)
			} else {
				this.loginResponse.size = response.size
				this.loginResponse.noteCount = response.noteCount
				this._sizeDelta = 0
				this._noteCountDelta = 0
			}
			return response
		} catch (ex) {
			if (!this.suppressErrorLog) {
				console.log(ex)
			}
			throw ex
		}
	}

	public async changeKeyForNote(noteId: Guid, newKeyName: Guid) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const note = await this.readNote(noteId)
		if (note == null) {
			throw new Error(`Note not found ${noteId}`)
		}
		const keySet = this.getKey(newKeyName)
		const oldKeySet = this.getKey(note.keyName)
		const request: WriteNoteRequest = {
			username: this.username,
			keyName: newKeyName,
			oldKeyName: note.keyName,
			id: note.id,
			items: [],
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}

		for (const item of note.items) {
			request.items.push({
				version: item.version,
				type: item.type,
				data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
			})
		}
		await this.rootSignature.sign('user', request)
		await keySet.signature.sign('key', request)
		await oldKeySet.signature.sign('old-key', request)
		await this.post<BasicResponse>('/note/update', request)
	}

	public async readNote(id: Guid, preferCached: boolean = false, include: string = '*', base?: Note) {
		const start = performance.now()
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		try {
			let response: ReadNoteResponse = undefined
			let isCache: boolean = true
			let keySet: KeySet
			if (preferCached && this.cacheManager) {
				response = await this.cacheManager.getNote(id)
			}

			if (!response) {
				const request: ReadNoteRequest = {
					username: this.username,
					id,
					include,
					timestamp: dateTimeNow(),
					requestId: newGuid(),
					signatures: [],
					versions: base?.items.map(item => ({ type: item.type, version: item.version })),
				}
				await this.rootSignature.sign('user', request)
				response = await this.post<ReadNoteResponse>('/note/read', request)
				keySet = this.getKey(response.keyName)
				if (response.items.find(item => item.updated)) {
					for (const item of response.items) {
						if (!item.updated) {
							const data = base.items.find(baseItem => baseItem.type === item.type).data
							item.data = await keySet.symmetric.encrypt(JSON.stringify(data))
						}
						item.updated = undefined
					}
					if (this.cacheManager != null) {
						await this.cacheManager.setNote(id, response)
					}
				} else if (base && !base.isCache) {
					return undefined
				}
				isCache = false
			} else {
				keySet = this.getKey(response.keyName)
			}
			const note = new Note()
			note.id = response.id
			note.keyName = response.keyName
			note.isCache = isCache
			for (const item of response.items) {
				if (item.data) {
					note.items.push({
						version: item.version,
						type: item.type,
						data: JSON.parse(await keySet.symmetric.decrypt(item.data)),
						changed: false,
						size: item.data.length,
					})
				} else {
					const baseItem = base.items.find(baseItem => baseItem.type === item.type)
					baseItem.changed = false
					note.items.push(baseItem)
				}
			}
			return note
		} catch (ex) {
			if (ex.statusCode == 404) {
				return undefined
			}
			if (!this.suppressErrorLog) {
				console.log(ex)
			}
			throw ex
		}
	}

	public async deleteNote(note: Note) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const keySet = this.getKey(note.keyName)
		const request: DeleteNoteRequest = {
			username: this.username,
			id: note.id,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		this._sizeDelta -= note.size
		this._noteCountDelta--
		await this.rootSignature.sign('user', request)
		await keySet.signature.sign('key', request)
		await this.post<BasicResponse>('/note/delete', request)
		if (this.cacheManager) {
			await this.cacheManager.deleteNote(note.id)
		}
	}

	public async createCreateAction(note: Note) {
		const action: NoteAction = {
			type: NoteActionType.Create,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		const keySet = await this.getKey(note.keyName)
		let totalSize = 0
		for (const item of note.items) {
			const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
			totalSize += data.length
			action.items.push({
				version: 0,
				type: item.type,
				data,
			})
		}
		this._sizeDelta += totalSize
		this._noteCountDelta++
		return action
	}

	public async createUpdateAction(note: Note) {
		const action: NoteAction = {
			type: NoteActionType.Update,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		const keySet = await this.getKey(note.keyName)
		let deltaSize = 0
		for (const item of note.items) {
			if (item.changed) {
				const data = await keySet.symmetric.encrypt(JSON.stringify(item.data))
				deltaSize += data.length - item.size
				action.items.push({
					version: item.version,
					type: item.type,
					data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
				})
			}
		}
		this._sizeDelta += deltaSize
		return action
	}

	public async createChangeKeyAction(noteId: Guid, newKeyName: Guid) {
		const note = await this.readNote(noteId)
		const action: NoteAction = {
			type: NoteActionType.Update,
			id: note.id,
			keyName: newKeyName,
			oldKeyName: note.keyName,
			items: [],
		}
		const keySet = await this.getKey(newKeyName)
		for (const item of note.items) {
			action.items.push({
				version: item.version,
				type: item.type,
				data: await keySet.symmetric.encrypt(JSON.stringify(item.data)),
			})
		}
		return action
	}

	public async createDeleteAction(note: Note) {
		const action: NoteAction = {
			type: NoteActionType.Delete,
			id: note.id,
			keyName: note.keyName,
			items: [],
		}
		this._sizeDelta -= note.size
		this._noteCountDelta--
		return action
	}

	public async multiAction(actions: NoteAction[]) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: MultiNoteRequest = {
			username: this.username,
			actions,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const affectedIds: Guid[] = []
		const keys: { [key: Guid]: boolean } = {}
		for (const action of actions) {
			affectedIds.push(action.id)
			keys[action.keyName] = true
			if (action.oldKeyName) {
				keys[action.oldKeyName] = true
			}
		}
		for (const keyName of Object.keys(keys)) {
			const keySet = this.getKey(keyName as Guid)
			await keySet.signature.sign(keyName, request)
		}
		const response = await this.post<UpdateNoteResponse>('/note/multi', request)
		if (response.success) {
			if (this.cacheManager) {
				for (const id of affectedIds) {
					await this.cacheManager.deleteNote(id)
				}
			}
			this.loginResponse.size = response.size
			this.loginResponse.noteCount = response.noteCount
			this._sizeDelta = 0
			this._noteCountDelta = 0
		} else {
			throw new VersionConflictError(response.conflicts)
		}
		return affectedIds
	}

	public async createNotificationUrl() {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const request: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		return await this.post<NotificationUrlResponse>('/notification/create-url', request)
	}

	public getKeyById(id: Guid) {
		const result = this.keyChain.find(key => key.id == id)
		if (result) {
			return result
		}
		throw new Error(`Key with id '${id}' not found`)
	}

	public getKeyByName(name: Guid) {
		const result = this.getKey(name)
		if (result) {
			return result
		}
		throw new Error(`Key with named '${name}' not found`)
	}

	public keyWithIdExists(id: Guid) {
		return !!this.keyChain.find(key => key.id == id)
	}

	public keyWithNameExists(name: Guid) {
		return this.hasKey(name)
	}

	public cloneTest() {
		const client = new MimerClient(this.host, this.serverKey, this.serverKeyId)
		client.cacheManager = this.cacheManager
		client.testId = this.testId
		return client
	}

	public setCacheManager(cacheManager: ICacheManager) {
		this.cacheManager = cacheManager
	}

	public get root(): string {
		return this.userData.rootNote
	}

	public get authenticated(): boolean {
		return !!this.userData
	}

	public get userId() {
		return this._userId
	}

	public get username(): string {
		return this._username
	}

	private set username(value: string) {
		this._username = value
	}

	public get userData(): any {
		return this._userData
	}

	private set userData(value: any) {
		this._userData = value
	}

	public get isOnline(): boolean {
		return this.online
	}

	public get workOffline(): boolean {
		return this._workOffline
	}

	public set workOffline(value: boolean) {
		this._workOffline = value
	}

	public get simulateOffline(): boolean {
		return this._simulateOffline
	}

	public set simulateOffline(value: boolean) {
		this._simulateOffline = value
	}

	public get cacheEnabled(): boolean {
		return !!this.cacheManager
	}

	public get testId(): string {
		return this._testId
	}

	private set testId(value: string) {
		this._testId = value
	}

	public get isLoggedIn() {
		return !!this.rootCrypt
	}

	public get usedBytes() {
		return +this.loginResponse.size + this._sizeDelta
	}

	public get maxBytes() {
		return +this.loginResponse.maxTotalBytes
	}

	public get noteCount() {
		return +this.loginResponse.noteCount + this._noteCountDelta
	}

	public get maxNoteCount() {
		return +this.loginResponse.maxNoteCount
	}

	public get maxNoteSize() {
		return +this.loginResponse.maxNoteBytes
	}

	public get maxHistoryEntries() {
		return +this.loginResponse.maxHistoryEntries
	}
}
