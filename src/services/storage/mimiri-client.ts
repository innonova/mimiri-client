import { debug, updateManager } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { passwordHasher } from '../password-hasher'
import { settingsManager } from '../settings-manager'
import { dateTimeNow } from '../types/date-time'
import { newGuid, type Guid } from '../types/guid'
import type { BasicRequest, LoginRequest, SyncRequest } from '../types/requests'
import type { ClientConfig, LoginResponse, PreLoginResponse, SyncResponse, UserDataResponse } from '../types/responses'
import type { MimiriApi, UserStats } from './mimiri-store'
import type { InitializationData, SyncInfo } from './type'

export class HttpRequestError extends Error {
	constructor(
		msg: string,
		public statusCode: number,
	) {
		super(msg)
		Object.setPrototypeOf(this, HttpRequestError.prototype)
	}
}

export class MimiriClient implements MimiriApi {
	private username: string
	private _serverSignature: CryptSignature
	private rootSignature: CryptSignature
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
		private serverKeyId: string,
		serverKey: string,
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
			this._clientConfig = JSON.parse(loginResponse.config ?? '{}') as ClientConfig
			this._userStats.size = loginResponse.size
			this._userStats.noteCount = loginResponse.noteCount
			this._userStats.maxTotalBytes = loginResponse.maxTotalBytes
			this._userStats.maxNoteBytes = loginResponse.maxNoteBytes
			this._userStats.maxNoteCount = loginResponse.maxNoteCount

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

	public async verifyCredentials(): Promise<boolean> {
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
			return true
		} catch (ex) {
			debug.logError('Failed to go online', ex)
		}
		return false
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
		console.log('Sending sync request', request)

		await this.rootSignature.sign('user', request)

		const response = await this.post<SyncResponse>('/sync/changes-since', request)

		return { keys: response.keys, notes: response.notes }
	}

	public async syncChanges(changes: SyncInfo): Promise<void> {
		// Implement logic to sync changes
		throw new Error('Method not implemented.')
	}

	public async registerForChanges(callback: (changes: SyncInfo) => void): Promise<void> {
		// Implement logic to register for push notifications
		throw new Error('Method not implemented.')
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
