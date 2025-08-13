import { debug } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { toBase64, toHex } from '../hex-base64'
import { passwordHasher } from '../password-hasher'
import { dateTimeNow } from '../types/date-time'
import { newGuid, type Guid } from '../types/guid'
import type { NoteShareInfo } from '../types/note-share-info'
import type {
	AddCommentRequest,
	BasicRequest,
	CheckUsernameRequest,
	CreateKeyRequest,
	CreateUserRequest,
	DeleteAccountRequest,
	DeleteShareRequest,
	KeySyncAction,
	LoginRequest,
	MultiNoteRequest,
	NoteAction,
	NoteSyncAction,
	PublicKeyRequest,
	ReadNoteRequest,
	ShareNoteRequest,
	ShareOfferRequest,
	ShareParticipantsRequest,
	SyncPushRequest,
	SyncRequest,
	UpdateUserDataRequest,
	UpdateUserRequest,
} from '../types/requests'
import type {
	BasicResponse,
	CheckUsernameResponse,
	ClientConfig,
	CreateKeyResponse,
	LoginResponse,
	NotificationUrlResponse,
	PreLoginResponse,
	PublicKeyResponse,
	ReadNoteResponse,
	ShareOffersResponse,
	ShareParticipantsResponse,
	ShareResponse,
	SyncPushResponse,
	SyncResponse,
	UpdateNoteResponse,
	UserDataResponse,
	VersionConflict,
} from '../types/responses'
import type { CryptographyManager } from './cryptography-manager'
import { AccountType, type InitializationData, type SharedState, type SyncInfo } from './type'
import { HubConnectionBuilder } from '@microsoft/signalr'
import { HttpClientBase } from './http-client-base'
import { incrementalDelay } from '../helpers'
import type { AuthenticationManager } from './authentication-manager'
import { DEFAULT_PASSWORD_ALGORITHM, DEFAULT_SALT_SIZE } from './mimiri-store'
import { SymmetricCrypt } from '../symmetric-crypt'
import type { LocalStateManager } from './local-state-manager'

export class VersionConflictError extends Error {
	constructor(public conflicts: VersionConflict[]) {
		super('Version Conflict')
		Object.setPrototypeOf(this, VersionConflictError.prototype)
	}
}

export class MimiriClient extends HttpClientBase {
	private _authManager: AuthenticationManager
	private _signalRConnection: any = null
	private _websocketRequested: boolean = false

	constructor(
		host: string,
		serverKeyId: string,
		serverKey: string,
		state: SharedState,
		private cryptoManager: CryptographyManager,
		private localStateManager: LocalStateManager,
	) {
		super(host, serverKeyId, state, serverKey)
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

	public async createAccount(username: string, password: string, initializationData: InitializationData, pow: string) {
		try {
			const hash = await passwordHasher.hashPassword(
				password,
				initializationData.password.salt,
				initializationData.password.algorithm,
				initializationData.password.iterations,
			)
			const request: CreateUserRequest = {
				username,
				iterations: initializationData.userCrypt.iterations,
				salt: initializationData.userCrypt.salt,
				algorithm: initializationData.userCrypt.algorithm,
				asymmetricAlgorithm: initializationData.rootSignature.algorithm,
				publicKey: initializationData.rootSignature.publicKey,
				privateKey: initializationData.rootSignature.privateKey,
				password: {
					algorithm: initializationData.password.algorithm,
					iterations: initializationData.password.iterations,
					salt: initializationData.password.salt,
					hash,
					token: initializationData.token,
				},
				symmetricAlgorithm: initializationData.rootCrypt.algorithm,
				symmetricKey: initializationData.rootCrypt.key,
				data: initializationData.userData,
				pow,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				signatures: [],
			}
			await this._authManager.signRequest(request)
			await this.post<BasicResponse>('/user/create', request, true)
		} catch (ex) {
			debug.logError('Failed to create user', ex)
			await this.logout()
			throw ex
		}
	}

	public async authenticate(username: string, password: string): Promise<InitializationData | 'REJECTED'> {
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

			this.state.clientConfig = JSON.parse(loginResponse.config ?? '{}') as ClientConfig
			this.state.userStats.maxTotalBytes = +loginResponse.maxTotalBytes
			this.state.userStats.maxNoteBytes = +loginResponse.maxNoteBytes
			this.state.userStats.maxNoteCount = +loginResponse.maxNoteCount

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
				token: loginResponse.token,
			}
			return result
		} catch (ex) {
			if (ex.statusCode === 404) {
				return 'REJECTED'
			}
			debug.logError('Failed to login', ex)
			throw ex
		}
	}

	public async verifyPassword(password: string): Promise<boolean> {
		try {
			const preLoginResponse = await this.get<PreLoginResponse>(
				`/user/pre-login/${this.state.username}?q=${Date.now()}`,
			)
			const passwordHash = await passwordHasher.hashPassword(
				password,
				preLoginResponse.salt,
				preLoginResponse.algorithm,
				preLoginResponse.iterations,
			)
			const loginRequest: LoginRequest = {
				username: this.state.username,
				response: await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge),
				hashLength: passwordHash.length / 2,
			}
			const loginResponse = await this.post<LoginResponse>('/user/login', loginRequest)
			return !!loginResponse.userId
		} catch {}
		return false
	}

	public setAuthManager(auth: AuthenticationManager) {
		this._authManager = auth
	}

	public async verifyCredentials(): Promise<string | undefined> {
		const getDataRequest: BasicRequest = {
			username: this.state.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(getDataRequest)
		try {
			const response = await this.post<UserDataResponse>(`/user/get-data`, getDataRequest)

			this.state.clientConfig = JSON.parse(response.config ?? '{}') as ClientConfig

			this.state.userStats.size = +response.size
			this.state.userStats.noteCount = +response.noteCount
			this.state.userStats.maxTotalBytes = +response.maxTotalBytes
			this.state.userStats.maxNoteBytes = +response.maxNoteBytes
			this.state.userStats.maxNoteCount = +response.maxNoteCount

			// await this.openWebSocket()
			return response.data
		} catch (ex) {
			if (ex.statusCode === 404) {
				return 'REJECTED'
			}
			throw ex
		}
	}

	public async updateUserData(data: string) {
		const request: UpdateUserDataRequest = {
			username: this.state.username,
			data,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await this.post<BasicResponse>('/user/update-data', request)
	}

	public async changeUserNameAndPassword(
		newUsername: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.state.username}?q=${Date.now()}`)
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
			SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
			newPassword,
			salt,
			passwordIterations,
		)

		const request: UpdateUserRequest = {
			oldUsername: this.state.username,
			response: responseToChallenge,
			hashLength: oldPasswordHash.length / 2,
			username: newUsername || this.state.username,
			iterations: passwordIterations,
			salt,
			algorithm: userCrypt.algorithm,
			asymmetricAlgorithm: this._authManager.rootSignature.algorithm,
			publicKey: await this._authManager.rootSignature.publicKeyPem(),
			privateKey: await userCrypt.encrypt(await this._authManager.rootSignature.privateKeyPem()),
			password: {
				algorithm: passwordAlgorithm,
				iterations: passwordIterations,
				salt: passwordSalt,
				hash: passwordHash,
				token: newGuid(),
			},
			symmetricAlgorithm: this.cryptoManager.rootCrypt.algorithm,
			symmetricKey: await userCrypt.encryptBytes(await this.cryptoManager.rootCrypt.getKey()),
			data: await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this._authManager.userData)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await this._authManager.rootSignature.sign('old-user', request)
		return await this.post<BasicResponse>('/user/update', request, true)
	}

	public async deleteAccount(password: string) {
		const preLoginResponse = await this.get<PreLoginResponse>(`/user/pre-login/${this.state.username}?q=${Date.now()}`)
		const passwordHash = await passwordHasher.hashPassword(
			password,
			preLoginResponse.salt,
			preLoginResponse.algorithm,
			preLoginResponse.iterations,
		)
		const responseToChallenge = await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge)

		const request: DeleteAccountRequest = {
			username: this.state.username,
			response: responseToChallenge,
			hashLength: passwordHash.length / 2,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await this.post<BasicResponse>('/user/delete', request)
	}

	public async getChangesSince(noteSince: number, keySince: number): Promise<SyncInfo> {
		const request: SyncRequest = {
			username: this.state.username,
			noteSince,
			keySince,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)

		const response = await this.post<SyncResponse>('/sync/changes-since', request)

		return {
			keys: response.keys,
			notes: response.notes,
			deletedNotes: response.deletedNotes,
			noteCount: +response.noteCount,
			size: +response.size,
			maxTotalBytes: +response.maxTotalBytes,
			maxNoteBytes: +response.maxNoteBytes,
			maxNoteCount: +response.maxNoteCount,
		}
	}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<CreateKeyResponse> {
		const { keyData, signer } = await this.cryptoManager.createKeyFromNoteShare(id, share, metadata)
		const request: CreateKeyRequest = {
			username: this.state.username,
			id: keyData.id,
			name: keyData.name,
			algorithm: keyData.algorithm,
			asymmetricAlgorithm: keyData.asymmetricAlgorithm,
			keyData: keyData.keyData,
			publicKey: keyData.publicKey,
			privateKey: keyData.privateKey,
			metadata: keyData.metadata,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await signer.sign('key', request)
		return await this.post<CreateKeyResponse>('/key/create', request)
	}

	public async multiAction(actions: NoteAction[]): Promise<Guid[]> {
		const request: MultiNoteRequest = {
			username: this.state.username,
			actions,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
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
			username: this.state.username,
			pow,
			keyOwnerName,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		const response = await this.post<PublicKeyResponse>('/user/public-key', request)

		return await CryptSignature.fromPem(response.asymmetricAlgorithm, response.publicKey)
	}

	public async shareNote(recipient: string, keyName: Guid, noteId: Guid, name: string, pow: string) {
		const keySet = this.cryptoManager.getKeyByName(keyName)
		const pub = await this.getPublicKey(recipient, pow)
		const info: NoteShareInfo = {
			id: newGuid(),
			sender: this.state.username,
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
			username: this.state.username,
			recipient,
			keyName,
			data: await pub.encrypt(JSON.stringify(info)),
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await keySet.signature.sign('key', request)
		return await this.post<ShareResponse>('/note/share', request)
	}

	public async syncPushChanges(
		noteActions: NoteSyncAction[],
		keyActions: KeySyncAction[],
		syncId: string,
	): Promise<string> {
		const request: SyncPushRequest = {
			username: this.state.username,
			notes: noteActions,
			keys: keyActions,
			syncId,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		const response = await this.post<SyncPushResponse>('/sync/push-changes', request)

		return response.status
	}

	public async readNote(id: Guid): Promise<any | undefined> {
		try {
			let response: ReadNoteResponse = undefined
			const request: ReadNoteRequest = {
				username: this.state.username,
				id,
				include: '*',
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				signatures: [],
				versions: [],
			}
			await this._authManager.signRequest(request)
			response = await this.post<ReadNoteResponse>('/note/read', request)
			return response
		} catch (ex) {
			if (ex.statusCode == 404) {
				return undefined
			}
			throw ex
		}
	}

	public async registerForChanges(_callback: (changes: SyncInfo) => void): Promise<void> {
		// Implement logic to register for push notifications
		throw new Error('Method not implemented.')
	}

	public async createNotificationUrl() {
		const request: BasicRequest = {
			username: this.state.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		return await this.post<NotificationUrlResponse>('/notification/create-url', request)
	}

	public async addComment(postId: Guid, displayName: string, comment: string) {
		const request: AddCommentRequest = {
			username: this.state.username,
			postId,
			displayName,
			comment,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		return await this.post<BasicResponse>('/feedback/add-comment', request)
	}

	public async getShareOffer(code: string) {
		try {
			const request: ShareOfferRequest = {
				username: this.state.username,
				timestamp: dateTimeNow(),
				requestId: newGuid(),
				code,
				signatures: [],
			}
			await this._authManager.signRequest(request)
			const response = await this.post<ShareOffersResponse>('/note/share-offer', request)
			const result: NoteShareInfo[] = []
			for (const offer of response.offers) {
				let offerData: any = {}
				try {
					offerData = JSON.parse(await this._authManager.decrypt(offer.data))
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
			username: this.state.username,
			id,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			signatures: [],
		}
		await this._authManager.signRequest(request)
		await this.post<BasicResponse>('/note/share/delete', request)
	}

	public async getShareParticipants(id: Guid) {
		const request: ShareParticipantsRequest = {
			username: this.state.username,
			timestamp: dateTimeNow(),
			requestId: newGuid(),
			id,
			signatures: [],
		}
		await this._authManager.signRequest(request)
		const response = await this.post<ShareParticipantsResponse>('/note/share-participants', request)
		return response.participants
	}

	public async logout(): Promise<void> {
		// await this.closeWebSocket()
	}
}
