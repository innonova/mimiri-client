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
	ClientConfig,
	KeyResponse,
	LoginResponse,
	NotificationUrlResponse,
	PreLoginResponse,
	PublicKeyResponse,
	ReadNoteResponse,
	ShareOffersResponse,
	UpdateNoteResponse,
	UrlResponse,
	UserDataResponse,
	VersionConflict,
} from './types/responses'
import {
	NoteActionType,
	type BasicRequest,
	type CheckUsernameRequest,
	type CreateKeyRequest,
	type CreateUserRequest,
	type DeleteAccountRequest,
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
import { env, ipcClient, updateManager } from '../global'
import { mimiriPlatform } from './mimiri-platform'

export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

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

;(window as any).simulateNoNetwork = (value: boolean) => {
	if (value) {
		localStorage.setItem('mimiri_simulate_no_network', 'true')
	} else {
		localStorage.removeItem('mimiri_simulate_no_network')
	}
}

export class MimerClient {
	public static DEFAULT_ITERATIONS = 1000000
	public suppressErrorLog = false
	private _testId: string
	private _username: string
	private _userId: Guid
	private _userCryptAlgorithm: string
	private rootCrypt: SymmetricCrypt
	private rootSignature: CryptSignature
	private serverSignature: CryptSignature
	private _userData: any
	private keyChain: KeySet[] = []
	private cacheManager: ICacheManager
	private online: boolean = false
	private _workOffline: boolean = false
	private _sizeDelta = 0
	private _noteCountDelta = 0
	private _userStats: UserStats = {
		size: 0,
		noteCount: 0,
		maxTotalBytes: 0,
		maxNoteBytes: 0,
		maxNoteCount: 0,
	}
	private _clientConfig: ClientConfig

	constructor(
		private host: string,
		private serverKey: string,
		private serverKeyId: string,
	) {
		if (serverKey) {
			CryptSignature.fromPem('RSA;3072', serverKey).then(sig => (this.serverSignature = sig))
		}
		if (env.VITE_DEFAULT_ITERATIONS) {
			MimerClient.DEFAULT_ITERATIONS = env.VITE_DEFAULT_ITERATIONS
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
			headers: {
				'X-Mimiri-Version': `${updateManager.platformString}`,
			},
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
			headers: {
				'X-Mimiri-Version': `${updateManager.platformString}`,
			},
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

	public async persistLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIos || mimiriPlatform.isAndroid) && mimiriPlatform.supportsBiometry)
		) {
			const loginData = {
				username: this._username,
				userId: this._userId,
				userCryptAlgorithm: this._userCryptAlgorithm,
				rootCrypt: {
					algorithm: this.rootCrypt.algorithm,
					key: await this.rootCrypt.getKeyString(),
				},
				rootSignature: {
					algorithm: this.rootSignature.algorithm,
					publicKey: await this.rootSignature.publicKeyPem(),
					privateKey: await this.rootSignature.privateKeyPem(),
				},
				data: await this.rootCrypt.encrypt(
					JSON.stringify({
						clientConfig: this._clientConfig,
						userStats: this._userStats,
						userData: this.userData,
					}),
					true,
				),
			}

			const zipped = await new Response(
				new Blob([new TextEncoder().encode(JSON.stringify(loginData))])
					.stream()
					.pipeThrough(new CompressionStream('gzip')),
			).arrayBuffer()
			const str = toBase64(zipped)
			if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
				await ipcClient.session.set('mimiri-login-data', str)
			} else if (mimiriPlatform.isIos || mimiriPlatform.isAndroid) {
				localStorage.setItem('mimiri-login-data', str)
			} else {
				sessionStorage.setItem('mimiri-login-data', str)
			}
		}
	}

	public async restoreLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIos || mimiriPlatform.isAndroid) && mimiriPlatform.supportsBiometry)
		) {
			try {
				let str
				if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
					str = await ipcClient.session.get('mimiri-login-data')
				} else if (mimiriPlatform.isIos || mimiriPlatform.isAndroid) {
					const localStr = localStorage.getItem('mimiri-login-data')
					if (!localStr || !(await mimiriPlatform.verifyBiometry())) {
						return
					}
					str = localStr
				} else {
					str = sessionStorage.getItem('mimiri-login-data')
				}
				if (!str) {
					return
				}
				const unzipped = await new Response(
					new Blob([fromBase64(str)]).stream().pipeThrough(new DecompressionStream('gzip')),
				).text()
				const loginData = JSON.parse(unzipped)
				this._username = loginData.username
				this._userId = loginData.userId
				this._userCryptAlgorithm = loginData.userCryptAlgorithm
				this.rootCrypt = await SymmetricCrypt.fromKeyString(loginData.rootCrypt.algorithm, loginData.rootCrypt.key)
				this.rootSignature = await CryptSignature.fromPem(
					loginData.rootSignature.algorithm ?? CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
					loginData.rootSignature.publicKey,
					loginData.rootSignature.privateKey,
				)
				if (!(await this.goOnline())) {
					const data = JSON.parse(await this.rootCrypt.decrypt(loginData.data))
					this._clientConfig = data.clientConfig
					this._userStats = data.userStats
					this.userData = data.userData
					await this.loadAllKeys(true)
				}
				return true
			} catch (ex) {
				console.log(ex)
			}
		}
		return false
	}

	public async setLoginData(data: string) {
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			await ipcClient.session.set('mimiri-login-data', data)
		} else if (mimiriPlatform.isIos || mimiriPlatform.isAndroid) {
			localStorage.setItem('mimiri-login-data', data)
		} else {
			sessionStorage.setItem('mimiri-login-data', data)
		}
	}

	public async getLoginData() {
		let str
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			str = await ipcClient.session.get('mimiri-login-data')
		} else if (mimiriPlatform.isIos || mimiriPlatform.isAndroid) {
			str = localStorage.getItem('mimiri-login-data')
		} else {
			str = sessionStorage.getItem('mimiri-login-data')
		}
		return str
	}

	public async login(data: LoginData) {
		if (this.rootCrypt) {
			throw new Error('Already logged in')
		}
		if (!data.preferOffline) {
			data.preferOffline = false
		}
		let loginResponse: LoginResponse = undefined
		let preLoginResponse: PreLoginResponse = undefined
		let passwordHash: string = undefined
		let userCrypt: SymmetricCrypt = undefined
		try {
			this.username = data.username
			if (data.preferOffline && this.cacheManager) {
				loginResponse = await this.cacheManager.getUser(data.username)
				preLoginResponse = await this.cacheManager.getPreLogin(data.username)
				if (!loginResponse?.userId) {
					loginResponse = undefined
					preLoginResponse = undefined
				}
				if (preLoginResponse) {
					passwordHash = await passwordHasher.hashPassword(
						data.password,
						preLoginResponse.salt,
						preLoginResponse.algorithm,
						preLoginResponse.iterations,
					)
				}
				this.online = false
			}

			if (!loginResponse || !preLoginResponse) {
				try {
					preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${data.username}?q=${Date.now()}`)
				} catch (exi) {
					throw exi
				}

				passwordHash = await passwordHasher.hashPassword(
					data.password,
					preLoginResponse.salt,
					preLoginResponse.algorithm,
					preLoginResponse.iterations,
				)

				const loginRequest: LoginRequest = {
					username: data.username,
					response: await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge),
					hashLength: passwordHash.length / 2,
				}

				loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)

				if (this.cacheManager != null) {
					await this.cacheManager.setUser(data.username, loginResponse, preLoginResponse)
				}
				this.online = true
			}
			this._userId = loginResponse.userId
			userCrypt = await SymmetricCrypt.fromPassword(
				loginResponse.algorithm,
				data.password,
				loginResponse.salt,
				loginResponse.iterations,
			)
			this.rootCrypt = await SymmetricCrypt.fromKey(
				loginResponse.symmetricAlgorithm,
				await userCrypt.decryptBytes(loginResponse.symmetricKey),
			)
			this.rootSignature = await CryptSignature.fromPem(
				loginResponse.asymmetricAlgorithm,
				loginResponse.publicKey,
				await userCrypt.decrypt(loginResponse.privateKey),
			)
			this.userData = JSON.parse(await this.rootCrypt.decrypt(loginResponse.data))

			this._sizeDelta = 0
			this._noteCountDelta = 0
			this._userCryptAlgorithm = loginResponse.algorithm ?? SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM
			this._clientConfig = JSON.parse(loginResponse.config ?? '{}') as ClientConfig
			this._userStats.size = loginResponse.size
			this._userStats.noteCount = loginResponse.noteCount
			this._userStats.maxTotalBytes = loginResponse.maxTotalBytes
			this._userStats.maxNoteBytes = loginResponse.maxNoteBytes
			this._userStats.maxNoteCount = loginResponse.maxNoteCount
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

	public async verifyPassword(password: string) {
		try {
			const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.username}?q=${Date.now()}`)
			const passwordHash = await passwordHasher.hashPassword(
				password,
				preLoginResponse.salt,
				preLoginResponse.algorithm,
				preLoginResponse.iterations,
			)
			const loginRequest: LoginRequest = {
				username: this.username,
				response: await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge),
				hashLength: passwordHash.length / 2,
			}
			const loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)
			return !!loginResponse.userId
		} catch {}
		return false
	}

	public async goOnline(password?: string) {
		const getDataRequest: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature!.sign('user', getDataRequest)
		try {
			const response = await this.post<UserDataResponse>(`/user/get-data`, getDataRequest)
			this._clientConfig = JSON.parse(response.config ?? '{}') as ClientConfig
			this._userStats.size = response.size
			this._userStats.noteCount = response.noteCount
			this._userStats.maxTotalBytes = response.maxTotalBytes
			this._userStats.maxNoteBytes = response.maxNoteBytes
			this._userStats.maxNoteCount = response.maxNoteCount
			this.userData = JSON.parse(await this.rootCrypt.decrypt(response.data))
			await this.loadAllKeys()
			this.online = true
			return true
		} catch {
			if (password && !this.rootCrypt) {
				return await this.login({
					username: this.username,
					password,
					preferOffline: false,
				})
			}
		}
		return false
	}

	public async deleteAccount(password: string, deleteLocal: boolean) {
		const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.username}?q=${Date.now()}`)
		const passwordHash = await passwordHasher.hashPassword(
			password,
			preLoginResponse.salt,
			preLoginResponse.algorithm,
			preLoginResponse.iterations,
		)
		const responseToChallenge = await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge)

		const request: DeleteAccountRequest = {
			username: this.username,
			response: responseToChallenge,
			hashLength: passwordHash.length / 2,
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
		this.keyChain = []
		this.username = undefined
		this.userData = undefined
		this._userStats = {
			size: 0,
			noteCount: 0,
			maxTotalBytes: 0,
			maxNoteBytes: 0,
			maxNoteCount: 0,
		}
		this.online = false
		this.workOffline = false
		sessionStorage.removeItem('mimiri-login-data')
		localStorage.removeItem('mimiri-login-data')
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
			const passwordHash = await passwordHasher.hashPassword(
				password,
				passwordSalt,
				passwordAlgorithm,
				passwordIterations,
			)

			const salt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))

			const userCrypt = await SymmetricCrypt.fromPassword(
				SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				password,
				salt,
				iterations,
			)

			const request: CreateUserRequest = {
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
					hash: passwordHash,
				},
				symmetricAlgorithm: this.rootCrypt.algorithm,
				symmetricKey: await userCrypt.encryptBytes(await this.rootCrypt.getKey()),
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

	public async changeUserNameAndPassword(
		newUsername: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		if (!this.rootCrypt) {
			throw new Error('Not Logged in')
		}
		const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.username}?q=${Date.now()}`)
		const oldPasswordHash = await passwordHasher.hashPassword(
			oldPassword,
			preLoginResponse.salt,
			preLoginResponse.algorithm,
			preLoginResponse.iterations,
		)
		const responseToChallenge = await passwordHasher.computeResponse(oldPasswordHash, preLoginResponse.challenge)

		let passwordAlgorithm = preLoginResponse.algorithm
		let passwordIterations = preLoginResponse.iterations
		let passwordSalt = preLoginResponse.salt
		let passwordHash = oldPasswordHash

		if (newPassword) {
			passwordAlgorithm = DEFAULT_PASSWORD_ALGORITHM
			passwordIterations = iterations
			passwordSalt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))
			passwordHash = await passwordHasher.hashPassword(newPassword, passwordSalt, passwordAlgorithm, passwordIterations)
		} else {
			newPassword = oldPassword
		}

		const salt = toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE)))

		const userCrypt = await SymmetricCrypt.fromPassword(
			this._userCryptAlgorithm ?? SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
			newPassword,
			salt,
			passwordIterations,
		)

		const request: UpdateUserRequest = {
			oldUsername: this.username,
			response: responseToChallenge,
			hashLength: oldPasswordHash.length / 2,
			username: newUsername || this.username,
			iterations: passwordIterations,
			salt,
			algorithm: userCrypt.algorithm,
			asymmetricAlgorithm: this.rootSignature.algorithm,
			publicKey: await this.rootSignature.publicKeyPem(),
			privateKey: await userCrypt.encrypt(await this.rootSignature.privateKeyPem()),
			password: {
				algorithm: passwordAlgorithm,
				iterations: passwordIterations,
				salt: passwordSalt,
				hash: passwordHash,
			},
			symmetricAlgorithm: this.rootCrypt.algorithm,
			symmetricKey: await userCrypt.encryptBytes(await this.rootCrypt.getKey()),
			data: await this.rootCrypt.encrypt(JSON.stringify(this.userData)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		await this.rootSignature.sign('old-user', request)
		await this.post<BasicResponse>('/user/update', request, true)
		this.username = newUsername
		if (this.cacheManager != null) {
			await this.cacheManager.deleteUser(this.username)
		}
		this.logout()
		await this.login({ username: newUsername, password: newPassword })
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
				this._userStats.size = response.size
				this._userStats.noteCount = response.noteCount
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
			this._userStats.size = response.size
			this._userStats.noteCount = response.noteCount
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

	public async getAccountUrl() {
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
		const response = await this.post<UrlResponse>('/user/account-url', request)
		return response.url
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

	public async signRequest(request: any) {
		await this.rootSignature.sign('user', request)
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
		return !!localStorage?.getItem('mimiri_simulate_no_network')
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
		return +this._userStats.size + this._sizeDelta
	}

	public get maxBytes() {
		return +this._userStats.maxTotalBytes
	}

	public get noteCount() {
		return +this._userStats.noteCount + this._noteCountDelta
	}

	public get maxNoteCount() {
		return +this._userStats.maxNoteCount
	}

	public get maxNoteSize() {
		return +this._userStats.maxNoteBytes
	}

	public get clientConfig(): ClientConfig {
		return this._clientConfig
	}
}
