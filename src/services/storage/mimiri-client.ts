import { debug, updateManager } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { toBase64 } from '../hex-base64'
import { passwordHasher } from '../password-hasher'
import { settingsManager } from '../settings-manager'
import { dateTimeNow } from '../types/date-time'
import { newGuid, type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type {
	AddCommentRequest,
	BasicRequest,
	KeySyncAction,
	LoginRequest,
	MultiNoteRequest,
	NoteAction,
	NoteSyncAction,
	PublicKeyRequest,
	ShareNoteRequest,
	SyncPushRequest,
	SyncRequest,
} from '../types/requests'
import type {
	BasicResponse,
	ClientConfig,
	LoginResponse,
	NotificationUrlResponse,
	PreLoginResponse,
	PublicKeyResponse,
	ShareResponse,
	SyncPushResponse,
	SyncResponse,
	SyncResult,
	UpdateNoteResponse,
	UserDataResponse,
	VersionConflict,
} from '../types/responses'
import type { CryptographyManager } from './cryptography-manager'
import type { InitializationData, SharedState, SyncInfo } from './type'

export class HttpRequestError extends Error {
	constructor(
		msg: string,
		public statusCode: number,
	) {
		super(msg)
		Object.setPrototypeOf(this, HttpRequestError.prototype)
	}
}

export class VersionConflictError extends Error {
	constructor(public conflicts: VersionConflict[]) {
		super('Version Conflict')
		Object.setPrototypeOf(this, VersionConflictError.prototype)
	}
}

export class MimiriClient {
	private username: string
	private _serverSignature: CryptSignature
	private rootSignature: CryptSignature

	constructor(
		private host: string,
		private serverKeyId: string,
		serverKey: string,
		private sharedState: SharedState,
		private cryptoManager: CryptographyManager,
	) {
		if (serverKey) {
			CryptSignature.fromPem('RSA;3072', serverKey).then(sig => (this._serverSignature = sig))
		}
	}

	public async authenticate(username: string, password: string): Promise<InitializationData | undefined> {
		let loginResponse: LoginResponse = undefined
		let preLoginResponse: PreLoginResponse = undefined
		let passwordHash: string = undefined
		try {
			try {
				preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${username}?q=${Date.now()}`)
			} catch (exi) {
				debug.logError('Failed to get pre-login response', exi)
				throw exi
			}

			passwordHash = await passwordHasher.hashPassword(
				password,
				preLoginResponse.salt,
				preLoginResponse.algorithm,
				preLoginResponse.iterations,
			)

			const loginRequest: LoginRequest = {
				username,
				response: await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge),
				hashLength: passwordHash.length / 2,
			}

			loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)

			this.username = username
			this.sharedState.clientConfig = JSON.parse(loginResponse.config ?? '{}') as ClientConfig
			this.sharedState.userStats.size = +loginResponse.size
			this.sharedState.userStats.noteCount = +loginResponse.noteCount
			this.sharedState.userStats.maxTotalBytes = +loginResponse.maxTotalBytes
			this.sharedState.userStats.maxNoteBytes = +loginResponse.maxNoteBytes
			this.sharedState.userStats.maxNoteCount = +loginResponse.maxNoteCount

			const result: InitializationData = {
				password: {
					algorithm: preLoginResponse.algorithm,
					salt: preLoginResponse.salt,
					iterations: preLoginResponse.iterations,
				},
				userCrypt: {
					algorithm: loginResponse.algorithm,
					salt: loginResponse.salt,
					iterations: loginResponse.iterations,
				},
				rootCrypt: {
					algorithm: loginResponse.symmetricAlgorithm,
					key: loginResponse.symmetricKey,
				},
				rootSignature: {
					algorithm: loginResponse.asymmetricAlgorithm,
					publicKey: loginResponse.publicKey,
					privateKey: loginResponse.privateKey,
				},
				userId: loginResponse.userId,
				userData: loginResponse.data,
			}
			return result
		} catch (ex) {
			debug.logError('Failed to login', ex)
			return undefined
		}
	}

	public setRootSignature(username: string, signature: CryptSignature): void {
		this.username = username
		this.rootSignature = signature
	}

	public async verifyCredentials(): Promise<string | undefined> {
		const getDataRequest: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature!.sign('user', getDataRequest)
		try {
			const response = await this.post<UserDataResponse>(`/user/get-data`, getDataRequest)
			this.sharedState.clientConfig = JSON.parse(response.config ?? '{}') as ClientConfig
			this.sharedState.userStats.size = +response.size
			this.sharedState.userStats.noteCount = +response.noteCount
			this.sharedState.userStats.maxTotalBytes = +response.maxTotalBytes
			this.sharedState.userStats.maxNoteBytes = +response.maxNoteBytes
			this.sharedState.userStats.maxNoteCount = +response.maxNoteCount
			return response.data
		} catch (ex) {
			debug.logError('Failed to go online', ex)
		}
		return undefined
	}

	public async getChangesSince(noteSince: number, keySince: number): Promise<SyncInfo> {
		const request: SyncRequest = {
			username: this.username,
			noteSince,
			keySince,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)

		const response = await this.post<SyncResponse>('/sync/changes-since', request)

		return { keys: response.keys, notes: response.notes }
	}

	public async multiAction(actions: NoteAction[]): Promise<Guid[]> {
		console.log('MimiriClient: multiAction', actions.length, 'actions')
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
			const keySet = this.cryptoManager.getKeyByName(keyName as Guid)
			await keySet.signature.sign(keyName, request)
		}
		const response = await this.post<UpdateNoteResponse>('/note/multi', request)
		if (!response.success) {
			throw new VersionConflictError(response.conflicts)
		}
		return affectedIds
	}

	public async getPublicKey(keyOwnerName: string, pow: string) {
		const request: PublicKeyRequest = {
			username: this.username,
			pow,
			keyOwnerName,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const response = await this.post<PublicKeyResponse>('/user/public-key', request)

		return await CryptSignature.fromPem(response.asymmetricAlgorithm, response.publicKey)
	}

	public async shareNote(recipient: string, keyName: Guid, noteId: Guid, name: string, pow: string) {
		const keySet = this.cryptoManager.getKeyByName(keyName)
		const pub = await this.getPublicKey(recipient, pow)
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
		return await this.post<ShareResponse>('/note/share', request)
	}

	public async syncPushChanges(noteActions: NoteSyncAction[], keyActions: KeySyncAction[]): Promise<SyncResult[]> {
		const request: SyncPushRequest = {
			username: this.username,
			notes: noteActions,
			keys: keyActions,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const response = await this.post<SyncPushResponse>('/sync/push-changes', request)
		return response.results
	}

	public async registerForChanges(callback: (changes: SyncInfo) => void): Promise<void> {
		// Implement logic to register for push notifications
		throw new Error('Method not implemented.')
	}

	public async createNotificationUrl() {
		const request: BasicRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		return await this.post<NotificationUrlResponse>('/notification/create-url', request)
	}

	public async addComment(postId: Guid, displayName: string, comment: string) {
		const request: AddCommentRequest = {
			username: this.username,
			postId,
			displayName,
			comment,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		return await this.post<BasicResponse>('/feedback/add-comment', request)
	}

	public get simulateOffline(): boolean {
		return !!localStorage?.getItem('mimiri_simulate_no_network')
	}

	private async get<T>(path: string): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		const start = performance.now()
		if (settingsManager.debugEnabled) {
			if (debug.settings.preCallLatencyEnabled) {
				if (debug.settings.preCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.preCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.preCallLatency))
				}
			}
			if (debug.settings.callErrorFrequencyEnabled && Math.random() < debug.callErrorFrequency / 100) {
				throw new Error('Simulated error')
			}
		}
		// console.log('GET', `${this.host}${path}`, window.location.origin)
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
			headers: {
				'X-Mimiri-Version': `${updateManager.platformString}`,
			},
		})
		if (settingsManager.debugEnabled) {
			if (debug.settings.postCallLatencyEnabled) {
				if (debug.settings.postCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.postCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.postCallLatency))
				}
			}
		}
		if (settingsManager.debugEnabled && debug.settings.latencyThreshold > 0) {
			const latency = performance.now() - start
			if (latency > debug.settings.latencyThreshold) {
				debug.logLatency(`GET ${path} took ${latency}ms`, latency)
			}
		}
		if (response.status !== 200) {
			throw new HttpRequestError(`Get of ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	private async post<T>(path: string, data: any, encrypt: boolean = false): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		const start = performance.now()
		if (settingsManager.debugEnabled) {
			if (debug.settings.preCallLatencyEnabled) {
				if (debug.settings.preCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.preCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.preCallLatency))
				}
			}
			if (debug.settings.callErrorFrequencyEnabled && Math.random() < debug.callErrorFrequency / 100) {
				throw new Error('Simulated error')
			}
		}
		let body = data
		if (encrypt && this._serverSignature) {
			body = {
				keyId: this.serverKeyId,
				data: await this._serverSignature.encrypt(JSON.stringify(data)),
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
		if (settingsManager.debugEnabled) {
			if (debug.settings.postCallLatencyEnabled) {
				if (debug.settings.postCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.postCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.postCallLatency))
				}
			}
		}
		if (settingsManager.debugEnabled && debug.settings.latencyThreshold > 0) {
			const latency = performance.now() - start
			if (latency > debug.settings.latencyThreshold) {
				debug.logLatency(`GET ${path} took ${latency}ms`, latency)
			}
		}
		if (response.status !== 200) {
			throw new HttpRequestError(`Post to ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}
}
