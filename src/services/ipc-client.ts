import { settingsManager, type MimerConfiguration } from './settings-manager'
import type { ICacheManager } from './types/cache-manager'
import type { Guid } from './types/guid'
import type { AllKeysResponse, KeyResponse, LoginResponse, PreLoginResponse, ReadNoteResponse } from './types/responses'
import type { InstalledBundleInfo, IpcApi } from './types/ipc.interfaces'
import { capacitorClient } from './capacitor-client'
import type { Bundle } from './update-manger'
import { menuManager } from './menu-manager'

export class MimerCache implements ICacheManager {
	constructor(private api: IpcApi) {}

	public async setTestId(testId: string): Promise<boolean> {
		return this.api.cache.setTestId(testId)
	}

	public async tearDown(keepLogs: boolean): Promise<boolean> {
		return this.api.cache.tearDown(keepLogs)
	}

	public async getPreLogin(username: string): Promise<PreLoginResponse> {
		return this.api.cache.getPreLogin(username)
	}

	public async getUser(username: string): Promise<LoginResponse> {
		return this.api.cache.getUser(username)
	}

	public async setUser(username: string, data: LoginResponse, preLogin: PreLoginResponse): Promise<void> {
		return this.api.cache.setUser(username, data, preLogin)
	}

	public async deleteUser(username: string): Promise<void> {
		return this.api.cache.deleteUser(username)
	}

	public async setUserData(username: string, data: string): Promise<void> {
		return this.api.cache.setUserData(username, data)
	}

	public async getKey(userId: Guid, id: Guid): Promise<KeyResponse> {
		return this.api.cache.getKey(userId, id)
	}

	public async getAllKeys(userId: Guid): Promise<AllKeysResponse> {
		return this.api.cache.getAllKeys(userId)
	}

	public async setKey(userId: Guid, id: Guid, data: KeyResponse): Promise<void> {
		return this.api.cache.setKey(userId, id, data)
	}

	public async deleteKey(id: Guid): Promise<void> {
		return this.api.cache.deleteKey(id)
	}

	public async getNote(id: Guid): Promise<ReadNoteResponse> {
		return this.api.cache.getNote(id)
	}

	public async setNote(id: Guid, data: ReadNoteResponse): Promise<any> {
		return this.api.cache.setNote(id, data)
	}

	public async deleteNote(id: Guid): Promise<void> {
		return this.api.cache.deleteNote(id)
	}
}

export class MimerMenu {
	constructor(private api: IpcApi) {
		this.api?.menu?.onToggleScreenSharing(() => {
			settingsManager.allowScreenSharing = !settingsManager.allowScreenSharing
		})
		this.api?.menu?.onToggleOpenAtLogin(() => {
			settingsManager.openAtLogin = !settingsManager.openAtLogin
		})
		this.api?.menu?.onMenuItemActivated((menuItemId: string) => {
			menuManager.menuIdActivated(menuItemId)
		})
	}

	public quit() {
		this.api.menu.quit()
	}

	public show() {
		this.api.menu.show()
	}

	public showDevTools() {
		this.api.menu.showDevTools()
	}

	public setAppMenu(value: any) {
		this.api.menu.setAppMenu(value)
	}

	public seTrayMenu(value: any) {
		this.api.menu.seTrayMenu(value)
	}
}

export class MimerSettings {
	constructor(private api: IpcApi) {}

	public load() {
		return this.api.settings.load()
	}

	public save(value: MimerConfiguration) {
		this.api.settings.save(value)
	}
}

export class MimerBundle {
	constructor(private api: IpcApi) {}
	public async getInstalledVersions(): Promise<InstalledBundleInfo[]> {
		const bundles = await this.api.bundle.getInstalledVersions()
		return bundles
	}
	public save(version: string, bundle: Bundle) {
		return this.api.bundle.save(version, bundle)
	}
	public use(version: string) {
		return this.api.bundle.use(version)
	}
	public delete(version: string) {
		return this.api.bundle.delete(version)
	}
	public good(version: string) {
		return this.api.bundle.good(version)
	}
	public saveElectronUpdate(release: string, data: Uint8Array) {
		return this.api.bundle.saveElectronUpdate(release, data)
	}
	public updateElectron() {
		return this.api.bundle.updateElectron()
	}
}

export class IpcClient {
	private api: IpcApi
	public readonly cache: MimerCache
	public readonly menu: MimerMenu
	public readonly settings: MimerSettings
	public readonly bundle: MimerBundle

	constructor() {
		if (capacitorClient.available) {
			this.api = capacitorClient
		} else {
			this.api = (window as any).mimiri
		}
		this.cache = new MimerCache(this.api)
		this.menu = new MimerMenu(this.api)
		this.settings = new MimerSettings(this.api)
		this.bundle = new MimerBundle(this.api)
	}

	public get isAvailable() {
		return !!this.api
	}
}
