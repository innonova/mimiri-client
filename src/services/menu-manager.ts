import { reactive } from 'vue'
import {
	acceptShareDialog,
	clipboardNote,
	contextMenu,
	deleteNodeDialog,
	emptyRecycleBinDialog,
	env,
	features,
	ipcClient,
	isCut,
	loginDialog,
	noteEditor,
	noteManager,
	notificationManager,
	passwordGeneratorDialog,
	searchInput,
	shareDialog,
	updateManager,
} from '../global'
import type { ContextMenuItem, ContextMenuPosition } from './types/context-menu'
import { settingsManager } from './settings-manager'
import { mimiriPlatform } from './mimiri-platform'
import type { Guid } from './types/guid'

export enum MenuItems {
	Separator = 'separator',
	NewNote = 'new-note',
	NewChildNote = 'new-child-note',
	NewSiblingNote = 'new-sibling-note',
	NewRootNote = 'new-root-note',
	Duplicate = 'duplicate',
	Cut = 'cut',
	Copy = 'copy',
	Paste = 'paste',
	CopyPath = 'copy-path',
	Share = 'share',
	ReceiveShare = 'receive-share',
	ReceiveShareUnder = 'receive-share-under',
	Refresh = 'refresh',
	RefreshRoot = 'refresh-root',
	Rename = 'rename',
	Delete = 'delete',
	Recycle = 'recycle',
	FindInNotes = 'find-in-notes',
	Find = 'find',
	History = 'history',
	ShareOffers = 'share-offers',
	DarkMode = 'dark-mode',
	About = 'about',
	ShowDevTools = 'show-dev-tools',
	ChangeUsername = 'change-username',
	ChangePassword = 'change-password',
	DeleteAccount = 'delete-account',
	ManageSubscription = 'manage-subscription',
	SetPin = 'set-pin',
	Logout = 'logout',
	Login = 'login',
	CreatePassword = 'create-password',
	Quit = 'quit',
	GoOnline = 'go-online',
	WordWrap = 'word-wrap',
	UpdateAvailable = 'update-available',
	MarkAsRead = 'mark-as-read',
	CheckForUpdate = 'check-for-update',
	AddGettingStarted = 'add-getting-started',
	EmptyRecycleBin = 'empty-recycle-bin',
	PasswordGenerator = 'password-generator',
	Settings = 'settings',
	Properties = 'properties',
}

class MenuManager {
	private _hasFocus = true
	private _lostFocusTime = Date.now()

	public readonly state = reactive({
		menuShowing: false,
	})

	constructor() {
		window.addEventListener('blur', () => {
			this._hasFocus = false
			this._lostFocusTime = Date.now()
		})
		window.addEventListener('focus', () => {
			this._hasFocus = true
		})
	}

	private async menuActivated(item: ContextMenuItem) {
		this.state.menuShowing = false
		if (!item) {
			return
		}
		if (item.enabled === false || item.visible === false) {
			return
		}
		await this.menuIdActivated(item.id)
	}

	public async menuIdActivated(itemId: string) {
		if (itemId === 'change-username') {
			noteManager.openNote('settings-username' as Guid)
		} else if (itemId === 'change-password') {
			noteManager.openNote('settings-password' as Guid)
		} else if (itemId === 'delete-account') {
			noteManager.openNote('settings-delete' as Guid)
		} else if (itemId === 'manage-subscription') {
			noteManager.openNote('settings-plan' as Guid)
		} else if (itemId === 'tray-double-click') {
			ipcClient.menu.show()
		} else if (itemId === 'tray-click') {
			if (await ipcClient.window.getIsVisible()) {
				if (!this._hasFocus && Date.now() - this._lostFocusTime > 1000) {
					ipcClient.menu.show()
				} else {
					ipcClient.menu.hide()
				}
			} else {
				ipcClient.menu.show()
			}
		} else if (itemId === 'hide') {
			if (settingsManager.closeOnX) {
				ipcClient.menu.quit()
			} else {
				ipcClient.menu.hide()
			}
		} else if (itemId === 'logout') {
			noteManager.logout()
			window.location.reload()
		} else if (itemId === 'login') {
			loginDialog.value.show()
		} else if (itemId === 'create-password') {
			noteManager.controlPanel.expand()
			noteManager.openNote('settings-create-password' as Guid)
		} else if (itemId === 'go-online') {
			noteManager.goOnline()
		} else if (itemId === 'toggle-screen-sharing') {
			settingsManager.allowScreenSharing = !settingsManager.allowScreenSharing
		} else if (itemId === 'toggle-notify-promoted') {
			settingsManager.keepTrayIconVisible = !settingsManager.keepTrayIconVisible
		} else if (itemId === 'toggle-show-in-taskbar') {
			settingsManager.showInTaskBar = !settingsManager.showInTaskBar
		} else if (itemId === 'show') {
			ipcClient.menu.show()
		} else if (itemId === 'quit') {
			ipcClient.menu.quit()
		} else if (itemId === 'open-at-login') {
			settingsManager.openAtLogin = !settingsManager.openAtLogin
		} else if (itemId === 'find-in-notes') {
			searchInput.value.focus()
		} else if (itemId === 'find') {
			noteEditor.value.find()
		} else if (itemId === 'history') {
			noteEditor.value.showHistory()
		} else if (itemId === 'dark-mode') {
			settingsManager.darkMode = !settingsManager.darkMode
		} else if (itemId === 'word-wrap') {
			settingsManager.wordwrap = !settingsManager.wordwrap
		} else if (itemId === 'about') {
			noteManager.openNote(noteManager.controlPanelId)
		} else if (itemId === 'show-dev-tools') {
			ipcClient.menu.showDevTools()
		}
		if (itemId === 'new-note') {
			noteManager.newNote()
		} else if (itemId === 'new-child-note') {
			settingsManager.lastNoteCreateType = 'child'
			noteManager.newNote()
		} else if (itemId === 'new-sibling-note') {
			settingsManager.lastNoteCreateType = 'sibling'
			if (noteManager.selectedNote.parent.isRoot) {
				noteManager.newRootNote()
				return
			}
			noteManager.selectedNote.parent?.select()
			noteManager.newNote()
		} else if (itemId === 'new-root-note') {
			noteManager.newRootNote()
		} else if (itemId === 'share') {
			shareDialog.value.show()
		} else if (itemId === 'receive-share') {
			acceptShareDialog.value.show()
		} else if (itemId === 'receive-share-under') {
			acceptShareDialog.value.show(noteManager.selectedNote)
		} else if (itemId === 'refresh') {
			if (noteManager.selectedNote) {
				// TODO handle
				// await noteManager.selectedNote.refresh()
			}
		} else if (itemId === 'refresh-root') {
			// TODO handle
			// await noteManager.root.refresh()
		} else if (itemId === 'rename') {
			if (noteManager.selectedNote) {
				noteManager.selectedNote.viewModel.renaming = true
			}
		} else if (itemId === 'delete') {
			if (noteManager.selectedNote) {
				deleteNodeDialog.value.show()
			}
		} else if (itemId === 'recycle') {
			if (noteManager.selectedNote) {
				if (noteManager.selectedNote.isShareRoot) {
					deleteNodeDialog.value.show()
				} else {
					noteManager.selectedNote.moveToRecycleBin()
				}
			}
		} else if (itemId === 'copy') {
			clipboardNote.value = noteManager.selectedNote
			isCut.value = false
		} else if (itemId === 'cut') {
			clipboardNote.value = noteManager.selectedNote
			isCut.value = true
		} else if (itemId === 'paste') {
			if (clipboardNote.value && noteManager.selectedNote) {
				noteManager.selectedNote.expand()
				if (isCut.value) {
					await clipboardNote.value.move(noteManager.selectedNote)
				} else {
					await clipboardNote.value.copy(noteManager.selectedNote)
				}
			}
		} else if (itemId === 'copy-path') {
			if (noteManager.selectedNote) {
				navigator.clipboard.writeText(noteManager.selectedNote.path)
			}
		} else if (itemId === 'duplicate') {
			if (noteManager.selectedNote) {
				const index = noteManager.selectedNote.parent.childIds.indexOf(noteManager.selectedNote.id)
				await noteManager.selectedNote.copy(noteManager.selectedNote.parent, index + 1)
			}
		} else if (itemId === 'mark-as-read') {
			notificationManager.markAllAsRead()
		} else if (itemId === 'update-available') {
			noteManager.openNote('settings-update' as Guid)
		} else if (itemId === 'check-for-update') {
			await updateManager.check()
			noteManager.openNote('settings-update' as Guid)
		} else if (itemId === 'add-getting-started') {
			await noteManager.addGettingStarted()
		} else if (itemId === 'empty-recycle-bin') {
			emptyRecycleBinDialog.value.show()
		} else if (itemId === 'password-generator') {
			passwordGeneratorDialog.value.show()
		} else if (itemId === 'set-pin') {
			noteManager.openNote('settings-pin' as Guid)
		} else if (itemId === 'settings') {
			noteManager.openNote('settings-general' as Guid)
		} else if (itemId === 'properties') {
			noteManager.openProperties()
		}
	}

	public showMenu(position: ContextMenuPosition, items: MenuItems[]) {
		this.state.menuShowing = true
		contextMenu.value.show(position, { items: this.toItems(items, false) }, item => {
			this.menuActivated(item)
		})
	}

	public close() {
		this.state.menuShowing = false
		contextMenu.value.close()
	}

	private toItems(items: MenuItems[], separatorAsItem = true) {
		const result: ContextMenuItem[] = []
		for (const item of items) {
			switch (item) {
				case MenuItems.Separator:
					if (!separatorAsItem) {
						if (result.length > 0) {
							result[result.length - 1].separatorAfter = true
						}
					} else {
						result.push({
							id: undefined,
							title: undefined,
							type: 'separator',
						})
					}
					break
				case MenuItems.NewNote:
					result.push({
						id: 'new-note',
						title: 'New Note',
						icon: 'add-note',
						shortcut: ipcClient.isAvailable ? 'Ctrl+N' : undefined,
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.NewChildNote:
					result.push({
						id: 'new-child-note',
						title: 'New Child Note',
						icon: 'add-note',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.NewSiblingNote:
					result.push({
						id: 'new-sibling-note',
						title: 'New Sibling Note',
						icon: 'add-sibling-note',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.NewRootNote:
					result.push({
						id: 'new-root-note',
						title: 'New Root Note',
						icon: 'add-root-note',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.Duplicate:
					result.push({
						id: 'duplicate',
						title: 'Duplicate',
						shortcut: 'Ctrl+D',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.Cut:
					result.push({
						id: 'cut',
						title: 'Cut',
						shortcut: 'Ctrl+X',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.Copy:
					result.push({
						id: 'copy',
						title: 'Copy',
						shortcut: 'Ctrl+C',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.Paste:
					result.push({
						id: 'paste',
						title: 'Paste',
						shortcut: 'Ctrl+V',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
					break
				case MenuItems.CopyPath:
					result.push({
						id: 'copy-path',
						title: 'Copy Path',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.Share:
					result.push({
						id: 'share',
						title: 'Share',
						icon: 'note-shared',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.ReceiveShare:
					result.push({
						id: 'receive-share',
						title: 'Accept Share',
						icon: 'note-shared',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.ReceiveShareUnder:
					result.push({
						id: 'receive-share-under',
						title: 'Accept Share Here',
						icon: 'note-shared',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.Refresh:
					result.push({
						id: 'refresh',
						title: 'Refresh',
						icon: 'refresh',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.RefreshRoot:
					result.push({
						id: 'refresh-root',
						title: 'Refresh',
						icon: 'refresh',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.Rename:
					result.push({
						id: 'rename',
						title: 'Rename',
						shortcut: 'F2',
						icon: 'rename-note',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.Delete:
					result.push({
						id: 'delete',
						title: 'Delete',
						shortcut: 'Del',
						icon: 'delete-note',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.Recycle:
					result.push({
						id: 'recycle',
						title: 'Delete',
						shortcut: 'Del',
						icon: 'delete-note',
						enabled:
							noteManager.isLoggedIn &&
							!!noteManager.selectedNote &&
							!noteManager.selectedNote.isSystem &&
							!noteManager.selectedNote.isInRecycleBin,
					})
					break
				case MenuItems.FindInNotes:
					result.push({
						id: 'find-in-notes',
						title: 'Find in Notes',
						shortcut: 'Ctrl+Shift+F',
						icon: 'search-all-notes',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.Find:
					result.push({
						id: 'find',
						title: 'Find',
						shortcut: 'Ctrl+F',
						icon: 'search-note',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.History:
					result.push({
						id: 'history',
						title: 'History',
						icon: 'history',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.ShareOffers:
					result.push({
						id: 'share-offers',
						title: 'Share Offers',
						icon: 'note-shared',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.DarkMode:
					result.push({
						id: 'dark-mode',
						title: 'Dark Mode',
						type: 'checkbox',
						checked: settingsManager.darkMode,
						icon: settingsManager.darkMode ? 'checkmark' : '',
					})
					break
				case MenuItems.About:
					result.push({
						id: 'about',
						title: 'About',
						icon: 'note',
					})
					break
				case MenuItems.ShowDevTools:
					result.push({
						id: 'show-dev-tools',
						title: 'Show Dev Tools',
						visible: (env.DEV || settingsManager.developerMode) && ipcClient.isAvailable,
					})
					break
				case MenuItems.ChangeUsername:
					result.push({
						id: 'change-username',
						title: 'Change Username',
						enabled: noteManager.isLoggedIn && noteManager.isOnline,
					})
					break
				case MenuItems.ChangePassword:
					result.push({
						id: 'change-password',
						title: 'Change Password',
						enabled: noteManager.isLoggedIn && noteManager.isOnline,
					})
					break
				case MenuItems.DeleteAccount:
					result.push({
						id: 'delete-account',
						title: 'Delete Account',
						enabled: noteManager.isLoggedIn && noteManager.isOnline,
					})
					break
				case MenuItems.ManageSubscription:
					result.push({
						id: 'manage-subscription',
						title: 'Plan',
						enabled: noteManager.isLoggedIn && noteManager.isOnline,
						visible: !noteManager.isAnonymous,
					})
					break
				case MenuItems.SetPin:
					result.push({
						id: 'set-pin',
						title: 'Set PIN',
						enabled: noteManager.isLoggedIn && noteManager.isOnline,
					})
					break
				case MenuItems.Logout:
					result.push({
						id: 'logout',
						title: 'Logout',
						icon: 'logout',
						enabled: noteManager.isLoggedIn,
						visible: !noteManager.isAnonymous,
					})
					break
				case MenuItems.Login:
					result.push({
						id: 'login',
						title: 'Log In / Switch User',
						icon: 'login',
						enabled: noteManager.isLoggedIn,
						visible: noteManager.isAnonymous,
					})
					break
				case MenuItems.CreatePassword:
					result.push({
						id: 'create-password',
						title: 'Create Password',
						icon: 'account',
						visible: noteManager.isAnonymous,
					})
					break
				case MenuItems.Quit:
					result.push({
						id: 'quit',
						title: 'Quit',
						visible: ipcClient.isAvailable,
					})
					break
				case MenuItems.GoOnline:
					result.push({
						id: 'go-online',
						title: 'Go Online',
						enabled: noteManager.isLoggedIn && !noteManager.isOnline,
					})
					break
				case MenuItems.WordWrap:
					result.push({
						id: 'word-wrap',
						title: 'Word Wrap',
						type: 'checkbox',
						checked: settingsManager.wordwrap,
						icon: settingsManager.wordwrap ? 'checkmark' : '',
						enabled: noteManager.isLoggedIn && !noteManager.selectedNote.isSystem,
					})
					break
				case MenuItems.UpdateAvailable:
					result.push({
						id: 'update-available',
						title: 'Update Available',
					})
					break
				case MenuItems.MarkAsRead:
					result.push({
						id: 'mark-as-read',
						title: 'Mark as Read',
					})
					break
				case MenuItems.CheckForUpdate:
					result.push({
						id: 'check-for-update',
						title: 'Check for Updates',
					})
					break
				case MenuItems.AddGettingStarted:
					result.push({
						id: 'add-getting-started',
						title: 'Add Getting Started',
					})
					break
				case MenuItems.EmptyRecycleBin:
					result.push({
						id: 'empty-recycle-bin',
						title: 'Empty',
					})
					break
				case MenuItems.PasswordGenerator:
					result.push({
						id: 'password-generator',
						title: 'Password Generator',
					})
					break
				case MenuItems.Settings:
					result.push({
						id: 'settings',
						title: 'Settings',
					})
					break
				case MenuItems.Properties:
					result.push({
						id: 'properties',
						title: 'Properties',
					})
					break
			}
		}
		return result
	}

	public updateTrayMenu() {
		if (ipcClient.isAvailable) {
			ipcClient.menu.seTrayMenu(
				[
					{
						id: 'show',
						title: 'Show',
					},
					{
						id: 'show-dev-tools',
						title: 'Dev Tools',
					},
					...(!mimiriPlatform.isLinuxApp
						? [
								{
									id: 'toggle-screen-sharing',
									title: 'Allow Screen Sharing',
									type: 'checkbox',
									checked: settingsManager.allowScreenSharing,
								},
							]
						: []),
					...(mimiriPlatform.isWindowsApp
						? [
								{
									id: 'toggle-notify-promoted',
									title: 'Keep Tray Icon Visible',
									type: 'checkbox',
									checked: settingsManager.keepTrayIconVisible,
								},
								{
									id: 'toggle-show-in-taskbar',
									title: 'Show In Taskbar',
									type: 'checkbox',
									checked: settingsManager.showInTaskBar,
								},
							]
						: []),
					...(!mimiriPlatform.isFlatpak
						? [
								{
									id: 'open-at-login',
									title: 'Launch on Startup',
									type: 'checkbox',
									checked: settingsManager.openAtLogin,
								},
							]
						: []),
					{ type: 'separator' },
					{
						id: 'quit',
						title: 'Quit',
					},
				],
				{
					trayIcon: settingsManager.trayIcon,
				},
			)
		}
	}

	public get appleMenu() {
		return [
			MenuItems.About,
			MenuItems.Separator,
			MenuItems.CreatePassword,
			MenuItems.Login,
			MenuItems.Logout,
			MenuItems.Quit,
		]
	}

	public get fileMenu() {
		if (mimiriPlatform.isMacApp) {
			return [MenuItems.NewRootNote, MenuItems.NewNote]
		}

		const codeEnabled = features.includes('share-code')

		return [
			MenuItems.NewRootNote,
			MenuItems.NewNote,
			...(codeEnabled ? [MenuItems.Separator, MenuItems.ReceiveShare] : []),
			MenuItems.Separator,
			MenuItems.CreatePassword,
			MenuItems.Login,
			MenuItems.Logout,
			MenuItems.Quit,
		]
	}

	public get editMenu() {
		return [
			MenuItems.FindInNotes,
			MenuItems.Find,
			MenuItems.Separator,
			MenuItems.Duplicate,
			MenuItems.Cut,
			MenuItems.Copy,
			MenuItems.Paste,
			MenuItems.Separator,
			MenuItems.Share,
			MenuItems.Rename,
			noteManager.selectedNote?.isInRecycleBin ? MenuItems.Delete : MenuItems.Recycle,
			MenuItems.Separator,
			MenuItems.Settings,
		]
	}

	public get viewMenu() {
		const showShareOffers = !features.includes('share-code')
		return [
			MenuItems.History,
			...(showShareOffers ? [MenuItems.ShareOffers] : []),
			MenuItems.Separator,
			MenuItems.WordWrap,
			MenuItems.DarkMode,
		]
	}

	public get toolsMenu() {
		return [MenuItems.PasswordGenerator]
	}

	public get helpMenu() {
		return [
			MenuItems.About,
			...(ipcClient.isAvailable ? [MenuItems.CheckForUpdate, MenuItems.ShowDevTools] : []),
			...(env.DEV || settingsManager.developerMode ? [MenuItems.Separator, MenuItems.AddGettingStarted] : []),
		]
	}

	public updateAppMenu() {
		if (ipcClient.isAvailable && mimiriPlatform.isMacApp) {
			ipcClient.menu.setAppMenu([
				{
					title: 'Mimiri Notes',
					submenu: this.toItems(this.appleMenu),
				},
				{
					title: 'File',
					submenu: this.toItems(this.fileMenu),
				},
				{
					title: 'Edit',
					submenu: this.toItems(this.editMenu),
				},
				{
					title: 'View',
					submenu: this.toItems(this.viewMenu),
				},
				{
					title: 'Help',
					submenu: this.toItems(this.helpMenu),
				},
			])
		}
	}
}

export const menuManager = new MenuManager()
