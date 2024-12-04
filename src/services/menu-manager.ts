import { reactive } from 'vue'
import {
	aboutDialog,
	changePasswordDialog,
	checkUpdateDialog,
	clipboardNote,
	contextMenu,
	deleteNodeDialog,
	env,
	ipcClient,
	isCut,
	noteEditor,
	noteManager,
	notificationManager,
	searchInput,
	shareDialog,
	showDeleteAccount,
	showShareOffers,
	showUpdate,
	updateManager,
} from '../global'
import type { ContextMenuItem, ContextMenuPosition } from './types/context-menu'
import { settingsManager } from './settings-manager'
import { mimiriPlatform } from './mimiri-platform'

export enum MenuItems {
	Separator = 'separator',
	NewNote = 'new-note',
	NewRootNote = 'new-root-note',
	Duplicate = 'duplicate',
	Cut = 'cut',
	Copy = 'copy',
	Paste = 'paste',
	Share = 'share',
	Refresh = 'refresh',
	RefreshRoot = 'refresh-root',
	Rename = 'rename',
	Delete = 'delete',
	FindInNotes = 'find-in-notes',
	Find = 'find',
	History = 'history',
	ShareOffers = 'share-offers',
	DarkMode = 'dark-mode',
	About = 'about',
	ShowDevTools = 'show-dev-tools',
	ChangePassword = 'change-password',
	DeleteAccount = 'delete-account',
	Logout = 'logout',
	Quit = 'quit',
	WorkOffline = 'work-offline',
	WordWrap = 'word-wrap',
	UpdateAvailable = 'update-available',
	MarkAsRead = 'mark-as-read',
	CheckForUpdate = 'check-for-update',
}

class MenuManager {
	public readonly state = reactive({
		menuShowing: false,
	})

	constructor() {}

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
		if (itemId === 'change-password') {
			changePasswordDialog.value.show()
		} else if (itemId === 'delete-account') {
			showDeleteAccount.value = true
		} else if (itemId === 'tray-double-click') {
			ipcClient.menu.show()
		} else if (itemId === 'tray-click') {
			ipcClient.menu.show()
		} else if (itemId === 'logout') {
			noteManager.logout()
			window.location.reload()
		} else if (itemId === 'toggle-screen-sharing') {
			settingsManager.allowScreenSharing = !settingsManager.allowScreenSharing
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
		} else if (itemId === 'share-offers') {
			showShareOffers.value = !showShareOffers.value
		} else if (itemId === 'dark-mode') {
			settingsManager.darkMode = !settingsManager.darkMode
			void settingsManager.save()
		} else if (itemId === 'word-wrap') {
			settingsManager.wordwrap = !settingsManager.wordwrap
			void settingsManager.save()
		} else if (itemId === 'about') {
			aboutDialog.value.show()
		} else if (itemId === 'show-dev-tools') {
			ipcClient.menu.showDevTools()
		}
		if (itemId === 'new-note') {
			noteManager.newNote()
		} else if (itemId === 'new-root-note') {
			noteManager.newRootNote()
		} else if (itemId === 'share') {
			shareDialog.value.show()
		} else if (itemId === 'refresh') {
			if (noteManager.selectedNote) {
				await noteManager.selectedNote.refresh()
			}
		} else if (itemId === 'refresh-root') {
			await noteManager.root.refresh()
		} else if (itemId === 'rename') {
			if (noteManager.selectedNote) {
				noteManager.selectedNote.viewModel.renaming = true
			}
		} else if (itemId === 'delete') {
			if (noteManager.selectedNote) {
				deleteNodeDialog.value.show()
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
		} else if (itemId === 'duplicate') {
			if (noteManager.selectedNote) {
				const index = noteManager.selectedNote.parent.childIds.indexOf(noteManager.selectedNote.id)
				await noteManager.selectedNote.copy(noteManager.selectedNote.parent, index + 1)
			}
		} else if (itemId === 'mark-as-read') {
			notificationManager.markAllAsRead()
		} else if (itemId === 'update-available') {
			showUpdate.value = true
		} else if (itemId === 'check-for-update') {
			await updateManager.check()
			checkUpdateDialog.value.show()
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
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
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
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.Cut:
					result.push({
						id: 'cut',
						title: 'Cut',
						shortcut: 'Ctrl+X',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.Copy:
					result.push({
						id: 'copy',
						title: 'Copy',
						shortcut: 'Ctrl+C',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.Paste:
					result.push({
						id: 'paste',
						title: 'Paste',
						shortcut: 'Ctrl+V',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.Share:
					result.push({
						id: 'share',
						title: 'Share',
						icon: 'note-shared',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
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
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.Delete:
					result.push({
						id: 'delete',
						title: 'Delete',
						shortcut: 'Del',
						icon: 'delete-note',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
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
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
					})
					break
				case MenuItems.History:
					result.push({
						id: 'history',
						title: 'History',
						icon: 'history',
						enabled: noteManager.isLoggedIn && !!noteManager.selectedNote,
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
						visible: env.MODE === 'development' && ipcClient.isAvailable,
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
				case MenuItems.Logout:
					result.push({
						id: 'logout',
						title: 'Logout',
						icon: 'logout',
						enabled: noteManager.isLoggedIn,
					})
					break
				case MenuItems.Quit:
					result.push({
						id: 'quit',
						title: 'Quit',
						visible: ipcClient.isAvailable,
					})
					break
				case MenuItems.WorkOffline:
					result.push({
						id: 'work-offline',
						title: 'Work Offline',
						visible: ipcClient.isAvailable,
						enabled: false,
					})
					break
				case MenuItems.WordWrap:
					result.push({
						id: 'word-wrap',
						title: 'Word Wrap',
						type: 'checkbox',
						checked: settingsManager.wordwrap,
						icon: settingsManager.wordwrap ? 'checkmark' : '',
						enabled: noteManager.isLoggedIn,
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
			}
		}
		return result
	}

	public updateTrayMenu() {
		if (ipcClient.isAvailable) {
			ipcClient.menu.seTrayMenu([
				{
					id: 'show',
					title: 'Show',
				},
				{
					id: 'show-dev-tools',
					title: 'Dev Tools',
				},
				{
					id: 'toggle-screen-sharing',
					title: 'Allow Screen Sharing',
					type: 'checkbox',
					checked: settingsManager.allowScreenSharing,
				},
				{
					id: 'open-at-login',
					title: 'Launch on Startup',
					type: 'checkbox',
					checked: settingsManager.openAtLogin,
				},
				{ type: 'separator' },
				{
					id: 'quit',
					title: 'Quit',
				},
			])
		}
	}
	public get appleMenu() {
		return [MenuItems.About, MenuItems.Separator, MenuItems.Logout, MenuItems.Quit]
	}

	public get fileMenu() {
		if (mimiriPlatform.isMac) {
			return [MenuItems.NewRootNote, MenuItems.NewNote]
		}
		return [MenuItems.NewRootNote, MenuItems.NewNote, MenuItems.Separator, MenuItems.Logout, MenuItems.Quit]
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
			MenuItems.Delete,
		]
	}

	public get viewMenu() {
		return [MenuItems.History, MenuItems.Share, MenuItems.Separator, MenuItems.WordWrap, MenuItems.DarkMode]
	}

	public get helpMenu() {
		return [MenuItems.About, ...(ipcClient.isAvailable ? [MenuItems.CheckForUpdate, MenuItems.ShowDevTools] : [])]
	}

	public updateAppMenu() {
		if (ipcClient.isAvailable && mimiriPlatform.isMac) {
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
