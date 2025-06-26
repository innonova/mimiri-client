import { debug } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { toBase64 } from '../hex-base64'
import { passwordHasher } from '../password-hasher'
import { dateTimeNow } from '../types/date-time'
import { newGuid, type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type {
	AddCommentRequest,
	BasicRequest,
	CheckUsernameRequest,
	DeleteShareRequest,
	KeySyncAction,
	LoginRequest,
	MultiNoteRequest,
	NoteAction,
	NoteSyncAction,
	PublicKeyRequest,
	ShareNoteRequest,
	ShareOfferRequest,
	ShareParticipantsRequest,
	SyncPushRequest,
	SyncRequest,
} from '../types/requests'
import type {
	BasicResponse,
	CheckUsernameResponse,
	ClientConfig,
	LoginResponse,
	NotificationUrlResponse,
	PreLoginResponse,
	PublicKeyResponse,
	ShareOffersResponse,
	ShareParticipantsResponse,
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
import { HubConnectionBuilder } from '@microsoft/signalr'
import { HttpClientBase } from './http-client-base'

export class VersionConflictError extends Error {
	constructor(public conflicts: VersionConflict[]) {
		super('Version Conflict')
		Object.setPrototypeOf(this, VersionConflictError.prototype)
	}
}

export class MimiriClient extends HttpClientBase {
	private username: string
	private rootSignature: CryptSignature
	private _signalRConnection: any = null

	constructor(
		host: string,
		serverKeyId: string,
		serverKey: string,
		private sharedState: SharedState,
		private cryptoManager: CryptographyManager,
		private notificationsCallback: (type: string) => void,
	) {
		super(host, serverKeyId, serverKey)
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
			await this.openWebSocket()
			return result
		} catch (ex) {
			debug.logError('Failed to login', ex)
			return undefined
		}
	}

	public async verifyPassword(password: string): Promise<boolean> {
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
			await this.openWebSocket()
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

	public async getShareOffer(code: string) {
		try {
			const request: ShareOfferRequest = {
				username: this.username,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				code,
				signatures: [],
			}
			await this.rootSignature.sign('user', request)
			const response = await this.post<ShareOffersResponse>('/note/share-offer', request)
			const result: NoteShareInfo[] = []
			for (const offer of response.offers) {
				let offerData: any = {}
				try {
					offerData = JSON.parse(await this.rootSignature.decrypt(offer.data))
				} catch (ex) {
					debug.logError('Failed to parse share offer data', ex)
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
			if (result.length > 0) {
				return result[0]
			}
		} catch (ex) {
			debug.logError('Failed to get share offer', ex)
		}
		return undefined
	}

	public async deleteShareOffer(id: Guid) {
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

	public async getShareParticipants(id: Guid) {
		const request: ShareParticipantsRequest = {
			username: this.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			id,
			signatures: [],
		}
		await this.rootSignature.sign('user', request)
		const response = await this.post<ShareParticipantsResponse>('/note/share-participants', request)
		return response.participants
	}

	private async openWebSocket() {
		try {
			const response = await this.createNotificationUrl()
			if (!response?.url) {
				return
			}
			const connection = new HubConnectionBuilder()
				.withUrl(response.url, { accessTokenFactory: () => response.token })
				// .configureLogging(LogLevel.Warning)
				.withAutomaticReconnect()
				.build()
			connection.on('notification', async (sender, type, payload) => {
				if (type === 'note-update' || type === 'sync') {
					this.notificationsCallback('sync')
				}
				if (type === 'bundle-update') {
					this.notificationsCallback('bundle-update')
				}
				if (type === 'blog-post') {
					this.notificationsCallback('blog-post')
				}
			})
			connection.onreconnecting(error => {
				this.sharedState.isOnline = false
				this.notificationsCallback('reconnecting')
			})
			connection.onreconnected(() => {
				this.sharedState.isOnline = true
				this.notificationsCallback('reconnected')
			})
			connection.onclose(error => {
				this.sharedState.isOnline = false
				this.notificationsCallback('closed')
			})
			this._signalRConnection = connection
			await connection.start()
			this.sharedState.isOnline = true
			this.notificationsCallback('connected')
		} catch (ex) {
			debug.logError('Failed to connect for notifications', ex)
			setTimeout(() => {
				void this.openWebSocket()
			}, 5000)
		}
	}

	private async closeWebSocket() {
		if (this._signalRConnection) {
			try {
				await this._signalRConnection.stop()
			} catch (ex) {
				console.log('Error stopping SignalR connection', ex)
			} finally {
				this._signalRConnection = null
			}
		}
	}

	public async logout(): Promise<void> {
		await this.closeWebSocket()
		this.username = undefined
		this.rootSignature = undefined
	}
}
