import { reactive } from 'vue'
import { ipcClient } from '../global'
import { menuManager } from './menu-manager'

export interface MimerConfiguration {
	openAtLogin: boolean
	allowScreenSharing: boolean
	theme: string
	titleBarColor: string
	titleBarSymbolColor: string
	titleBarHeight: number
	wordwrap: boolean
	channel: string
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
		wordwrap: false,
		channel: 'stable',
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
			await ipcClient.settings.save({ ...this.state })
			menuManager.updateTrayMenu()
		} else if (localStorage) {
			localStorage.setItem('mimer-settings', JSON.stringify({ ...this.state }))
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

	public get channel() {
		return this.state.channel
	}

	public set channel(value: string) {
		this.state.channel = value
		void this.save()
	}
}

export const settingsManager = new SettingsManager()
