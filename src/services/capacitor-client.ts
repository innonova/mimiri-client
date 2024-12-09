import { Capacitor, registerPlugin } from '@capacitor/core'
import type {
	InstalledBundleInfo,
	IpcApi,
	IpcBundleApi,
	IpcCacheApi,
	IpcMenuApi,
	IpcSettingsApi,
	IpcWatchDog,
	IpcWindowApi,
} from './types/ipc.interfaces'
import type { Guid } from './types/guid'
import type { MimerConfiguration } from './settings-manager'
import type { Bundle } from './update-manger'

class NoOpMenu implements IpcMenuApi {
	show() {}
	quit() {}
	showDevTools() {}
	onToggleScreenSharing(callback: () => void) {}
	onToggleOpenAtLogin(callback: () => void) {}
	setAppMenu(value: any) {}
	seTrayMenu(value: any) {}
	onMenuItemActivated(callback: (menuItemIdd: string) => void) {}
}

class NoOpWindow implements IpcWindowApi {
	async setMainWindowSize(value: { width: number; height: number }): Promise<void> {}
	getMainWindowSize(): Promise<{ width: number; height: number }> {
		return Promise.resolve({ width: 0, height: 0 })
	}
}

class NoOpWatchDog implements IpcWatchDog {
	async ok(): Promise<void> {}
	onCheck(callback: () => void) {}
}

interface CachePlugin {
	getPreLogin(data: { username: any }): Promise<{ data: any }>
	getUser(data: { username: any }): Promise<{ data: any }>
	setUser(data: { username: string; data: any; preLogin: any }): Promise<void>
	deleteUser(data: { username: any }): Promise<void>
	setUserData(data: { username: any; data: string }): Promise<void>
	getKey(data: { userId: Guid; id: Guid }): Promise<{ data: any }>
	getAllKeys(data: { userId: Guid }): Promise<{ data: any }>
	setKey(data: { userId: Guid; id: Guid; data: any }): Promise<void>
	deleteKey(data: { id: Guid }): Promise<void>
	getNote(data: { id: Guid }): Promise<{ data: any }>
	setNote(data: { id: Guid; data: any }): Promise<void>
	deleteNote(data: { id: Guid }): Promise<void>
}

interface SettingsPlugin {
	load(): Promise<MimerConfiguration>
	save(data: { settings: MimerConfiguration }): Promise<void>
}

interface MimiriUpdatePlugin {
	getInstalledVersions(): Promise<{ bundles: InstalledBundleInfo[] }>
	save(data: { version: string; bundle: Bundle }): Promise<void>
	use(data: { version: string }): Promise<void>
	delete(data: { version: string }): Promise<void>
	good(data: { version: string }): Promise<void>
}

class CapacitorCache implements IpcCacheApi {
	constructor(private cache: CachePlugin) {}

	async setTestId(testId: any): Promise<boolean> {
		return false
	}

	async tearDown(keepLogs: any): Promise<boolean> {
		return false
	}

	getPreLogin(username: any): Promise<any> {
		return this.cache.getPreLogin({ username })
	}

	getUser(username: any): Promise<any> {
		return this.cache.getUser({ username })
	}

	setUser(username: string, data: any, preLogin: any): Promise<void> {
		return this.cache.setUser({ username, data: data, preLogin: preLogin })
	}

	deleteUser(username: any): Promise<void> {
		return this.cache.deleteUser({ username })
	}

	setUserData(username: any, data: string): Promise<void> {
		return this.cache.setUserData({ username, data: data })
	}

	getKey(userId: Guid, id: Guid): Promise<any> {
		return this.cache.getKey({ userId, id })
	}

	getAllKeys(userId: Guid): Promise<any> {
		return this.cache.getAllKeys({ userId })
	}

	setKey(userId: Guid, id: Guid, data: any): Promise<void> {
		return this.cache.setKey({ userId, id, data: data })
	}

	deleteKey(id: Guid): Promise<void> {
		return this.cache.deleteKey({ id })
	}

	getNote(id: Guid): Promise<any> {
		return this.cache.getNote({ id })
	}

	setNote(id: Guid, data: any): Promise<void> {
		return this.cache.setNote({ id, data: data })
	}

	deleteNote(id: Guid): Promise<void> {
		return this.cache.deleteNote({ id })
	}
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
	use(version: string): Promise<void> {
		return this.bundle.use({ version })
	}
	delete(version: string): Promise<void> {
		return this.bundle.delete({ version })
	}
	good(version: string): Promise<void> {
		return this.bundle.good({ version })
	}
	async saveElectronUpdate(release: string, data: ArrayBuffer) {
		throw new Error('Not supported, saveElectronUpdate, capacitor')
	}
	async updateElectron() {
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

	constructor() {
		this.available = false
		if (Capacitor.isPluginAvailable('Cache')) {
			this.cache = new CapacitorCache(registerPlugin<CachePlugin>('Cache'))
			this.available = true
		}
		if (Capacitor.isPluginAvailable('Settings')) {
			this.settings = new CapacitorSettings(registerPlugin<SettingsPlugin>('Settings'))
		}
		if (Capacitor.isPluginAvailable('MimiriUpdate')) {
			this.bundle = new MimiriBundle(registerPlugin<MimiriUpdatePlugin>('MimiriUpdate'))
		}
		this.menu = new NoOpMenu()
		this.window = new NoOpWindow()
		this.watchDog = new NoOpWatchDog()
	}
}

export const capacitorClient = new CapacitorClient()
