import { debug, env, ipcClient } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { fromBase64, toBase64, toHex } from '../hex-base64'
import { mimiriPlatform } from '../mimiri-platform'
import { SymmetricCrypt } from '../symmetric-crypt'
import { emptyGuid, newGuid } from '../types/guid'
import type { InitializationData, LoginData, SharedState } from './type'
import type { MimiriDb } from './mimiri-db'
import type { MimiriClient } from './mimiri-client'
import type { CryptographyManager } from './cryptography-manager'
import { deObfuscate, incrementalDelay, obfuscate } from '../helpers'

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
		private cryptoManager: CryptographyManager,
		private sharedState: SharedState,
	) {
		this.api.setAuthManager(this)
	}

	public async checkUsername(
		username: string,
		pow: string,
	): Promise<{ bitsExpected: number; proofAccepted: boolean; available: boolean }> {
		return this.api.checkUsername(username, pow)
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

	private async clearLoginData() {
		if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
			await ipcClient.session.set('mimiri-login-data', undefined)
		} else if (mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) {
			localStorage.removeItem('mimiri-login-data')
		} else {
			sessionStorage.removeItem('mimiri-login-data')
		}
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
					algorithm: this.cryptoManager.rootCrypt.algorithm ?? '',
					key: (await this.cryptoManager.rootCrypt.getKeyString()) ?? '',
				},
				rootSignature: {
					algorithm: this._rootSignature.algorithm,
					publicKey: await this._rootSignature.publicKeyPem(),
					privateKey: await this._rootSignature.privateKeyPem(),
				},
				data: await this.cryptoManager.rootCrypt.encrypt(
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

	public async restoreLogin(): Promise<boolean> {
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

				this.sharedState.userId = loginData.userId
				this.cryptoManager.rootCrypt = await SymmetricCrypt.fromKeyString(
					loginData.rootCrypt.algorithm,
					loginData.rootCrypt.key,
				)
				this.sharedState.isLoggedIn = true

				this._rootSignature = await CryptSignature.fromPem(
					loginData.rootSignature.algorithm ?? CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
					loginData.rootSignature.publicKey,
					loginData.rootSignature.privateKey,
				)
				await this.db.open(this._username)
				const initializationData = await this.db.getInitializationData()
				if (initializationData?.local) {
					this.sharedState.workOffline = true
					this.sharedState.isLocalOnly = true
				}

				if (!(await this.goOnline())) {
					const data = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(loginData.data))
					this.sharedState.clientConfig = data.clientConfig
					this.sharedState.userStats = data.userStats
					this._userData = data.userData
				}
				return true
			} catch (ex) {
				debug.logError('Failed to restore login data', ex)
			}
		}
		return false
	}

	public async promoteToCloudAccount(username: string, password: string, pow: string, iterations: number) {
		let initializationData = await this.db.getInitializationData()
		if (initializationData?.local) {
			initializationData.userCrypt = {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			}

			const userCrypt = await SymmetricCrypt.fromPassword(
				initializationData.userCrypt.algorithm,
				password,
				initializationData.userCrypt.salt,
				initializationData.userCrypt.iterations,
			)

			initializationData.password = {
				algorithm: DEFAULT_PASSWORD_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			}
			initializationData.rootCrypt = {
				algorithm: this.cryptoManager.rootCrypt.algorithm,
				key: await userCrypt.encryptBytes(await this.cryptoManager.rootCrypt.getKey()),
			}
			initializationData.rootSignature = {
				algorithm: CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
				publicKey: await this._rootSignature.publicKeyPem(),
				privateKey: await userCrypt.encrypt(await this._rootSignature.privateKeyPem()),
			}
			initializationData.userData = await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this.userData))
			delete initializationData.local
		} else {
			initializationData = {
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
				userData: '',
			}

			this._userCryptAlgorithm = initializationData.userCrypt.algorithm
			const userCrypt = await SymmetricCrypt.fromPassword(
				initializationData.userCrypt.algorithm,
				password,
				initializationData.userCrypt.salt,
				initializationData.userCrypt.iterations,
			)

			this.cryptoManager.rootCrypt = await SymmetricCrypt.create(initializationData.rootCrypt.algorithm)
			initializationData.rootCrypt.key = await userCrypt.encryptBytes(await this.cryptoManager.rootCrypt.getKey())

			this._rootSignature = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)
			initializationData.rootSignature.publicKey = await this._rootSignature.publicKeyPem()
			initializationData.rootSignature.privateKey = await userCrypt.encrypt(await this._rootSignature.privateKeyPem())

			initializationData.userData = await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this.userData))
		}
		await this.api.createAccount(username, password, initializationData, pow)
		await this.cryptoManager.reencryptLocalCrypt()
		await this.db.renameDatabase(username)
		await this.db.deleteInitializationData()
		this.sharedState.workOffline = false
		this.sharedState.isLocalOnly = false
	}

	public async promoteToLocalAccount(username: string, password: string, iterations: number) {
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
			userData: '',
			local: true,
		}

		this._userCryptAlgorithm = initializationData.userCrypt.algorithm
		const userCrypt = await SymmetricCrypt.fromPassword(
			initializationData.userCrypt.algorithm,
			password,
			initializationData.userCrypt.salt,
			initializationData.userCrypt.iterations,
		)

		this.cryptoManager.rootCrypt = await SymmetricCrypt.create(initializationData.rootCrypt.algorithm)
		initializationData.rootCrypt.key = await userCrypt.encryptBytes(await this.cryptoManager.rootCrypt.getKey())

		this._rootSignature = await CryptSignature.create(CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM)
		initializationData.rootSignature.publicKey = await this._rootSignature.publicKeyPem()
		initializationData.rootSignature.privateKey = await userCrypt.encrypt(await this._rootSignature.privateKeyPem())

		initializationData.userData = await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this.userData))

		await this.db.setInitializationData(initializationData)
		await this.cryptoManager.reencryptLocalCrypt()
		await this.db.renameDatabase(username)
	}

	public async login(username: string, password: string): Promise<boolean> {
		await this.db.open(username)
		let localInitializationData = true
		let initializationData = await this.db.getInitializationData()
		if (!initializationData?.local) {
			localInitializationData = false
			// TODO compare with local data after going online
			initializationData = await this.api.authenticate(username, password)
		}
		if (!initializationData) {
			return false
		}
		while (true) {
			try {
				this._userCryptAlgorithm = initializationData.userCrypt.algorithm
				const userCrypt = await SymmetricCrypt.fromPassword(
					initializationData.userCrypt.algorithm,
					password,
					initializationData.userCrypt.salt,
					initializationData.userCrypt.iterations,
				)

				this.cryptoManager.rootCrypt = await SymmetricCrypt.fromKey(
					initializationData.rootCrypt.algorithm,
					await userCrypt.decryptBytes(initializationData.rootCrypt.key),
				)
				this.sharedState.userId = initializationData.userId
				this.sharedState.isLoggedIn = true

				this._rootSignature = await CryptSignature.fromPem(
					initializationData.rootSignature.algorithm,
					initializationData.rootSignature.publicKey,
					await userCrypt.decrypt(initializationData.rootSignature.privateKey),
				)
				this._userData = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(initializationData.userData))
				this._username = username
				this.sharedState.isLocal = false
				break
			} catch (ex) {
				if (localInitializationData) {
					console.error('Failed to login locally trying online', ex)
					localInitializationData = false
					initializationData = await this.api.authenticate(username, password)
					continue
				}
				return false
			}
		}

		if (!initializationData.local) {
			await this.api.openWebSocket()
		} else {
			this.sharedState.workOffline = true
			this.sharedState.isLocalOnly = true
		}

		await this.db.setInitializationData(initializationData)

		await this.persistLogin()
		return true
	}

	public async openLocal() {
		await this.db.open('local')
		const initializationData = await this.db.getLocalUserData()
		if (!initializationData) {
			this.cryptoManager.rootCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			await this.db.setLocalUserData({
				rootCrypt: {
					algorithm: this.cryptoManager.rootCrypt.algorithm,
					key: await obfuscate(await this.cryptoManager.rootCrypt.getKeyString()),
				},
			})
		} else {
			this.cryptoManager.rootCrypt = await SymmetricCrypt.fromKeyString(
				initializationData.rootCrypt.algorithm,
				await deObfuscate(initializationData.rootCrypt.key),
			)
		}
		this._userData = await this.db.getUserData()
		if (!this._userData) {
			this._userData = {
				rootNote: newGuid(),
				rootKey: newGuid(),
				createComplete: false,
			}
			await this.db.setUserData(this._userData)
		}
		this.sharedState.isLocal = true
		this._username = 'local'
		this.sharedState.userId = emptyGuid()
		this.sharedState.isLoggedIn = true
	}

	public async goOnline(attempt: number = 0): Promise<boolean> {
		if (this.sharedState.isLocalOnly) {
			return false
		}
		try {
			const data = await this.api.verifyCredentials()
			if (data === 'REJECTED') {
				console.log('AuthenticationManager.goOnline() - credentials rejected')
				// TODO prompt user that password is changed on server and to re-enter password
				return false
			}
			if (data) {
				this._userData = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(data))
				return true
			}
		} catch (ex) {
			console.log('Failed to verify credentials, retrying', ex)
			incrementalDelay(attempt).then(() => {
				void this.goOnline(attempt + 1)
			})
			return false
		}
		return false
	}

	public async updateUserData(): Promise<void> {
		if (this.sharedState.isLocal) {
			return this.db.setUserData(this._userData)
		}
	}

	public async signRequest(request: any): Promise<any> {
		await this._rootSignature.sign('user', request)
	}

	public async decrypt(data: string): Promise<string> {
		return this._rootSignature.decrypt(data)
	}

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	): Promise<void> {
		// TODO: Implement change username and password
		return Promise.resolve()
	}

	public async deleteAccount(password: string, deleteLocal: boolean): Promise<void> {
		// TODO: Implement delete account logic
		return Promise.resolve()
	}

	public async verifyPassword(password: string): Promise<boolean> {
		return this.api.verifyPassword(password)
	}

	public async logout(): Promise<void> {
		this.clearLoginData()
		this._userData = undefined
		this._rootSignature = undefined
		this._username = undefined
		this.sharedState.isLocal = false

		this.cryptoManager.rootCrypt = null
		this.sharedState.userId = null
		this.sharedState.isLoggedIn = false

		this.db
			.close()
			.then(() => {
				// console.log('Database closed after logout')
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
