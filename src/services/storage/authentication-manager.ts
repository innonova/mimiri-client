import { blogManager, debug, env, ipcClient, loginRequiredToGoOnline } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { fromBase64, toBase64, toHex } from '../hex-base64'
import { mimiriPlatform } from '../mimiri-platform'
import { SymmetricCrypt } from '../symmetric-crypt'
import { emptyGuid, newGuid } from '../types/guid'
import { AccountType, type InitializationData, type SharedState, type UserData } from './type'
import type { MimiriDb } from './mimiri-db'
import type { MimiriClient } from './mimiri-client'
import type { CryptographyManager } from './cryptography-manager'
import { deObfuscate, incrementalDelay, obfuscate } from '../helpers'
import { DEFAULT_ITERATIONS, DEFAULT_PASSWORD_ALGORITHM, DEFAULT_PROOF_BITS, DEFAULT_SALT_SIZE } from './mimiri-store'
import { ProofOfWork } from '../proof-of-work'
import type { LocalStateManager } from './local-state-manager'
import { toRaw } from 'vue'
import { persistedState } from '../persisted-state'

export class AuthenticationManager {
	private _userData: UserData
	private _userCryptAlgorithm: string = SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM
	private _rootSignature: CryptSignature
	private _proofBits = DEFAULT_PROOF_BITS
	private _token = 'NO_TOKEN'

	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private cryptoManager: CryptographyManager,
		private localStateManager: LocalStateManager,
		private state: SharedState,
		private logOutCallback: () => Promise<void>,
		private loginCallback: (username: string, password: string) => Promise<void>,
	) {
		this.api.setAuthManager(this)
	}

	public async checkUsername(username: string): Promise<boolean> {
		if (env.DEV && username.startsWith('auto_test_')) {
			return true
		}
		while (true) {
			const pow = await ProofOfWork.compute(username, this._proofBits)
			const res = await this.api.checkUsername(username, pow)
			if (res.bitsExpected) {
				this._proofBits = res.bitsExpected
			}
			if (!res.proofAccepted) {
				continue
			}
			return res.available
		}
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

	private updateStateFromUserData() {
		this.state.flags = this.userData.flags ?? {}
		this.state.created = this._userData.created ? new Date(this._userData.created) : new Date()
	}

	public async persistLogin() {
		if (
			env.DEV ||
			mimiriPlatform.isElectron ||
			((mimiriPlatform.isIosApp || mimiriPlatform.isAndroidApp) && mimiriPlatform.supportsBiometry)
		) {
			const loginData = {
				username: this.state.username,
				userId: this.state?.userId ?? emptyGuid(),
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
						clientConfig: this.state.clientConfig,
						userStats: this.state.userStats,
						userData: this._userData,
						token: this._token,
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
					if (!localStr || (mimiriPlatform.supportsBiometry && !(await mimiriPlatform.verifyBiometry()))) {
						return false
					}
					str = localStr
				} else {
					str = sessionStorage.getItem('mimiri-login-data')
				}
				if (!str) {
					return false
				}
				const unzipped = await new Response(
					new Blob([fromBase64(str)]).stream().pipeThrough(new DecompressionStream('gzip')),
				).text()
				const loginData = JSON.parse(unzipped)
				this.state.username = loginData.username
				if (this.state.username?.startsWith('mimiri_a_')) {
					this.state.accountType = AccountType.Cloud
					this.state.isAnonymous = true
				}
				this._userCryptAlgorithm = loginData.userCryptAlgorithm

				this.state.userId = loginData.userId
				this.cryptoManager.rootCrypt = await SymmetricCrypt.fromKeyString(
					loginData.rootCrypt.algorithm,
					loginData.rootCrypt.key,
				)
				this._rootSignature = await CryptSignature.fromPem(
					loginData.rootSignature.algorithm ?? CryptSignature.DEFAULT_ASYMMETRIC_ALGORITHM,
					loginData.rootSignature.publicKey,
					loginData.rootSignature.privateKey,
				)

				const data = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(loginData.data))
				this._token = data.token || 'NO_TOKEN'

				if (!(await this.db.exists(this.state.username))) {
					if (ipcClient.isAvailable && ipcClient.session.isAvailable) {
						const legacyLoginData = undefined // await ipcClient.cache.getUser(this.state.username)
						const preLoginData = undefined // await ipcClient.cache.getPreLogin(this.state.username)
						if (!legacyLoginData || !preLoginData) {
							return false
						}
						const initData: InitializationData = {
							password: {
								algorithm: preLoginData.algorithm,
								salt: preLoginData.salt,
								iterations: preLoginData.iterations,
							},
							userCrypt: {
								algorithm: legacyLoginData.algorithm,
								salt: legacyLoginData.salt,
								iterations: legacyLoginData.iterations,
							},
							rootCrypt: {
								algorithm: legacyLoginData.symmetricAlgorithm,
								key: legacyLoginData.symmetricKey,
							},
							rootSignature: {
								algorithm: legacyLoginData.asymmetricAlgorithm,
								publicKey: legacyLoginData.publicKey,
								privateKey: legacyLoginData.privateKey,
							},
							userId: legacyLoginData.userId,
							userData: legacyLoginData.data,
							token: '',
							local: false,
						}
						await this.db.open(this.state.username)
						await this.db.setInitializationData(initData)
					} else {
						return false
					}
				}
				await this.db.open(this.state.username)
				await this.localStateManager.login()
				const initializationData = await this.db.getInitializationData()

				if (!initializationData) {
					return false
				}
				if (initializationData.local) {
					this.state.accountType = AccountType.Local
				} else {
					this.state.accountType = AccountType.Cloud
				}
				if (initializationData.token && initializationData.token !== 'LOCAL') {
					this._token = await this.cryptoManager.rootCrypt.decrypt(initializationData.token)
				}

				if (this.state.accountType === AccountType.Cloud && !(await this.goOnline())) {
					const userStats = await this.db.getUserStats()
					if (userStats) {
						this.state.userStats.maxNoteBytes = userStats.maxNoteBytes
						this.state.userStats.maxNoteCount = userStats.maxNoteCount
						this.state.userStats.maxTotalBytes = userStats.maxTotalBytes
						this.state.userStats.noteCount = userStats.noteCount
						this.state.userStats.size = userStats.size
					}
					this.state.clientConfig = data.clientConfig
					this.state.workOffline = true
					this._userData = data.userData
				} else if (this.state.accountType !== AccountType.Cloud) {
					this._userData = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(initializationData.userData))
					const userStats = await this.db.getUserStats()
					if (userStats) {
						this.state.userStats.maxNoteBytes = userStats.maxNoteBytes
						this.state.userStats.maxNoteCount = userStats.maxNoteCount
						this.state.userStats.maxTotalBytes = userStats.maxTotalBytes
						this.state.userStats.noteCount = userStats.noteCount
						this.state.userStats.size = userStats.size
					}
				}

				this.updateStateFromUserData()
				this.state.isLoggedIn = true

				return true
			} catch (ex) {
				debug.logError('Failed to restore login data', ex)
			}
		}
		return false
	}

	public async promoteToCloudAccount(username: string, oldPassword: string, newPassword: string, iterations: number) {
		if (this.state.accountType === AccountType.Local && !(await this.verifyPassword(oldPassword))) {
			throw new Error('Incorrect password')
		}
		let pow = ''
		if (env.DEV && username.startsWith('auto_test_')) {
			pow = 'test-mode'
		} else {
			pow = await ProofOfWork.compute(username, this._proofBits)
		}

		let initializationData = await this.db.getInitializationData()
		if (initializationData?.local) {
			initializationData.userCrypt = {
				algorithm: SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
				salt: toHex(crypto.getRandomValues(new Uint8Array(DEFAULT_SALT_SIZE))),
				iterations,
			}

			const userCrypt = await SymmetricCrypt.fromPassword(
				initializationData.userCrypt.algorithm,
				newPassword,
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
				token: newGuid(),
			}

			this._userCryptAlgorithm = initializationData.userCrypt.algorithm
			const userCrypt = await SymmetricCrypt.fromPassword(
				initializationData.userCrypt.algorithm,
				newPassword,
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
		await this.api.createAccount(username, newPassword, initializationData, pow)
		await this.cryptoManager.reencryptLocalCrypt()
		await this.db.renameDatabase(username)
		await this.db.deleteLocalUserData()
		await this.db.deleteInitializationData()
		this.state.accountType = AccountType.Cloud
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
			token: 'LOCAL',
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
		await this.db.deleteLocalUserData()
	}

	public async login(username: string, password: string): Promise<boolean> {
		await this.db.open(username)
		await this.localStateManager.login()
		let localInitializationData = true
		let initializationData = await this.db.getInitializationData()
		if (!initializationData?.local) {
			try {
				if (this.state.workOffline) {
					await this.localStateManager.workOnline()
				}
				const response = await this.api.authenticate(username, password)
				if (response === 'REJECTED') {
					loginRequiredToGoOnline.value = true
				} else {
					initializationData = response
					localInitializationData = false
					loginRequiredToGoOnline.value = false
				}
			} catch (ex) {
				console.error('Unable to authenticate with server', ex)
			}
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
				this.state.userId = initializationData.userId
				this.state.isLoggedIn = true

				this._rootSignature = await CryptSignature.fromPem(
					initializationData.rootSignature.algorithm,
					initializationData.rootSignature.publicKey,
					await userCrypt.decrypt(initializationData.rootSignature.privateKey),
				)
				this._userData = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(initializationData.userData))
				this.updateStateFromUserData()
				const userStats = await this.db.getUserStats()
				if (userStats) {
					this.state.userStats.maxNoteBytes = userStats.maxNoteBytes
					this.state.userStats.maxNoteCount = userStats.maxNoteCount
					this.state.userStats.maxTotalBytes = userStats.maxTotalBytes
					this.state.userStats.noteCount = userStats.noteCount
					this.state.userStats.size = userStats.size
				}
				this.state.username = username
				if (this.state.username?.startsWith('mimiri_a_')) {
					this.state.accountType = AccountType.Cloud
					this.state.isAnonymous = true
				} else if (initializationData.local) {
					this.state.accountType = AccountType.Local
				} else {
					this.state.accountType = AccountType.Cloud
				}
				break
			} catch (ex) {
				if (localInitializationData) {
					console.error('Failed to login locally trying online', ex)
					const response = await this.api.authenticate(username, password)
					if (response === 'REJECTED') {
						throw new Error('Login failed')
					} else {
						initializationData = response
						localInitializationData = false
					}
					continue
				}
				return false
			}
		}

		if (!initializationData.local) {
			if (!localInitializationData) {
				this.state.serverAuthenticated = true
				// await this.api.openWebSocket()
			} else {
				this.state.isOnline = false
				this.state.isOnlineDelayed = false
				this.state.serverAuthenticated = false
				this.state.workOffline = true
			}
		} else {
			this.state.accountType = AccountType.Local
		}

		if (!localInitializationData) {
			this._token = initializationData.token
			initializationData.token = await this.cryptoManager.rootCrypt.encrypt(initializationData.token)
		} else {
			if (initializationData.token && initializationData.token !== 'LOCAL') {
				this._token = await this.cryptoManager.rootCrypt.decrypt(initializationData.token)
			} else {
				this._token = 'NO_TOKEN'
			}
		}
		await this.db.setInitializationData(initializationData)

		await this.persistLogin()
		return true
	}

	public async openLocal() {
		await this.db.open('local')
		await this.localStateManager.login()
		const initializationData = await this.db.getLocalUserData()
		if (!initializationData) {
			this.cryptoManager.rootCrypt = await SymmetricCrypt.create(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM)
			this._userData = {
				rootNote: newGuid(),
				rootKey: newGuid(),
				created: new Date().toISOString(),
				createComplete: false,
			}
			await this.db.setLocalUserData({
				rootCrypt: {
					algorithm: this.cryptoManager.rootCrypt.algorithm,
					key: await obfuscate(await this.cryptoManager.rootCrypt.getKeyString()),
				},
				userData: this._userData,
			})
		} else {
			this.cryptoManager.rootCrypt = await SymmetricCrypt.fromKeyString(
				initializationData.rootCrypt.algorithm,
				await deObfuscate(initializationData.rootCrypt.key),
			)
			this._userData = initializationData.userData
		}

		this.state.accountType = AccountType.None
		this.state.username = 'local'
		this.state.userId = emptyGuid()
		this.updateStateFromUserData()
		this.state.isLoggedIn = true
		void blogManager.refreshAll()
	}

	public async goOnline(attempt: number = 0): Promise<boolean> {
		if (
			this.state.accountType === AccountType.Local ||
			this.state.accountType === AccountType.None ||
			this.state.workOffline
		) {
			return false
		}
		try {
			const data = await this.api.verifyCredentials()
			if (data === 'REJECTED') {
				loginRequiredToGoOnline.value = true
				return false
			}

			if (data) {
				this.state.serverAuthenticated = true
				this._userData = JSON.parse(await this.cryptoManager.rootCrypt.decrypt(data))
				await this.db.setUserStats(toRaw(this.state.userStats))
				this.updateStateFromUserData()
				return true
			}
		} catch (ex) {
			console.log('Failed to verify credentials, retrying', ex)
			void incrementalDelay(attempt).then(() => {
				void this.goOnline(attempt + 1)
			})
			return false
		}
		return false
	}

	public async updateUserData(): Promise<void> {
		if (this.state.accountType === AccountType.None) {
			const localUserData = await this.db.getLocalUserData()
			localUserData.userData = this._userData
			await this.db.setLocalUserData(localUserData)
		} else if (this.state.accountType === AccountType.Local) {
			const initializationData = await this.db.getInitializationData()
			if (!initializationData) {
				throw new Error('No initialization data found for local account')
			}
			initializationData.userData = await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this._userData))
			await this.db.setInitializationData(initializationData)
		} else if (this.state.accountType === AccountType.Cloud) {
			const data = await this.cryptoManager.rootCrypt.encrypt(JSON.stringify(this._userData))
			const initializationData = await this.db.getInitializationData()
			if (initializationData) {
				initializationData.userData = data
				await this.db.setInitializationData(initializationData)
			}
			await this.api.updateUserData(data)
		}
	}

	public async signRequest(request: any): Promise<any> {
		if (!request.signatures) {
			request.signatures = []
		}
		request.signatures.push({
			name: 'TOKEN',
			signature: this._token,
		})
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
		if (this.state.accountType === AccountType.Local) {
			if (this.state.username !== username) {
				await this.db.renameDatabase(username)
				this.state.username = username
			}
			if (newPassword) {
				const initializationData = await this.db.getInitializationData()
				const oldUserCrypt = await SymmetricCrypt.fromPassword(
					initializationData.userCrypt.algorithm,
					oldPassword,
					initializationData.userCrypt.salt,
					initializationData.userCrypt.iterations,
				)
				const newUserCrypt = await SymmetricCrypt.fromPassword(
					initializationData.userCrypt.algorithm,
					newPassword,
					initializationData.userCrypt.salt,
					iterations ?? DEFAULT_ITERATIONS,
				)

				const rootCrypt = await SymmetricCrypt.fromKey(
					initializationData.rootCrypt.algorithm,
					await oldUserCrypt.decryptBytes(initializationData.rootCrypt.key),
				)

				initializationData.rootCrypt.key = await newUserCrypt.encryptBytes(await rootCrypt.getKey())

				const rootSignature = await CryptSignature.fromPem(
					initializationData.rootSignature.algorithm,
					initializationData.rootSignature.publicKey,
					await oldUserCrypt.decrypt(initializationData.rootSignature.privateKey),
				)

				initializationData.rootSignature.publicKey = await rootSignature.publicKeyPem()
				initializationData.rootSignature.privateKey = await newUserCrypt.encrypt(await rootSignature.privateKeyPem())

				initializationData.userData = await rootCrypt.encrypt(JSON.stringify(this.userData))
				initializationData.token = 'LOCAL'
				await this.db.setInitializationData(initializationData)
			}
			await this.persistLogin()
		}
		if (this.state.accountType === AccountType.Cloud) {
			await this.api.changeUserNameAndPassword(username, oldPassword, newPassword, iterations)
			if (this.state.username !== username) {
				await this.db.renameDatabase(username)
				this.state.username = username
			}
			await this.db.deleteInitializationData()
			await this.logOutCallback()
			await this.loginCallback(username, newPassword ?? oldPassword)
		}
	}

	public async deleteAccount(password: string, deleteLocal: boolean): Promise<void> {
		if (this.state.accountType === AccountType.Local) {
			const initializationData = await this.db.getInitializationData()
			const userCrypt = await SymmetricCrypt.fromPassword(
				initializationData.userCrypt.algorithm,
				password,
				initializationData.userCrypt.salt,
				initializationData.userCrypt.iterations,
			)
			await userCrypt.decryptBytes(initializationData.rootCrypt.key)
			await this.db.deleteDatabase()
			await this.logOutCallback()
			window.location.reload()
		}
		if (this.state.accountType === AccountType.Cloud) {
			const username = this.state.username
			await this.api.deleteAccount(password)
			if (deleteLocal) {
				await this.db.deleteDatabase()
				await this.logOutCallback()
				window.location.reload()
			} else {
				const initializationData = await this.db.getInitializationData()
				initializationData.local = true
				initializationData.userId = emptyGuid()
				await this.db.setInitializationData(initializationData)
				await this.logOutCallback()
				await this.loginCallback(username, password)
			}
		}
		return Promise.resolve()
	}

	public async verifyPassword(password: string): Promise<boolean> {
		if (this.state.accountType === AccountType.Local) {
			try {
				const initializationData = await this.db.getInitializationData()
				const userCrypt = await SymmetricCrypt.fromPassword(
					initializationData.userCrypt.algorithm,
					password,
					initializationData.userCrypt.salt,
					initializationData.userCrypt.iterations,
				)
				await userCrypt.decryptBytes(initializationData.rootCrypt.key)
				return true
			} catch (ex) {
				console.error('Failed to verify password for local account', ex)
				return false
			}
		}
		return this.api.verifyPassword(password)
	}

	public async hasOneOrMoreAccounts(): Promise<boolean> {
		return this.db.hasOneOrMoreAccounts()
	}

	public async toggleWorkOffline() {
		if (this.state.workOffline) {
			await this.localStateManager.workOnline()
		} else {
			await this.localStateManager.workOffline()
		}
		if (this.state.workOffline) {
			// await this.api.closeWebSocket()
		} else {
			if (!(await this.goOnline())) {
				if (loginRequiredToGoOnline.value) {
					await this.localStateManager.workOffline()
				}
			}
		}
		return true
	}

	public async setFlag(flag: string, value: boolean) {
		if (!this.userData.flags) {
			this.userData.flags = {}
		}
		if (this.userData.flags[flag] !== value) {
			this.userData.flags[flag] = value
			this.state.flags[flag] = value
			await this.updateUserData()
		}
	}

	public async logout(deleteDatabase: boolean = false): Promise<void> {
		await this.clearLoginData()
		if (deleteDatabase) {
			persistedState.clear()
		}
		this._userData = undefined
		this.state.flags = {}
		this.state.created = new Date()
		this._rootSignature = undefined
		this._token = 'NO_TOKEN'
		this.state.username = undefined
		this.state.accountType = AccountType.None
		this.state.isAnonymous = false
		this.state.serverAuthenticated = false

		this.cryptoManager.rootCrypt = null
		this.state.userId = null
		this.state.isLoggedIn = false

		if (deleteDatabase) {
			await this.db.deleteDatabase()
			persistedState.clear()
		} else {
			await this.db.close()
		}
	}

	public get userData(): UserData {
		return this._userData
	}

	public get rootSignature(): CryptSignature {
		return this._rootSignature
	}
}
