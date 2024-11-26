import { reactive } from 'vue'
import { ipcClient, notificationManager, updateKeys } from '../global'
import { version, releaseDate } from '../version'
import { CryptSignature } from './crypt-signature'
import type { InstalledBundleInfo } from './types/ipc.interfaces'
import { mimiriPlatform } from './mimiri-platform'

export interface BundleInfo {
	version: string
	minElectronVersion: string
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

export interface UpdateManagerState {
	activeVersion?: InstalledBundleInfo
	version: string
	releaseDate: Date
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
	})
	private updateAvailable: BundleInfo = undefined
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

	private compareVersions(a: string, b: string) {
		const matchA = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-(beta|rc)([0-9]+))?/.exec(a)
		const matchB = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-(beta|rc)([0-9]+))?/.exec(b)
		const majorA = parseInt(matchA[1])
		const minorA = parseInt(matchA[2])
		const patchA = parseInt(matchA[3])
		const labelTypeA = matchA[4]
		const labelA = parseInt(matchA[5])
		const majorB = parseInt(matchB[1])
		const minorB = parseInt(matchB[2])
		const patchB = parseInt(matchB[3])
		const labelTypeB = matchB[4]
		const labelB = parseInt(matchB[5])

		if (majorA !== majorB) {
			return majorA - majorB
		}
		if (minorA !== minorB) {
			return minorA - minorB
		}
		if (patchA !== patchB) {
			return patchA - patchB
		}
		if (labelTypeA !== labelTypeB) {
			return labelTypeA === 'rc' ? 1 : -1
		}
		if (labelA !== labelB) {
			return labelA - labelB
		}
		return 0
	}

	public async check() {
		if (ipcClient.isAvailable) {
			try {
				const installedVersions = await ipcClient.bundle.getInstalledVersions()
				this.state.activeVersion = installedVersions.find(ver => ver.active)
				const currentKey = updateKeys.find(item => item.current)
				const bundleInfo = await this.get<BundleInfo>(`/${currentKey.name}.latest.json?r=${Date.now()}`)
				if (bundleInfo.version !== this.state.activeVersion.version) {
					const newerVersionExists = this.compareVersions(bundleInfo.version, this.state.activeVersion.version) > 0
					if (newerVersionExists) {
						if (mimiriPlatform.isElectron) {
							const hostSupportsVersion =
								this.compareVersions(bundleInfo.minElectronVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.updateAvailable = bundleInfo
								notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
							} else {
								this.updateAvailable = bundleInfo
								notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
								// TODO notify new host available
								// TODO if base version greater than active version make base active
							}
						} else if (mimiriPlatform.isIos) {
							const hostSupportsVersion =
								this.compareVersions(bundleInfo.minIosVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.updateAvailable = bundleInfo
								notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
							} else {
								// TODO consider if we should notify user, maybe keep track of if ios version is available on store yet
								// TODO if base version greater than active version make base active
							}
						} else if (mimiriPlatform.isAndroid) {
							const hostSupportsVersion =
								this.compareVersions(bundleInfo.minAndroidVersion, this.state.activeVersion.hostVersion) <= 0
							if (hostSupportsVersion) {
								this.updateAvailable = bundleInfo
								notificationManager.updateAvailable(bundleInfo.version, new Date(bundleInfo.releaseDate))
							} else {
								// TODO consider if we should notify user, maybe keep track of if android version is available on store yet
								// TODO if base version greater than active version make base active
							}
						}
					}
				}
			} catch (ex) {
				console.log('error', ex)
			}
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
			let bundlePath = `/${currentKey.name}.${version}.json`
			let electronInfo: ElectronInfo = undefined

			if (mimiriPlatform.isElectron) {
				if (!this.hostVersion) {
					const installedVersions = await ipcClient.bundle.getInstalledVersions()
					this.state.activeVersion = installedVersions.find(ver => ver.active)
				}
				const hostSupportsVersion =
					this.compareVersions(info.minElectronVersion, this.state.activeVersion.hostVersion) <= 0
				if (!hostSupportsVersion) {
					if (mimiriPlatform.isWindows) {
						this.installingElectronUpdate = true
						electronInfo = await this.get<ElectronInfo>(`/electron-win.${version}.json`)
						bundlePath = `/mimiri_notes-${version}-full.nupkg`
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

	public async use(version: string) {
		if (this.installingElectronUpdate) {
			await ipcClient.bundle.updateElectron()
		} else {
			await ipcClient.bundle.use(version)
		}
	}

	public get hostVersion() {
		return this.state.activeVersion?.hostVersion
	}

	public get latestVersion() {
		return this.updateAvailable.version
	}

	public get currentVersion() {
		return this.state.version
	}

	public get releaseDate() {
		return this.state.releaseDate
	}
}
