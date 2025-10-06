import { Capacitor, registerPlugin } from '@capacitor/core'
import type {
	FileData,
	InstalledBundleInfo,
	IpcApi,
	IpcBundleApi,
	IpcCacheApi,
	IpcFileSystem,
	IpcMenuApi,
	IpcOs,
	IpcSession,
	IpcSettingsApi,
	IpcWatchDog,
	IpcWindowApi,
	PlatformRules,
} from './types/ipc.interfaces'
import type { MimerConfiguration } from './settings-manager'
import type { Bundle } from './update-manager'

class NoOpMenu implements IpcMenuApi {
	show() {}
	hide() {}
	quit() {}
	showDevTools() {}
	onToggleScreenSharing(_callback: () => void) {}
	onToggleOpenAtLogin(_callback: () => void) {}
	setAppMenu(_value: any) {}
	seTrayMenu(_value: any, _colors: any) {}
	onMenuItemActivated(_callback: (menuItemIdd: string) => void) {}
}

class NoOpWindow implements IpcWindowApi {
	async setMainWindowSize(_value: { width: number; height: number }): Promise<void> {}
	getMainWindowSize(): Promise<{ width: number; height: number }> {
		return Promise.resolve({ width: 0, height: 0 })
	}
	getIsVisible(): Promise<boolean> {
		return Promise.resolve(true)
	}
}

class NoOpWatchDog implements IpcWatchDog {
	async ok(): Promise<void> {}
	onCheck(_callback: () => void) {}
}

class NoOpFileSystem implements IpcFileSystem {
	async loadFile(_options?: {
		title?: string
		filters?: Array<{ name: string; extensions: string[] }>
		multiple?: boolean
	}): Promise<FileData[]> {
		return []
	}

	async saveFile(
		_data: FileData,
		_options?: { title?: string; defaultName?: string; filters?: Array<{ name: string; extensions: string[] }> },
	): Promise<boolean> {
		return false
	}

	async loadFolder(_options?: { title?: string; multiple?: boolean }): Promise<FileData[]> {
		return []
	}

	async saveFolder(_data: FileData[], _options?: { title?: string }): Promise<boolean> {
		return false
	}
}

class NoOpOs implements IpcOs {
	async setAutoStart(_enabled: boolean): Promise<void> {}
	async getAutoStart(): Promise<boolean> {
		return Promise.resolve(false)
	}
	async rules(): Promise<PlatformRules> {
		return Promise.resolve({
			startOnLoginRequiresApproval: false,
			canPreventScreenRecording: false,
			canKeepTrayIconVisible: false,
			needsTrayIconColorControl: false,
			flags: [],
		})
	}
}

interface SettingsPlugin {
	load(): Promise<MimerConfiguration>
	save(data: { settings: MimerConfiguration }): Promise<void>
}

interface MimiriUpdatePlugin {
	getInstalledVersions(): Promise<{ bundles: InstalledBundleInfo[] }>
	save(data: { version: string; bundle: Bundle }): Promise<void>
	use(data: { version: string; noActivate: boolean }): Promise<void>
	activate(): Promise<void>
	delete(data: { version: string }): Promise<void>
	good(data: { version: string }): Promise<void>
}

class CapacitorSettings implements IpcSettingsApi {
	constructor(private cache: SettingsPlugin) {}

	load(): Promise<MimerConfiguration> {
		return this.cache.load()
	}
	save(settings: MimerConfiguration): Promise<void> {
		return this.cache.save({ settings })
	}
}

class MimiriBundle implements IpcBundleApi {
	constructor(private bundle: MimiriUpdatePlugin) {}
	async getInstalledVersions(): Promise<InstalledBundleInfo[]> {
		const result = await this.bundle.getInstalledVersions()
		return result.bundles
	}
	save(version: string, bundle: Bundle): Promise<void> {
		return this.bundle.save({ version, bundle })
	}
	use(version: string, noActivate: boolean): Promise<void> {
		return this.bundle.use({ version, noActivate })
	}
	activate(): Promise<void> {
		return this.bundle.activate()
	}
	delete(version: string): Promise<void> {
		return this.bundle.delete({ version })
	}
	good(version: string): Promise<void> {
		return this.bundle.good({ version })
	}
	saveElectronUpdate(_release: string, _data: Uint8Array): Promise<void> {
		throw new Error('Not supported, saveElectronUpdate, capacitor')
	}
	async updateElectron(): Promise<void> {
		throw new Error('Not supported, updateElectron, capacitor')
	}
}

class CapacitorClient implements IpcApi {
	public readonly available: boolean
	public cache: IpcCacheApi
	public menu: IpcMenuApi
	public settings: IpcSettingsApi
	public bundle: IpcBundleApi
	public window: IpcWindowApi
	public watchDog: IpcWatchDog
	public session: IpcSession
	public fileSystem: IpcFileSystem
	public os: IpcOs
	public platform = 'capacitor'
	public isFlatpak = false
	public isSnap = false
	public isAppImage = false
	public isTarGz = false

	constructor() {
		this.available = false
		if (Capacitor.isPluginAvailable('Settings')) {
			this.settings = new CapacitorSettings(registerPlugin<SettingsPlugin>('Settings'))
		}
		if (Capacitor.isPluginAvailable('MimiriUpdate')) {
			this.bundle = new MimiriBundle(registerPlugin<MimiriUpdatePlugin>('MimiriUpdate'))
		}
		this.menu = new NoOpMenu()
		this.window = new NoOpWindow()
		this.watchDog = new NoOpWatchDog()
		this.fileSystem = new NoOpFileSystem()
		this.os = new NoOpOs()
	}
}

export const capacitorClient = new CapacitorClient()
