import { reactive } from 'vue'
import { env, fontManager, ipcClient } from '../global'
import { menuManager } from './menu-manager'
import { toRaw } from 'vue'
import { mimiriPlatform } from './mimiri-platform'
import { compareVersions, delay } from './helpers'
import { emptyGuid, type Guid } from './types/guid'

export enum UpdateMode {
	AutomaticOnIdle = 'auto-idle',
	AutomaticOnStart = 'auto-start',
	StrongNotify = 'manual-strong',
	DiscreteNotify = 'manual-discrete',
	ManualOnly = 'manual-only',
	Off = 'off',
}

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
	pinEnabled: boolean
	closeOnX: boolean
	updateMode: UpdateMode
	trayIcon: string
	autoLogin: boolean
	autoLoginData: string | undefined
	anonymousUsername: string | undefined
	anonymousPassword: string | undefined
	isNewInstall: boolean | undefined
	showCreateOverCancel: boolean | undefined
	alwaysEdit: boolean
	simpleEditor: boolean
	editorFontFamily: string
	editorFontSize: number
	lastNoteCreateType: string
	blogPostNotificationLevel: string
	lastReadBlogPostId: Guid
}

class SettingsManager {
	private defaultThemeIsDark: boolean
	private _saveInProgress = false
	private _outstandingSaves = 0

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
		pinEnabled: false,
		closeOnX: false,
		trayIcon: 'system',
		updateMode: UpdateMode.AutomaticOnIdle,
		autoLogin: false,
		autoLoginData: undefined,
		anonymousUsername: undefined,
		anonymousPassword: undefined,
		isNewInstall: undefined,
		showCreateOverCancel: false,
		alwaysEdit: mimiriPlatform.isDesktop,
		simpleEditor: !mimiriPlatform.isDesktop,
		editorFontFamily: 'Consolas',
		editorFontSize: 14,
		lastNoteCreateType: 'child',
		blogPostNotificationLevel: 'clearly',
		lastReadBlogPostId: emptyGuid(),
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
		this.state.editorFontFamily = fontManager.defaultEditorFontFace
		this.state.editorFontSize = fontManager.defaultEditorFontSize
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
		if (this.state.isNewInstall === undefined) {
			if (this.state.lastRunHostVersion !== '0.0.0') {
				this.state.isNewInstall = false
			} else {
				this.state.isNewInstall = true
			}
			await this.save()
		}
		fontManager.load(this.editorFontFamily)
	}

	public async save() {
		this._outstandingSaves++
		while (this._saveInProgress) {
			await delay(25)
		}
		try {
			this._saveInProgress = true
			if (ipcClient.isAvailable) {
				await ipcClient.settings.save(toRaw(this.state))
				menuManager.updateTrayMenu()
			} else if (localStorage) {
				localStorage.setItem('mimer-settings', JSON.stringify(toRaw(this.state)))
			}
		} finally {
			this._outstandingSaves--
			this._saveInProgress = false
		}
	}

	public async waitForSaveComplete() {
		while (this._outstandingSaves > 0) {
			await delay(25)
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

	public get updateMode() {
		return this.state.updateMode
	}

	public set updateMode(value: UpdateMode) {
		this.state.updateMode = value
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

	public get pinEnabled() {
		return this.state.pinEnabled
	}

	public set pinEnabled(value: boolean) {
		this.state.pinEnabled = value
		void this.save()
	}

	public get closeOnX() {
		return this.state.closeOnX
	}

	public set closeOnX(value: boolean) {
		this.state.closeOnX = value
		void this.save()
	}

	public get trayIcon() {
		return this.state.trayIcon
	}

	public set trayIcon(value: string) {
		this.state.trayIcon = value
		void this.save()
	}

	public get autoLogin() {
		return this.state.autoLogin
	}

	public set autoLogin(value: boolean) {
		this.state.autoLogin = value
		void this.save()
	}

	public get autoLoginData() {
		return this.state.autoLoginData
	}

	public set autoLoginData(value: string | undefined) {
		this.state.autoLoginData = value
		void this.save()
	}

	public get anonymousUsername() {
		return this.state.anonymousUsername
	}

	public set anonymousUsername(value: string | undefined) {
		this.state.anonymousUsername = value
		void this.save()
	}

	public get anonymousPassword() {
		return this.state.anonymousPassword
	}

	public set anonymousPassword(value: string | undefined) {
		this.state.anonymousPassword = value
		void this.save()
	}

	public get isNewInstall() {
		return !!this.state.isNewInstall
	}

	public set isNewInstall(value: boolean) {
		this.state.isNewInstall = value
		void this.save()
	}

	public get showCreateOverCancel() {
		return !!this.state.showCreateOverCancel
	}

	public set showCreateOverCancel(value: boolean) {
		this.state.showCreateOverCancel = value
		void this.save()
	}

	public get alwaysEdit() {
		return !!this.state.alwaysEdit
	}

	public set alwaysEdit(value: boolean) {
		this.state.alwaysEdit = value
		void this.save()
	}

	public get simpleEditor() {
		return !!this.state.simpleEditor
	}

	public set simpleEditor(value: boolean) {
		this.state.simpleEditor = value
		void this.save()
	}

	public get editorFontFamily() {
		return this.state.editorFontFamily
	}

	public set editorFontFamily(value: string) {
		this.state.editorFontFamily = value
		void this.save()
	}

	public get editorFontSize() {
		return this.state.editorFontSize
	}

	public set editorFontSize(value: number) {
		this.state.editorFontSize = value
		void this.save()
	}

	public get lastNoteCreateType() {
		return this.state.lastNoteCreateType
	}

	public set lastNoteCreateType(value: string) {
		this.state.lastNoteCreateType = value
		void this.save()
	}

	public get blogPostNotificationLevel() {
		return this.state.blogPostNotificationLevel
	}

	public set blogPostNotificationLevel(value: string) {
		this.state.blogPostNotificationLevel = value
		void this.save()
	}

	public get lastReadBlogPostId() {
		return this.state.lastReadBlogPostId
	}

	public set lastReadBlogPostId(value: Guid) {
		this.state.lastReadBlogPostId = value
		void this.save()
	}
}

export const settingsManager = new SettingsManager()
