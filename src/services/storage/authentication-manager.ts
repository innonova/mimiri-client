import { debug, env, ipcClient } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { fromBase64, toBase64, toHex } from '../hex-base64'
import { mimiriPlatform } from '../mimiri-platform'
import { SymmetricCrypt } from '../symmetric-crypt'
import { emptyGuid } from '../types/guid'
import type { InitializationData, LoginData, SharedState } from './type'
import type { MimiriDb } from './mimiri-browser-db'
import type { MimiriClient } from './mimiri-client'

const DEFAULT_ITERATIONS = 1000000
const DEFAULT_SALT_SIZE = 32
const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export class AuthenticationManager {
	private _username: string
	private _userData: any
	private _userCryptAlgorithm: string = SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM
	private _rootSignature: CryptSignature

	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private sharedState: SharedState,
	) {}

	public async checkUsername(
		username: string,
		pow: string,
	): Promise<{ bitsExpected: number; proofAccepted: boolean; available: boolean }> {
		return Promise.resolve({
			bitsExpected: 15,
			proofAccepted: true,
			available: true,
		})
	}

	public async setLoginData(data: string) {
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			await ipcClient.session.set('mimiri-login-data', data)
		} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
			localStorage.setItem('mimiri-login-data', data)
		} else {
			sessionStorage.setItem('mimiri-login-data', data)
		}
	}

	public async getLoginData() {
		let str
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			str = await ipcClient.session.get('mimiri-login-data')
		} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
			str = localStorage.getItem('mimiri-login-data')
		} else {
			str = sessionStorage.getItem('mimiri-login-data')
		}
		return str
	}

	public async persistLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) && mimiriPlatform.supportsBiometry)
		) {
			const loginData = {
				username: this._username,
				userId: this.sharedState?.userId ?? emptyGuid(),
				userCryptAlgorithm: this._userCryptAlgorithm,
				rootCrypt: {
					algorithm: this.sharedState?.rootCrypt?.algorithm ?? '',
					key: (await this.sharedState?.rootCrypt?.getKeyString()) ?? '',
				},
				rootSignature: {
					algorithm: this._rootSignature.algorithm,
					publicKey: await this._rootSignature.publicKeyPem(),
					privateKey: await this._rootSignature.privateKeyPem(),
				},
				data: await this.sharedState!.rootCrypt!.encrypt(
					JSON.stringify({
						clientConfig: this.sharedState.clientConfig,
						userStats: this.sharedState.userStats,
						userData: this._userData,
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
			} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
				localStorage.setItem('mimiri-login-data', str)
			} else {
				sessionStorage.setItem('mimiri-login-data', str)
			}
		}
	}

	public async restoreLogin(
		ensureLocalCrypt: () => Promise<void>,
		goOnline: () => Promise<boolean>,
		sync: () => Promise<void>,
		loadAllKeys: () => Promise<void>,
		syncPush: () => Promise<void>,
	): Promise<boolean> {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) && mimiriPlatform.supportsBiometry)
		) {
			try {
				let str
				if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
					str = await ipcClient.session.get('mimiri-login-data')
				} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
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
				this._userCryptAlgorithm = loginData.userCryptAlgorithm

				// Update shared state directly
				if (this.sharedState) {
					this.sharedState.userId = loginData.userId
					this.sharedState.rootCrypt = await SymmetricCrypt.fromKeyString(
						loginData.rootCrypt.algorithm,
						loginData.rootCrypt.key,
					)
					this.sharedState.isLoggedIn = true
					this.sharedState.isOnline = true
				}

				this._rootSignature = await CryptSignature.fromPem(
					loginData.rootSignature.algorithm ?? CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
					loginData.rootSignature.publicKey,
					loginData.rootSignature.privateKey,
				)
				await this.db.open(this._username)
				await ensureLocalCrypt()
				if (!(await goOnline())) {
					const data = JSON.parse(await this.sharedState!.rootCrypt!.decrypt(loginData.data))
					this.sharedState.clientConfig = data.clientConfig
					this.sharedState.userStats = data.userStats
					this._userData = data.userData
				}
				await sync()
				await loadAllKeys()
				await syncPush()
				await sync()
				return true
			} catch (ex) {
				debug.logError('Failed to restore login data', ex)
			}
		}
		return false
	}

	public async createUser(
		username: string,
		password: string,
		userData: any,
		pow: string,
		iterations: number,
	): Promise<void> {
		console.log('Creating user:', username)
		await this.db.open(username)
		const initializationData: InitializationData = {
			password: {
				algorithm: DEFAULT_PASSWORD_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			},
			userCrypt: {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			},
			rootCrypt: {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				key: '',
			},
			rootSignature: {
				algorithm: CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
				publicKey: '',
				privateKey: '',
			},
			userId: emptyGuid(),
			userData,
		}

		this._userCryptAlgorithm = initializationData.userCrypt.algorithm
		const userCrypt = await SymmetricCrypt.fromPassword(
			initializationData.userCrypt.algorithm,
			password,
			initializationData.userCrypt.salt,
			initializationData.userCrypt.iterations,
		)

		// Create root crypt and update shared state
		if (this.sharedState) {
			this.sharedState.rootCrypt = await SymmetricCrypt.create(initializationData.rootCrypt.algorithm)
			initializationData.rootCrypt.key = await userCrypt.encryptBytes(await this.sharedState.rootCrypt.getKey())
		}

		this._rootSignature = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)
		initializationData.rootSignature.publicKey = await this._rootSignature.publicKeyPem()
		initializationData.rootSignature.privateKey = await userCrypt.encrypt(await this._rootSignature.privateKeyPem())

		await this.db.setInitializationData(initializationData)

		this._userData = userData
		this._username = username
		await this.db.setUserData(this._userData)
	}

	public async login(
		data: LoginData,
		sync: () => Promise<void>,
		loadAllKeys: () => Promise<void>,
		syncPush: () => Promise<void>,
	): Promise<boolean> {
		let initializationData = await this.api.authenticate(data.username, data.password)
		if (!initializationData) {
			return false
		}
		await this.db.open(data.username)
		this._userCryptAlgorithm = initializationData.userCrypt.algorithm
		const userCrypt = await SymmetricCrypt.fromPassword(
			initializationData.userCrypt.algorithm,
			data.password,
			initializationData.userCrypt.salt,
			initializationData.userCrypt.iterations,
		)

		// Update shared state directly
		if (this.sharedState) {
			this.sharedState.rootCrypt = await SymmetricCrypt.fromKey(
				initializationData.rootCrypt.algorithm,
				await userCrypt.decryptBytes(initializationData.rootCrypt.key),
			)
			this.sharedState.userId = initializationData.userId
			this.sharedState.isLoggedIn = true
			this.sharedState.isOnline = true
		}

		this._rootSignature = await CryptSignature.fromPem(
			initializationData.rootSignature.algorithm,
			initializationData.rootSignature.publicKey,
			await userCrypt.decrypt(initializationData.rootSignature.privateKey),
		)
		this._userData = JSON.parse(await this.sharedState!.rootCrypt!.decrypt(initializationData.userData))
		this._username = data.username

		this.api.setRootSignature(this._username, this._rootSignature)
		await this.db.setInitializationData(initializationData)

		await sync()
		await loadAllKeys()
		await syncPush()
		await sync()
		await this.persistLogin()
		return true
	}

	public async goOnline(): Promise<boolean> {
		this.api.setRootSignature(this._username, this._rootSignature)
		const data = await this.api.verifyCredentials()
		if (data) {
			this._userData = JSON.parse(await this.sharedState!.rootCrypt!.decrypt(data))
			if (this.sharedState) {
				this.sharedState.isOnline = true
			}
			return true
		}
		return false
	}

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	): Promise<void> {
		return Promise.resolve()
	}

	public async deleteAccount(password: string, deleteLocal: boolean): Promise<void> {
		console.log('Deleting account:')
		return Promise.resolve()
	}

	public async verifyPassword(password: string): Promise<boolean> {
		console.log('Verifying password:')
		return Promise.resolve(false)
	}

	public logout(): void {
		this._userData = undefined
		this._rootSignature = undefined
		this._username = undefined

		// Clear authentication state using the helper function
		if (this.sharedState) {
			this.sharedState.userId = null
			this.sharedState.rootCrypt = null
			this.sharedState.isLoggedIn = false
			this.sharedState.isOnline = false
		}

		this.db
			.close()
			.then(() => {
				console.log('Database closed after logout')
			})
			.catch(err => {
				console.error('Error closing database:', err)
			})
	}

	public get userData(): any {
		return this._userData
	}

	public get username(): string {
		return this._username
	}
}
