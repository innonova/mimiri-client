import { settingsManager, type MimerConfiguration } from './settings-manager'
import type { FileData, InstalledBundleInfo, IpcApi } from './types/ipc.interfaces'
import { capacitorClient } from './capacitor-client'
import type { Bundle } from './update-manager'
import { menuManager } from './menu-manager'
import { toRaw } from 'vue'
import { watchDog } from './watch-dog'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { devTools } from '../global'

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
			void menuManager.menuIdActivated(menuItemId)
		})
	}

	public quit() {
		this.api.menu.quit()
	}

	public show() {
		void this._listener?.showing()
		this.api.menu.show()
	}

	public hide() {
		void this._listener?.hiding()
		this.api.menu.hide()
	}

	public showDevTools() {
		this.api.menu.showDevTools()
	}

	public setAppMenu(value: any) {
		this.api.menu.setAppMenu(value)
	}

	public seTrayMenu(value: any, colors: any) {
		this.api.menu.seTrayMenu(value, colors)
	}

	registerHideShowListener(listener: HideShowListener) {
		devTools.registerHideShowListener(listener)
		if (capacitorClient.available) {
			if (Capacitor.isPluginAvailable('App')) {
				void App.addListener('resume', async () => listener.showing())
				void App.addListener('pause', () => listener.hiding())
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
		void this.api.settings.save(value)
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

export class FileSystem {
	constructor(private api: IpcApi) {}
	public get isAvailable() {
		return !!this.api.fileSystem
	}

	public loadFile(options?: {
		title?: string
		filters?: Array<{ name: string; extensions: string[] }>
		multiple?: boolean
	}) {
		return this.api.fileSystem.loadFile(toRaw(options))
	}

	public saveFile(
		data: FileData,
		options?: {
			title?: string
			defaultName?: string
			filters?: Array<{ name: string; extensions: string[] }>
		},
	) {
		return this.api.fileSystem.saveFile(data, options)
	}

	public loadFolder(options?: { title?: string; multiple?: boolean }) {
		return this.api.fileSystem.loadFolder(options)
	}

	public saveFolder(data: FileData[], options?: { title?: string }) {
		return this.api.fileSystem.saveFolder(data, options)
	}
}

export class IpcClient {
	private api: IpcApi
	public readonly menu: MimerMenu
	public readonly settings: MimerSettings
	public readonly bundle: MimerBundle
	public readonly window: MimerWindow
	public readonly watchDog: WatchDog
	public readonly session: ElectronSession
	public readonly fileSystem: FileSystem

	constructor() {
		if (capacitorClient.available) {
			this.api = capacitorClient
		} else {
			this.api = (window as any).mimiri
		}
		this.menu = new MimerMenu(this.api)
		this.settings = new MimerSettings(this.api)
		this.bundle = new MimerBundle(this.api)
		this.window = new MimerWindow(this.api)
		this.watchDog = new WatchDog(this.api)
		this.session = new ElectronSession(this.api)
		this.fileSystem = new FileSystem(this.api)
	}

	public get isAvailable() {
		return !!this.api
	}
}
