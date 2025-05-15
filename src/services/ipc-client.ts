import { settingsManager, type MimerConfiguration } from './settings-manager'
import type { ICacheManager } from './types/cache-manager'
import type { Guid } from './types/guid'
import type { AllKeysResponse, KeyResponse, LoginResponse, PreLoginResponse, ReadNoteResponse } from './types/responses'
import type { InstalledBundleInfo, IpcApi } from './types/ipc.interfaces'
import { capacitorClient } from './capacitor-client'
import type { Bundle } from './update-manager'
import { menuManager } from './menu-manager'
import { toRaw } from 'vue'
import { watchDog } from './watch-dog'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

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

export interface HideShowListener {
	hiding(): Promise<void>
	showing(): Promise<void>
}

export class MimerMenu {
	private _listener: HideShowListener
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
		this._listener?.showing()
		this.api.menu.show()
	}

	public hide() {
		this._listener?.hiding()
		this.api.menu.hide()
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

	registerHideShowListener(listener: HideShowListener) {
		if (capacitorClient.available) {
			if (Capacitor.isPluginAvailable('App')) {
				App.addListener('resume', async () => listener.showing())
				App.addListener('pause', () => listener.hiding())
			}
		} else {
			this._listener = listener
		}
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
	public use(version: string, noActivate: boolean) {
		return this.api.bundle.use(version, noActivate)
	}
	public activate() {
		return this.api.bundle.activate()
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
	public updateElectron(noRestart: boolean) {
		return this.api.bundle.updateElectron(noRestart)
	}
}

export class MimerWindow {
	constructor(private api: IpcApi) {}
	public getMainWindowSize() {
		return this.api.window.getMainWindowSize()
	}
	public setMainWindowSize(value: { width: number; height: number }) {
		return this.api.window.setMainWindowSize(toRaw(value))
	}
	public getIsVisible() {
		return this.api.window.getIsVisible()
	}
}

export class WatchDog {
	constructor(private api: IpcApi) {
		this.api?.watchDog?.onCheck(() => {
			watchDog.check()
		})
	}
	public ok() {
		return this.api.watchDog.ok()
	}
}

export class ElectronSession {
	constructor(private api: IpcApi) {}
	public get isAvailable() {
		return !!this.api.session
	}
	public get(name: string) {
		return this.api.session.get(name)
	}
	public set(name: string, value: any) {
		return this.api.session.set(name, value)
	}
}

export class IpcClient {
	private api: IpcApi
	public readonly cache: MimerCache
	public readonly menu: MimerMenu
	public readonly settings: MimerSettings
	public readonly bundle: MimerBundle
	public readonly window: MimerWindow
	public readonly watchDog: WatchDog
	public readonly session: ElectronSession

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
		this.window = new MimerWindow(this.api)
		this.watchDog = new WatchDog(this.api)
		this.session = new ElectronSession(this.api)
	}

	public get isAvailable() {
		return !!this.api
	}
}
