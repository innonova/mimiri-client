import { reactive } from 'vue'
import { ipcClient, noteManager, notificationManager, updateKeys, updateManager } from '../global'
import { version, releaseDate } from '../version'
import { CryptSignature } from './crypt-signature'
import type { InstalledBundleInfo } from './types/ipc.interfaces'
import { mimiriPlatform } from './mimiri-platform'
import { settingsManager, UpdateMode } from './settings-manager'
import { compareVersions } from './helpers'

export interface BundleInfo {
	version: string
	minElectronVersion: string
	minElectronVersionWin32: string
	minElectronVersionDarwin: string
	minElectronVersionLinux: string
	minIosVersion: string
	minAndroidVersion: string
	releaseDate: string
	size: number
}

export interface BundleFile {
	name: string
	content: string
}

export interface BundleSignature {
	name: string
	signature: string
}

export interface Bundle extends BundleInfo {
	files: BundleFile[]
	signatures: BundleSignature[]
}

export class ChangeItem {
	text: string
}

export interface UpdateManagerState {
	activeVersion?: InstalledBundleInfo
	version: string
	releaseDate: Date
	latestVersion: string | undefined
	isHostUpdate: boolean
	downloadUrl: string
	downloadName: string
	fixes: ChangeItem[]
	features: ChangeItem[]
	pendingActivation: boolean
}

export interface ElectronInfo {
	release: string
	size: number
	signatureKey: string
	signature: string
}

export class UpdateManager {
	private state: UpdateManagerState = reactive({
		version,
		releaseDate,
		latestVersion: undefined,
		isHostUpdate: false,
		downloadUrl: undefined,
		downloadName: undefined,
		fixes: [],
		features: [],
		pendingActivation: false,
	})
	private installingElectronUpdate = false

	constructor(private host: string) {}

	private async get<T>(path: string): Promise<T> {
		// console.log(`GET ${this.host}${path}`)
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
		})
		if (response.status !== 200) {
			throw new Error(`Get of ${path} failed with status code ${response.status}`)
		}
		return response.json()
	}

	private async getReader(path: string) {
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
		})
		if (response.status !== 200) {
			throw new Error(`Get of ${path} failed with status code ${response.status}`)
		}
		return response.body.getReader()
	}

	public async good() {
		if (ipcClient.isAvailable) {
			const installedVersions = await ipcClient.bundle.getInstalledVersions()
			this.state.activeVersion = installedVersions.find(ver => ver.active)
			if (!this.state.activeVersion.good) {
				await ipcClient.bundle.good(this.state.activeVersion.version)
			}
			for (const version of installedVersions.filter(ver => !ver.base && !ver.active && !ver.previous)) {
				await ipcClient.bundle.delete(version.version)
			}
			await this.check()
		}
	}

	private updateMinElectronVersion(info: BundleInfo) {
		if (mimiriPlatform.isWindows && info.minElectronVersionWin32) {
			info.minElectronVersion = info.minElectronVersionWin32
		}
		if (mimiriPlatform.isMac && info.minElectronVersionDarwin) {
			info.minElectronVersion = info.minElectronVersionDarwin
		}
		if (mimiriPlatform.isLinux && info.minElectronVersionLinux) {
			info.minElectronVersion = info.minElectronVersionLinux
		}
	}

	public async checkUpdateInitial() {
		if (this.currentVersion !== '0.0.0') {
			try {
				const lastRunHostVersion = settingsManager.lastRunHostVersion
				await this.check()
				if (
					compareVersions(this.state.activeVersion.hostVersion, lastRunHostVersion) &&
					this.state.latestVersion &&
					!this.state.isHostUpdate
				) {
					await this.download(this.state.latestVersion)
					await this.use(this.state.latestVersion)
				}
				if (settingsManager.lastRunHostVersion !== this.state.activeVersion.hostVersion) {
					settingsManager.lastRunHostVersion = this.state.activeVersion.hostVersion
				}
			} catch (ex) {}
		}
		return false
	}

	private async performAutomaticUpdate() {
		if (this.currentVersion !== '0.0.0') {
			const installedVersions = await ipcClient.bundle.getInstalledVersions()
			const installedVersion = installedVersions.find(ver => ver.version === this.latestVersion)
			if (installedVersion?.active) {
				return
			}
			await this.download(this.latestVersion)
			await this.use(this.latestVersion, false)
			if (!this.isHostUpdate) {
				this.state.pendingActivation = true
			}
		}
	}

	public async idleActivate() {
		if (settingsManager.updateMode === UpdateMode.AutomaticOnIdle) {
			await this.activate()
		}
	}

	public async check() {
		if (ipcClient.isAvailable) {
			try {
				const installedVersions = await ipcClient.bundle.getInstalledVersions()
				this.state.activeVersion = installedVersions.find(ver => ver.active)
				const currentKey = updateKeys.find(item => item.current)

				const bundleInfo = await this.get<BundleInfo>(
					`/${currentKey.name}.${settingsManager.channel}.json?r=${Date.now()}`,
				)
				this.updateMinElectronVersion(bundleInfo)
				if (bundleInfo.version !== this.state.activeVersion.version) {
					const newerVersionExists = compareVersions(bundleInfo.version, this.state.activeVersion.version) > 0
					if (newerVersionExists) {
						if (mimiriPlatform.isElectron) {
							const hostSupportsVersion =
								compareVersions(bundleInfo.minElectronVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.state.latestVersion = bundleInfo.version
								this.state.isHostUpdate = false
								if (
									settingsManager.updateMode === UpdateMode.AutomaticOnIdle ||
									settingsManager.updateMode === UpdateMode.AutomaticOnStart
								) {
									this.performAutomaticUpdate()
								} else if (
									settingsManager.updateMode === UpdateMode.StrongNotify ||
									settingsManager.updateMode === UpdateMode.DiscreteNotify
								) {
									notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
								}
							} else if (!mimiriPlatform.isHostUpdateManaged) {
								this.state.latestVersion = bundleInfo.version
								this.state.isHostUpdate = true
								if (mimiriPlatform.isLinux) {
									const latest = await this.get<any>(`/latest.json`)
									const links = latest.systems.find(s => s.name === 'Linux')?.[settingsManager.channel]
									this.state.downloadUrl = undefined
									this.state.downloadName = undefined
									let link: any
									if (mimiriPlatform.isFlatpak) {
										link = links.find(l => l.url.endsWith('.flatpak'))
									} else if (mimiriPlatform.isSnap) {
										link = links.find(l => l.url.endsWith('.snap'))
									} else if (mimiriPlatform.isAppImage) {
										link = links.find(l => l.url.endsWith('.AppImage'))
									} else if (mimiriPlatform.isTarGz) {
										link = links.find(l => l.url.endsWith('.tar.gz'))
									}
									this.state.downloadUrl = link?.url
									this.state.downloadName = link?.name
									if (
										settingsManager.updateMode === UpdateMode.AutomaticOnIdle ||
										settingsManager.updateMode === UpdateMode.AutomaticOnStart ||
										settingsManager.updateMode === UpdateMode.StrongNotify ||
										settingsManager.updateMode === UpdateMode.DiscreteNotify
									) {
										notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
									}
								} else {
									if (
										settingsManager.updateMode === UpdateMode.AutomaticOnIdle ||
										settingsManager.updateMode === UpdateMode.AutomaticOnStart
									) {
										this.performAutomaticUpdate()
									} else if (
										settingsManager.updateMode === UpdateMode.StrongNotify ||
										settingsManager.updateMode === UpdateMode.DiscreteNotify
									) {
										notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
									}
								}
							}
						} else if (mimiriPlatform.isIos) {
							const hostSupportsVersion =
								compareVersions(bundleInfo.minIosVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.state.latestVersion = bundleInfo.version
								this.state.isHostUpdate = false
								if (
									settingsManager.updateMode === UpdateMode.AutomaticOnIdle ||
									settingsManager.updateMode === UpdateMode.AutomaticOnStart
								) {
									this.performAutomaticUpdate()
								} else if (
									settingsManager.updateMode === UpdateMode.StrongNotify ||
									settingsManager.updateMode === UpdateMode.DiscreteNotify
								) {
									notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
								}
							}
						} else if (mimiriPlatform.isAndroid) {
							const hostSupportsVersion =
								compareVersions(bundleInfo.minAndroidVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.state.latestVersion = bundleInfo.version
								this.state.isHostUpdate = false
								if (
									settingsManager.updateMode === UpdateMode.AutomaticOnIdle ||
									settingsManager.updateMode === UpdateMode.AutomaticOnStart
								) {
									this.performAutomaticUpdate()
								} else if (
									settingsManager.updateMode === UpdateMode.StrongNotify ||
									settingsManager.updateMode === UpdateMode.DiscreteNotify
								) {
									notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
								}
							}
						}
					}
				}
				await this.updateChangeLog()
			} catch (ex) {
				console.log('error', ex)
			}
		}
	}

	public async updateChangeLog() {
		const changelog = await this.get<any>(`/changelog.canary.json?r=${Date.now()}`)
		this.state.fixes = []
		this.state.features = []
		for (const version of changelog.versions) {
			if (compareVersions(version.version, this.currentVersion) <= 0) {
				break
			}
			this.state.fixes.push(...version.fixes)
			this.state.features.push(...version.features)
		}
	}

	public async download(
		version: string,
		status?: (status: { total: number; downloaded: number; stage: string; error: string }) => boolean,
	) {
		try {
			this.installingElectronUpdate = false
			const currentKey = updateKeys.find(item => item.current)
			const info = await this.get<BundleInfo>(`/${currentKey.name}.${version}.info.json`)
			this.updateMinElectronVersion(info)
			let bundlePath = `/${currentKey.name}.${version}.json`
			let electronInfo: ElectronInfo = undefined

			if (mimiriPlatform.isElectron) {
				if (!this.hostVersion) {
					const installedVersions = await ipcClient.bundle.getInstalledVersions()
					this.state.activeVersion = installedVersions.find(ver => ver.active)
				}
				const hostSupportsVersion = compareVersions(info.minElectronVersion, this.state.activeVersion.hostVersion) <= 0

				if (!hostSupportsVersion) {
					const latest = await this.get<any>(`/latest.json`)
					if (mimiriPlatform.isWindows) {
						const links = latest.systems.find(s => s.name === 'Windows')?.[settingsManager.channel]
						const jsonUrl = links.find(l => l.url.endsWith('.json')).url.split('/')
						const nupkgUrl = links.find(l => l.url.endsWith('.nupkg')).url.split('/')
						this.installingElectronUpdate = true
						electronInfo = await this.get<ElectronInfo>(`/${jsonUrl[jsonUrl.length - 1]}`)
						bundlePath = `/${nupkgUrl[nupkgUrl.length - 1]}`
					}
					if (mimiriPlatform.isMac) {
						const links = latest.systems.find(s => s.name === 'MacOS')?.[settingsManager.channel]
						const jsonUrl = links.find(l => l.url.endsWith('.json')).url.split('/')
						const zipUrl = links.find(l => l.url.endsWith('.zip')).url.split('/')
						this.installingElectronUpdate = true
						electronInfo = await this.get<ElectronInfo>(`/${jsonUrl[jsonUrl.length - 1]}`)
						bundlePath = `/${zipUrl[zipUrl.length - 1]}`
					}
				}
			}

			const reader = await this.getReader(bundlePath)

			let total = electronInfo ? electronInfo.size : info.size
			let downloaded = 0
			let stage = 'download'
			let error = ''
			const values = []
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				values.push(value)
				downloaded += value.length
				if (status) {
					if (!status({ total, downloaded, stage, error })) {
						reader.cancel()
						return
					}
				}
			}
			status?.({ total, downloaded: total, stage, error })
			const blob = new Blob(values)
			if (electronInfo) {
				stage = 'install'
				status?.({ total, downloaded: total, stage, error })
				const buffer = new Uint8Array(await blob.arrayBuffer())
				const key = updateKeys.find(item => item.name === electronInfo.signatureKey)
				const signer = await CryptSignature.fromPem(key.algorithm, key.key)
				if (!(await signer.verifyRaw(electronInfo.signature, buffer))) {
					error = 'signature-invalid'
					status?.({ total, downloaded: total, stage, error })
					return
				}
				await ipcClient.bundle.saveElectronUpdate(electronInfo.release, buffer)
			} else {
				const bundle = JSON.parse(await blob.text())

				let key
				for (const signature of bundle.signatures) {
					key = updateKeys.find(item => item.name === signature.name)
					if (key?.current) {
						break
					}
				}
				if (key) {
					stage = 'verify'
					status?.({ total, downloaded: total, stage, error })
					if (!key.current) {
						error = 'old-key'
						status?.({ total, downloaded: total, stage, error })
						return
					}
					const signer = await CryptSignature.fromPem(key.algorithm, key.key)
					if (await signer.verify(key.name, bundle)) {
						stage = 'install'
						status?.({ total, downloaded: total, stage, error })
						await ipcClient.bundle.save(bundle.version, bundle)
					} else {
						error = 'signature-invalid'
						status?.({ total, downloaded: total, stage, error })
						return
					}
				} else {
					error = 'key-not-found'
					return
				}
			}
		} catch (ex) {
			status?.({ total: 0, downloaded: 0, stage: 'error', error: ex.message })
			console.log(ex)
		}
	}

	public async use(version: string, activateImmediately: boolean = true) {
		if (this.installingElectronUpdate) {
			await ipcClient.bundle.updateElectron(!activateImmediately)
		} else {
			await ipcClient.bundle.use(version, !activateImmediately)
			if (activateImmediately && compareVersions(updateManager.currentVersion, '2.3.1') === 0) {
				await ipcClient.bundle.activate()
			}
		}
	}

	public async activate() {
		this.state.pendingActivation = false
		await ipcClient.bundle.activate()
	}

	public get hostVersion() {
		return this.state.activeVersion?.hostVersion
	}

	public get latestVersion() {
		return this.state.latestVersion
	}

	public get currentVersion() {
		return this.state.version
	}

	public get isHostUpdate() {
		return this.state.isHostUpdate
	}

	public get releaseDate() {
		return this.state.releaseDate
	}

	public get downloadUrl() {
		return this.state.downloadUrl
	}

	public get downloadName() {
		return this.state.downloadName
	}

	public get isUpdateAvailable() {
		return !!this.state.latestVersion
	}

	public get fixes() {
		return this.state.fixes
	}

	public get features() {
		return this.state.features
	}

	public get pendingActivation() {
		return this.state.pendingActivation
	}

	public get platformString() {
		return `${mimiriPlatform.platform};${this.currentVersion};${this.hostVersion}`
	}
}
