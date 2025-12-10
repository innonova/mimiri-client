import { reactive } from 'vue'
import { fontManager, ipcClient } from '../global'
import { menuManager } from './menu-manager'
import { toRaw } from 'vue'
import { mimiriPlatform } from './mimiri-platform'
import { delay } from './helpers'
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
	editorTheme: string | undefined
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
	closeOnX: boolean
	updateMode: UpdateMode
	trayIcon: string
	anonymousUsername: string | undefined
	anonymousPassword: string | undefined
	isNewInstall: boolean | undefined
	showCreateOverCancel: boolean | undefined
	editorFontFamily: string
	editorFontSize: number
	lastNoteCreateType: string
	blogPostNotificationLevel: string
	lastReadBlogPostId: Guid
	disableDevBlog: boolean
	startOnLocalAccount: boolean
	useChevrons: boolean
	showVerticalGuides: boolean
	debugEnabled?: boolean
	startCount: number
	systemTheme: string
	defaultEditor: string | undefined
	defaultEditorMobile: string
}

class SettingsManager {
	private _saveInProgress = false
	private _saveRequestedWhileInProgress = false

	public state: MimerConfiguration = reactive({
		openAtLogin: true,
		allowScreenSharing: false,
		theme: 'default',
		editorTheme: undefined,
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
		closeOnX: false,
		trayIcon: 'system',
		updateMode: UpdateMode.AutomaticOnIdle,
		anonymousUsername: undefined,
		anonymousPassword: undefined,
		isNewInstall: undefined,
		showCreateOverCancel: false,
		editorFontFamily: 'Consolas',
		editorFontSize: 14,
		lastNoteCreateType: 'child',
		blogPostNotificationLevel: 'clearly',
		lastReadBlogPostId: emptyGuid(),
		disableDevBlog: false,
		startOnLocalAccount: false,
		useChevrons: true,
		showVerticalGuides: true,
		debugEnabled: undefined,
		startCount: 0,
		systemTheme: 'light',
		defaultEditor: undefined,
		defaultEditorMobile: 'wysiwyg',
	})

	constructor() {
		this.state.systemTheme = !!window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
		const mql = window.matchMedia('(prefers-color-scheme: dark)')
		mql.addEventListener('change', event => {
			this.state.systemTheme = event.matches ? 'dark' : 'light'
		})
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
			const rules = await ipcClient.os.rules()
			if (settings) {
				Object.assign(this.state, settings)
			} else if (rules?.flags?.includes('requires-permissions')) {
				this.state.openAtLogin = false
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
				if (this.state.defaultEditor === undefined) {
					// TODO implement selection prompt
					this.state.defaultEditor = 'code'
				}
			} else {
				this.state.isNewInstall = true
			}
		}
		this.state.startCount = (this.state.startCount || 0) + 1
		await this.save()
		fontManager.load(this.editorFontFamily)
	}

	public async save() {
		if (!this._saveInProgress) {
			try {
				this._saveInProgress = true
				while (true) {
					await delay(0)
					this._saveRequestedWhileInProgress = false
					if (ipcClient.isAvailable) {
						await ipcClient.settings.save(toRaw(this.state))
						void menuManager.updateTrayMenu()
					} else if (localStorage) {
						localStorage.setItem('mimer-settings', JSON.stringify(toRaw(this.state)))
					}
					if (this._saveRequestedWhileInProgress) {
						this._saveRequestedWhileInProgress = false
						continue
					}
					break
				}
			} finally {
				this._saveInProgress = false
			}
		} else {
			this._saveRequestedWhileInProgress = true
		}
	}

	public async waitForSaveComplete() {
		while (this._saveInProgress) {
			await delay(25)
		}
	}

	public get darkMode() {
		const useSystem = this.state.theme === 'default'
		const themeIsDark = this.state.theme === 'dark'
		const systemIsDark = this.state.systemTheme === 'dark'
		if (useSystem) {
			return systemIsDark
		}
		return themeIsDark
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

	public get theme() {
		return this.state.theme
	}

	public set theme(value: string) {
		this.state.theme = value
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

	public get disableDevBlog() {
		return !!this.state.disableDevBlog
	}

	public set disableDevBlog(value: boolean) {
		this.state.disableDevBlog = value
		void this.save()
	}

	public get startOnLocalAccount() {
		return !!this.state.startOnLocalAccount
	}

	public set startOnLocalAccount(value: boolean) {
		this.state.startOnLocalAccount = value
		void this.save()
	}

	public get useChevrons() {
		return !!this.state.useChevrons
	}

	public set useChevrons(value: boolean) {
		this.state.useChevrons = value
		void this.save()
	}

	public get showVerticalGuides() {
		return !!this.state.showVerticalGuides
	}

	public set showVerticalGuides(value: boolean) {
		this.state.showVerticalGuides = value
		void this.save()
	}

	public get debugEnabled() {
		return !!this.state.debugEnabled
	}

	public set debugEnabled(value: boolean) {
		this.state.debugEnabled = value
		void this.save()
	}

	public get startCount() {
		return this.state.startCount || 0
	}

	public get defaultEditor() {
		return this.state.defaultEditor
	}

	public set defaultEditor(value: string | undefined) {
		this.state.defaultEditor = value
		void this.save()
	}

	public get defaultEditorMobile() {
		return this.state.defaultEditorMobile
	}

	public set defaultEditorMobile(value: string) {
		this.state.defaultEditorMobile = value
		void this.save()
	}
}

export const settingsManager = new SettingsManager()
