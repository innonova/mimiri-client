import { reactive } from 'vue'
import {
	aboutDialog,
	changePasswordDialog,
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

	private async menuActivated(item: ContextMenuItem) {
		this.state.menuShowing = false
		if (!item) {
			return
		}
		if (item.enabled === false || item.visible === false) {
			return
		}
		if (item.id === 'change-password') {
			changePasswordDialog.value.show()
		} else if (item.id === 'delete-account') {
			showDeleteAccount.value = true
		} else if (item.id === 'logout') {
			noteManager.logout()
			window.location.reload()
		} else if (item.id === 'quit') {
			ipcClient.menu.quit()
		} else if (item.id === 'find-in-notes') {
			searchInput.value.focus()
		} else if (item.id === 'find') {
			noteEditor.value.find()
		} else if (item.id === 'history') {
			noteEditor.value.showHistory()
		} else if (item.id === 'share-offers') {
			showShareOffers.value = !showShareOffers.value
		} else if (item.id === 'dark-mode') {
			settingsManager.darkMode = !settingsManager.darkMode
			void settingsManager.save()
		} else if (item.id === 'word-wrap') {
			settingsManager.wordwrap = !settingsManager.wordwrap
			void settingsManager.save()
		} else if (item.id === 'about') {
			aboutDialog.value.show()
		} else if (item.id === 'show-dev-tools') {
			ipcClient.menu.showDevTools()
		}
		if (item.id === 'new-note') {
			noteManager.newNote()
		} else if (item.id === 'new-root-note') {
			noteManager.newRootNote()
		} else if (item.id === 'share') {
			shareDialog.value.show()
		} else if (item.id === 'refresh') {
			if (noteManager.selectedNote) {
				await noteManager.selectedNote.refresh()
			}
		} else if (item.id === 'refresh-root') {
			await noteManager.root.refresh()
		} else if (item.id === 'rename') {
			if (noteManager.selectedNote) {
				noteManager.selectedNote.viewModel.renaming = true
			}
		} else if (item.id === 'delete') {
			if (noteManager.selectedNote) {
				deleteNodeDialog.value.show()
			}
		} else if (item.id === 'copy') {
			clipboardNote.value = noteManager.selectedNote
			isCut.value = false
		} else if (item.id === 'cut') {
			clipboardNote.value = noteManager.selectedNote
			isCut.value = true
		} else if (item.id === 'paste') {
			if (clipboardNote.value && noteManager.selectedNote) {
				noteManager.selectedNote.expand()
				if (isCut.value) {
					await clipboardNote.value.move(noteManager.selectedNote)
				} else {
					await clipboardNote.value.copy(noteManager.selectedNote)
				}
			}
		} else if (item.id === 'duplicate') {
			if (noteManager.selectedNote) {
				const index = noteManager.selectedNote.parent.childIds.indexOf(noteManager.selectedNote.id)
				await noteManager.selectedNote.copy(noteManager.selectedNote.parent, index + 1)
			}
		} else if (item.id === 'mark-as-read') {
			notificationManager.markAllAsRead()
		} else if (item.id === 'update-available') {
			showUpdate.value = true
		} else if (item.id === 'check-for-update') {
			updateManager.check()
		}
	}

	public showMenu(position: ContextMenuPosition, items: MenuItems[]) {
		this.state.menuShowing = true
		contextMenu.value.show(position, { items: this.toItems(items) }, item => {
			this.menuActivated(item)
		})
	}

	public close() {
		this.state.menuShowing = false
		contextMenu.value.close()
	}

	private toItems(items: MenuItems[]) {
		const result: ContextMenuItem[] = []
		for (const item of items) {
			switch (item) {
				case MenuItems.Separator:
					if (result.length > 0) {
						result[result.length - 1].separatorAfter = true
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
}

export const menuManager = new MenuManager()
