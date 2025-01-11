import { reactive } from 'vue'
import { ipcClient } from '../global'
import { menuManager } from './menu-manager'
import { toRaw } from 'vue'
import { mimiriPlatform } from './mimiri-platform'

export interface MimerConfiguration {
	openAtLogin: boolean
	allowScreenSharing: boolean
	theme: string
	titleBarColor: string
	titleBarSymbolColor: string
	titleBarHeight: number
	wordwrap: boolean
	channel: string
	lastRunHostVersion: string
	mainWindowSize: { width: number; height: number }
	keepTrayIconVisible: boolean
	developerMode: boolean | undefined
	showInTaskBar: boolean
}

class SettingsManager {
	private defaultThemeIsDark: boolean

	public state: MimerConfiguration = reactive({
		openAtLogin: true,
		allowScreenSharing: false,
		theme: 'default',
		titleBarColor: '#f4f4f4',
		titleBarSymbolColor: '#000',
		titleBarHeight: 36,
		wordwrap: mimiriPlatform.isPhone,
		channel: 'stable',
		lastRunHostVersion: '0.0.0',
		mainWindowSize: { width: 0, height: 0 },
		keepTrayIconVisible: true,
		developerMode: undefined,
		showInTaskBar: true,
	})

	constructor() {
		this.defaultThemeIsDark = !!window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
	}

	private setTitleBar() {
		if (this.darkMode) {
			this.state.titleBarColor = '#323233'
			this.state.titleBarSymbolColor = '#8E8E8E'
			this.state.titleBarHeight = 36
		} else {
			this.state.titleBarColor = '#f4f4f4'
			this.state.titleBarSymbolColor = '#000'
			this.state.titleBarHeight = 36
		}
	}

	public async load() {
		if (ipcClient.isAvailable) {
			const settings = await ipcClient.settings.load()
			if (settings) {
				Object.assign(this.state, settings)
			}
			this.setTitleBar()
		} else if (localStorage) {
			const settings = localStorage.getItem('mimer-settings')
			if (settings) {
				Object.assign(this.state, JSON.parse(settings))
			}
		}
	}

	public async save() {
		if (ipcClient.isAvailable) {
			await ipcClient.settings.save(toRaw(this.state))
			menuManager.updateTrayMenu()
		} else if (localStorage) {
			localStorage.setItem('mimer-settings', JSON.stringify(toRaw(this.state)))
		}
	}

	public get darkMode() {
		if (this.state.theme === 'default') {
			return this.defaultThemeIsDark
		}
		return this.state.theme === 'dark'
	}

	public set darkMode(value: boolean | undefined) {
		if (value === true) {
			this.state.theme = 'dark'
		} else if (value === false) {
			this.state.theme = 'light'
		} else {
			this.state.theme = 'default'
		}
		this.setTitleBar()
		void this.save()
	}

	public get allowScreenSharing() {
		return this.state.allowScreenSharing
	}

	public set allowScreenSharing(value: boolean) {
		this.state.allowScreenSharing = value
		void this.save()
	}

	public get keepTrayIconVisible() {
		return this.state.keepTrayIconVisible
	}

	public set keepTrayIconVisible(value: boolean) {
		this.state.keepTrayIconVisible = value
		void this.save()
	}

	public get openAtLogin() {
		return this.state.openAtLogin
	}

	public set openAtLogin(value: boolean) {
		this.state.openAtLogin = value
		void this.save()
	}

	public get wordwrap() {
		return this.state.wordwrap
	}

	public set wordwrap(value: boolean) {
		this.state.wordwrap = value
		void this.save()
	}

	public get showInTaskBar() {
		return this.state.showInTaskBar
	}

	public set showInTaskBar(value: boolean) {
		this.state.showInTaskBar = value
		void this.save()
	}

	public get channel() {
		return this.state.channel
	}

	public set channel(value: string) {
		this.state.channel = value
		void this.save()
	}

	public get lastRunHostVersion() {
		return this.state.lastRunHostVersion
	}

	public set lastRunHostVersion(value: string) {
		this.state.lastRunHostVersion = value
		void this.save()
	}

	public get mainWindowSize() {
		return this.state.mainWindowSize
	}

	public set mainWindowSize(value: { width: number; height: number }) {
		if (this.state.mainWindowSize.width !== value.width || this.state.mainWindowSize.height !== value.height) {
			this.state.mainWindowSize = { width: value.width, height: value.height }
			void this.save()
		}
	}

	public get developerMode() {
		return this.state.developerMode
	}
}

export const settingsManager = new SettingsManager()
