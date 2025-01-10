import type { MimerConfiguration } from '../settings-manager'
import type { Bundle, BundleInfo } from '../update-manger'
import type { Guid } from './guid'

export interface InstalledBundleInfo extends BundleInfo {
	active: boolean
	previous: boolean
	good: boolean
	base: boolean
	hostVersion: string
}

export interface IpcSettingsApi {
	load(): Promise<MimerConfiguration>
	save(settings: MimerConfiguration): Promise<void>
}

export interface IpcMenuApi {
	quit()
	show()
	showDevTools()
	onToggleScreenSharing(callback: () => void)
	onToggleOpenAtLogin(callback: () => void)
	setAppMenu(value: any)
	seTrayMenu(value: any)
	onMenuItemActivated(callback: (menuItemIdd: string) => void)
}

export interface IpcCacheApi {
	setTestId(testId): Promise<boolean>
	tearDown(keepLogs): Promise<boolean>
	getPreLogin(username): Promise<any>
	getUser(username): Promise<any>
	setUser(username: string, data: any, preLogin: any): Promise<void>
	deleteUser(username): Promise<void>
	setUserData(username, data: string): Promise<void>
	getKey(userId: Guid, id: Guid): Promise<any>
	getAllKeys(userId: Guid): Promise<any>
	setKey(userId: Guid, id: Guid, data: any): Promise<void>
	deleteKey(id: Guid): Promise<void>
	getNote(id: Guid): Promise<any>
	setNote(id: Guid, data: any): Promise<void>
	deleteNote(id: Guid): Promise<void>
}

export interface IpcBundleApi {
	getInstalledVersions(): Promise<InstalledBundleInfo[]>
	save(version: string, bundle: Bundle): Promise<void>
	use(version: string): Promise<void>
	delete(version: string): Promise<void>
	good(version: string): Promise<void>
	saveElectronUpdate(release: string, data: Uint8Array): Promise<void>
	updateElectron(): Promise<void>
}

export interface IpcWindowApi {
	setMainWindowSize(value: { width: number; height: number }): Promise<void>
	getMainWindowSize(): Promise<{ width: number; height: number }>
}

export interface IpcWatchDog {
	ok(): Promise<void>
	onCheck(callback: () => void)
}

export interface IpcSession {
	set(name: string, value: any): Promise<void>
	get(name: string): Promise<any>
}

export interface IpcApi {
	cache: IpcCacheApi
	menu: IpcMenuApi
	settings: IpcSettingsApi
	bundle: IpcBundleApi
	window: IpcWindowApi
	watchDog: IpcWatchDog
	session: IpcSession
}
