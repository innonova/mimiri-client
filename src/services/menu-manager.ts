import { reactive } from 'vue'
import {
	$t,
	acceptShareDialog,
	clipboardNote,
	contextMenu,
	deleteLocalDataDialog,
	deleteNodeDialog,
	emptyRecycleBinDialog,
	env,
	infoDialog,
	ipcClient,
	isCut,
	loginDialog,
	loginRequiredToGoOnline,
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
import { AccountType } from './storage/type'
import { MimiriException, MimiriExceptionType } from './types/exceptions'

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
	CreateAccount = 'create-account',
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
	WorkOffline = 'work-offline',
	ExportNotes = 'export-notes',
	ImportNotes = 'import-notes',
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
			noteManager.tree.openNote('settings-username' as Guid)
		} else if (itemId === 'change-password') {
			noteManager.tree.openNote('settings-password' as Guid)
		} else if (itemId === 'delete-account') {
			noteManager.tree.openNote('settings-delete' as Guid)
		} else if (itemId === 'manage-subscription') {
			noteManager.tree.openNote('settings-plan' as Guid)
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
			if (mimiriPlatform.isWeb && noteManager.state.accountType === AccountType.Cloud) {
				deleteLocalDataDialog.value.show()
			} else {
				await noteManager.session.logout(true)
				window.location.reload()
			}
		} else if (itemId === 'login') {
			loginDialog.value.show()
		} else if (itemId === 'create-account') {
			await noteManager.tree.controlPanel().expand()
			noteManager.tree.openNote('settings-create-account' as Guid)
		} else if (itemId === 'create-password') {
			await noteManager.tree.controlPanel().expand()
			noteManager.tree.openNote('settings-create-password' as Guid)
		} else if (itemId === 'go-online') {
			await noteManager.session.goOnline()
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
			noteManager.tree.openNote(noteManager.tree.controlPanelId())
		} else if (itemId === 'show-dev-tools') {
			ipcClient.menu.showDevTools()
		} else if (itemId === 'export-notes') {
			await noteManager.operations.exportAllNotes()
		} else if (itemId === 'import-notes') {
			await noteManager.operations.importAllNotes()
		}
		if (itemId === 'new-note') {
			noteManager.ui.newNote()
		} else if (itemId === 'new-child-note') {
			settingsManager.lastNoteCreateType = 'child'
			noteManager.ui.newNote()
		} else if (itemId === 'new-sibling-note') {
			settingsManager.lastNoteCreateType = 'sibling'
			if (noteManager.tree.selectedNote().parent.isRoot) {
				noteManager.ui.newRootNote()
				return
			}
			await noteManager.tree.selectedNote().parent?.select()
			noteManager.ui.newNote()
		} else if (itemId === 'new-root-note') {
			noteManager.ui.newRootNote()
		} else if (itemId === 'share') {
			shareDialog.value.show()
		} else if (itemId === 'receive-share') {
			acceptShareDialog.value.show()
		} else if (itemId === 'receive-share-under') {
			acceptShareDialog.value.show(noteManager.tree.selectedNote())
		} else if (itemId === 'refresh') {
			if (noteManager.tree.selectedNote()) {
				noteManager.session.queueSync()
			}
		} else if (itemId === 'refresh-root') {
			noteManager.session.queueSync()
		} else if (itemId === 'rename') {
			if (noteManager.tree.selectedNote()) {
				noteManager.tree.selectedNote().viewModel.renaming = true
			}
		} else if (itemId === 'delete') {
			if (noteManager.tree.selectedNote()) {
				deleteNodeDialog.value.show()
			}
		} else if (itemId === 'recycle') {
			if (noteManager.tree.selectedNote()) {
				if (noteManager.tree.selectedNote().isShareRoot) {
					deleteNodeDialog.value.show()
				} else {
					try {
						await noteManager.tree.selectedNote().moveToRecycleBin()
					} catch (error) {
						if (
							error instanceof MimiriException &&
							error.type === MimiriExceptionType.CannotDeleteWithSharedDescendant
						) {
							infoDialog.value.show(error.title, error.message)
						}
					}
				}
			}
		} else if (itemId === 'copy') {
			if (document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) {
				clipboardNote.value = noteManager.tree.selectedNote()
				isCut.value = false
			} else if (mimiriPlatform.isMacApp) {
				void (async () => {
					const copyEvent = new ClipboardEvent('copy', {
						bubbles: true,
						cancelable: true,
						clipboardData: new DataTransfer(),
					})

					document.activeElement.dispatchEvent(copyEvent)

					const text = copyEvent.clipboardData.getData('text/plain')

					if (text) {
						try {
							await navigator.clipboard.writeText(text)
						} catch (err) {
							console.error('Clipboard write failed:', err)
						}
					}
				})().catch(err => {
					console.error('Clipboard paste failed:', err)
				})
			}
		} else if (itemId === 'cut') {
			if (document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) {
				clipboardNote.value = noteManager.tree.selectedNote()
				isCut.value = true
			} else if (mimiriPlatform.isMacApp) {
				void (async () => {
					const copyEvent = new ClipboardEvent('cut', {
						bubbles: true,
						cancelable: true,
						clipboardData: new DataTransfer(),
					})

					document.activeElement.dispatchEvent(copyEvent)

					const text = copyEvent.clipboardData.getData('text/plain')

					if (text) {
						try {
							await navigator.clipboard.writeText(text)
						} catch (err) {
							console.error('Clipboard write failed:', err)
						}
					}
				})().catch(err => {
					console.error('Clipboard paste failed:', err)
				})
			}
		} else if (itemId === 'paste') {
			if (document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) {
				if (clipboardNote.value && noteManager.tree.selectedNote()) {
					await noteManager.tree.selectedNote().expand()
					if (isCut.value) {
						await clipboardNote.value.move(noteManager.tree.selectedNote())
					} else {
						await clipboardNote.value.copy(noteManager.tree.selectedNote())
					}
				}
			} else if (mimiriPlatform.isMacApp) {
				void (async () => {
					const text = await navigator.clipboard.readText()

					const pasteEvent = new ClipboardEvent('paste', {
						bubbles: true,
						cancelable: true,
						clipboardData: new DataTransfer(),
					})

					pasteEvent.clipboardData.setData('text/plain', text)
					document.activeElement.dispatchEvent(pasteEvent)
				})().catch(err => {
					console.error('Clipboard paste failed:', err)
				})
			}
		} else if (itemId === 'copy-path') {
			if (noteManager.tree.selectedNote()) {
				await navigator.clipboard.writeText(noteManager.tree.selectedNote().path)
			}
		} else if (itemId === 'duplicate') {
			if (noteManager.tree.selectedNote()) {
				const index = noteManager.tree.selectedNote().parent.childIds.indexOf(noteManager.tree.selectedNote().id)
				await noteManager.tree.selectedNote().copy(noteManager.tree.selectedNote().parent, index + 1)
			}
		} else if (itemId === 'mark-as-read') {
			notificationManager.markAllAsRead()
		} else if (itemId === 'update-available') {
			noteManager.tree.openNote('settings-update' as Guid)
		} else if (itemId === 'check-for-update') {
			await updateManager.check()
			noteManager.tree.openNote('settings-update' as Guid)
		} else if (itemId === 'add-getting-started') {
			await noteManager.session.addGettingStarted()
		} else if (itemId === 'empty-recycle-bin') {
			emptyRecycleBinDialog.value.show()
		} else if (itemId === 'password-generator') {
			passwordGeneratorDialog.value.show()
		} else if (itemId === 'set-pin') {
			noteManager.tree.openNote('settings-pin' as Guid)
		} else if (itemId === 'settings') {
			noteManager.tree.openNote('settings-general' as Guid)
		} else if (itemId === 'properties') {
			noteManager.tree.openProperties()
		} else if (itemId === 'work-offline') {
			await noteManager.session.toggleWorkOffline()
			if (loginRequiredToGoOnline.value) {
				loginRequiredToGoOnline.value = false
				loginDialog.value.show(true)
			}
		}
	}

	public showMenu(position: ContextMenuPosition, items: MenuItems[]) {
		this.state.menuShowing = true
		contextMenu.value.show(position, { items: this.toItems(items, false) }, item => {
			void this.menuActivated(item)
		})
	}

	public close() {
		this.state.menuShowing = false
		contextMenu.value.close()
	}

	private toItems(items: MenuItems[], separatorAsItem = true) {
		let showShare = true
		if (noteManager.tree.selectedNote()?.isShared) {
			const note = noteManager.tree.getNoteById(noteManager.tree.selectedNote().id)
			showShare = note.isShareRoot
		}
		if (!noteManager.state.isOnline || noteManager.tree.selectedNote()?.isSystem) {
			showShare = false
		}

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
						title: $t('contextMenu.newNote'),
						icon: 'add-note',
						shortcut: ipcClient.isAvailable ? 'Ctrl+N' : undefined,
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.NewChildNote:
					result.push({
						id: 'new-child-note',
						title: $t('contextMenu.newChildNote'),
						icon: 'add-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.NewSiblingNote:
					result.push({
						id: 'new-sibling-note',
						title: $t('contextMenu.newSiblingNote'),
						icon: 'add-sibling-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.NewRootNote:
					result.push({
						id: 'new-root-note',
						title: $t('contextMenu.newRootNote'),
						icon: 'add-root-note',
						enabled: noteManager.state.isLoggedIn,
					})
					break
				case MenuItems.Duplicate:
					result.push({
						id: 'duplicate',
						title: $t('contextMenu.duplicate'),
						shortcut: 'Ctrl+D',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.Cut:
					result.push({
						id: 'cut',
						title: $t('contextMenu.cut'),
						shortcut: 'Ctrl+X',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.Copy:
					result.push({
						id: 'copy',
						title: $t('contextMenu.copy'),
						shortcut: 'Ctrl+C',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.Paste:
					result.push({
						id: 'paste',
						title: $t('contextMenu.paste'),
						shortcut: 'Ctrl+V',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
					break
				case MenuItems.CopyPath:
					result.push({
						id: 'copy-path',
						title: $t('contextMenu.copyPath'),
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.Share:
					result.push({
						id: 'share',
						title: $t('contextMenu.share'),
						icon: 'note-shared',
						visible: showShare,
						enabled:
							noteManager.state.isLoggedIn &&
							showShare &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.ReceiveShare:
					result.push({
						id: 'receive-share',
						title: $t('contextMenu.acceptShare'),
						icon: 'note-shared',
						visible: noteManager.state.isLoggedIn && noteManager.state.isOnline,
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.ReceiveShareUnder:
					result.push({
						id: 'receive-share-under',
						title: $t('contextMenu.acceptShareHere'),
						icon: 'note-shared',
						visible: noteManager.state.isLoggedIn && noteManager.state.isOnline,
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.Refresh:
					result.push({
						id: 'refresh',
						title: $t('contextMenu.refresh'),
						icon: 'refresh',
						enabled: noteManager.state.isLoggedIn && !!noteManager.tree.selectedNote(),
					})
					break
				case MenuItems.RefreshRoot:
					result.push({
						id: 'refresh-root',
						title: $t('contextMenu.refresh'),
						icon: 'refresh',
						enabled: noteManager.state.isLoggedIn,
					})
					break
				case MenuItems.Rename:
					result.push({
						id: 'rename',
						title: $t('contextMenu.rename'),
						shortcut: 'F2',
						icon: 'rename-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.Delete:
					result.push({
						id: 'delete',
						title: $t('contextMenu.delete'),
						shortcut: 'Del',
						icon: 'delete-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.Recycle:
					result.push({
						id: 'recycle',
						title: $t('contextMenu.delete'),
						shortcut: 'Del',
						icon: 'delete-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem &&
							!noteManager.tree.selectedNote().isInRecycleBin,
					})
					break
				case MenuItems.FindInNotes:
					result.push({
						id: 'find-in-notes',
						title: $t('contextMenu.findInNotes'),
						shortcut: 'Ctrl+Shift+F',
						icon: 'search-all-notes',
						enabled: noteManager.state.isLoggedIn,
					})
					break
				case MenuItems.Find:
					result.push({
						id: 'find',
						title: $t('contextMenu.find'),
						shortcut: 'Ctrl+F',
						icon: 'search-note',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.History:
					result.push({
						id: 'history',
						title: $t('contextMenu.history'),
						icon: 'history',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.ShareOffers:
					result.push({
						id: 'share-offers',
						title: $t('contextMenu.shareOffers'),
						icon: 'note-shared',
						enabled: noteManager.state.isLoggedIn,
					})
					break
				case MenuItems.DarkMode:
					result.push({
						id: 'dark-mode',
						title: $t('contextMenu.darkMode'),
						type: 'checkbox',
						checked: settingsManager.darkMode,
						icon: settingsManager.darkMode ? 'checkmark' : '',
					})
					break
				case MenuItems.About:
					result.push({
						id: 'about',
						title: $t('contextMenu.about'),
						icon: 'note',
					})
					break
				case MenuItems.ShowDevTools:
					result.push({
						id: 'show-dev-tools',
						title: $t('contextMenu.showDevTools'),
						visible: (env.DEV || settingsManager.developerMode) && ipcClient.isAvailable,
					})
					break
				case MenuItems.ChangeUsername:
					result.push({
						id: 'change-username',
						title: $t('contextMenu.changeUsername'),
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.ChangePassword:
					result.push({
						id: 'change-password',
						title: $t('contextMenu.changePassword'),
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.DeleteAccount:
					result.push({
						id: 'delete-account',
						title: $t('contextMenu.deleteAccount'),
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.ManageSubscription:
					result.push({
						id: 'manage-subscription',
						title: $t('contextMenu.plan'),
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
						visible: noteManager.state.accountType === AccountType.Cloud,
					})
					break
				case MenuItems.SetPin:
					result.push({
						id: 'set-pin',
						title: $t('contextMenu.setPin'),
						enabled: noteManager.state.isLoggedIn && noteManager.state.isOnline,
					})
					break
				case MenuItems.Logout:
					result.push({
						id: 'logout',
						title: $t('contextMenu.logout'),
						icon: 'logout',
						enabled: noteManager.state.isLoggedIn,
						visible: noteManager.state.accountType !== AccountType.None,
					})
					break
				case MenuItems.Login:
					result.push({
						id: 'login',
						title: $t('contextMenu.loginSwitchUser'),
						icon: 'login',
						enabled: noteManager.state.isLoggedIn,
						visible: noteManager.state.accountType === AccountType.None || noteManager.state.isAnonymous,
					})
					break
				case MenuItems.CreateAccount:
					result.push({
						id: 'create-account',
						title: $t('contextMenu.createAccount'),
						icon: 'account',
					})
					break
				case MenuItems.CreatePassword:
					result.push({
						id: 'create-password',
						title: $t('contextMenu.createPassword'),
						icon: 'account',
						visible: noteManager.state.isAnonymous,
					})
					break
				case MenuItems.Quit:
					result.push({
						id: 'quit',
						title: $t('contextMenu.quit'),
						visible: ipcClient.isAvailable,
					})
					break
				case MenuItems.GoOnline:
					result.push({
						id: 'go-online',
						title: $t('contextMenu.goOnline'),
						enabled: noteManager.state.isLoggedIn && !noteManager.state.isOnline,
					})
					break
				case MenuItems.WordWrap:
					result.push({
						id: 'word-wrap',
						title: $t('contextMenu.wordWrap'),
						type: 'checkbox',
						checked: settingsManager.wordwrap,
						icon: settingsManager.wordwrap ? 'checkmark' : '',
						enabled:
							noteManager.state.isLoggedIn &&
							!!noteManager.tree.selectedNote() &&
							!noteManager.tree.selectedNote().isSystem,
					})
					break
				case MenuItems.UpdateAvailable:
					result.push({
						id: 'update-available',
						title: $t('contextMenu.updateAvailable'),
					})
					break
				case MenuItems.MarkAsRead:
					result.push({
						id: 'mark-as-read',
						title: $t('contextMenu.markAsRead'),
					})
					break
				case MenuItems.CheckForUpdate:
					result.push({
						id: 'check-for-update',
						title: $t('contextMenu.checkForUpdates'),
					})
					break
				case MenuItems.AddGettingStarted:
					result.push({
						id: 'add-getting-started',
						title: $t('contextMenu.addGettingStarted'),
					})
					break
				case MenuItems.EmptyRecycleBin:
					result.push({
						id: 'empty-recycle-bin',
						title: $t('contextMenu.emptyRecycleBin'),
					})
					break
				case MenuItems.PasswordGenerator:
					result.push({
						id: 'password-generator',
						title: $t('contextMenu.passwordGenerator'),
					})
					break
				case MenuItems.Settings:
					result.push({
						id: 'settings',
						title: $t('contextMenu.settings'),
					})
					break
				case MenuItems.Properties:
					result.push({
						id: 'properties',
						title: $t('contextMenu.properties'),
					})
					break
				case MenuItems.WorkOffline:
					result.push({
						id: 'work-offline',
						title: $t('contextMenu.workOffline'),
						checked: noteManager.state.workOffline,
					})
					break
				case MenuItems.ExportNotes:
					result.push({
						id: 'export-notes',
						title: $t('contextMenu.exportNotes'),
						enabled: noteManager.state.isLoggedIn,
						visible: ipcClient.isAvailable,
					})
					break
				case MenuItems.ImportNotes:
					result.push({
						id: 'import-notes',
						title: $t('contextMenu.importNotes'),
						enabled: noteManager.state.isLoggedIn,
						visible: ipcClient.isAvailable,
					})
					break
			}
		}
		return result
	}

	public async updateTrayMenu() {
		if (ipcClient.isAvailable) {
			const rules = await ipcClient.os.rules()
			const isGnome = rules?.flags?.find(r => r.toLowerCase().includes('gnome'))
			const isWayland = rules?.flags?.includes('wayland')

			ipcClient.menu.seTrayMenu(
				[
					{
						id: 'show',
						title: $t('contextMenu.trayShow'),
					},
					...(!(isGnome && isWayland)
						? [
								{
									id: 'show-dev-tools',
									title: $t('contextMenu.trayDevTools'),
								},
							]
						: []),
					...(!mimiriPlatform.isLinuxApp
						? [
								{
									id: 'toggle-screen-sharing',
									title: $t('contextMenu.trayAllowScreenSharing'),
									type: 'checkbox',
									checked: settingsManager.allowScreenSharing,
								},
							]
						: []),
					...(mimiriPlatform.isWindowsApp
						? [
								{
									id: 'toggle-notify-promoted',
									title: $t('contextMenu.trayKeepTrayVisible'),
									type: 'checkbox',
									checked: settingsManager.keepTrayIconVisible,
								},
								{
									id: 'toggle-show-in-taskbar',
									title: $t('contextMenu.trayShowInTaskbar'),
									type: 'checkbox',
									checked: settingsManager.showInTaskBar,
								},
							]
						: []),
					{
						id: 'open-at-login',
						title: $t('contextMenu.trayLaunchOnStartup'),
						type: 'checkbox',
						checked: settingsManager.openAtLogin,
					},
					{ type: 'separator' },
					{
						id: 'quit',
						title: $t('contextMenu.quit'),
					},
				],
				{
					trayIcon:
						settingsManager.trayIcon === 'system'
							? settingsManager.darkMode
								? 'white'
								: 'black'
							: settingsManager.trayIcon,
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
			return [MenuItems.NewRootNote, MenuItems.NewNote, MenuItems.Separator, MenuItems.ExportNotes, MenuItems.ImportNotes]
		}

		return [
			MenuItems.NewRootNote,
			MenuItems.NewNote,
			MenuItems.Separator,
			MenuItems.ExportNotes,
			MenuItems.ImportNotes,
			MenuItems.Separator,
			MenuItems.ReceiveShare,
			MenuItems.Separator,
			MenuItems.CreatePassword,
			MenuItems.Login,
			...(noteManager.state.accountType === AccountType.None ? [MenuItems.CreateAccount] : [MenuItems.Logout]),
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
			noteManager.tree.selectedNote()?.isInRecycleBin ? MenuItems.Delete : MenuItems.Recycle,
			MenuItems.Separator,
			MenuItems.Settings,
		]
	}

	public get viewMenu() {
		return [MenuItems.History, MenuItems.Separator, MenuItems.WordWrap, MenuItems.DarkMode]
	}

	public get toolsMenu() {
		return [MenuItems.PasswordGenerator]
	}

	public get helpMenu() {
		const isGnome = ipcClient.isAvailable && !!ipcClient.rules?.flags?.find(r => r.toLowerCase().includes('gnome'))
		const isWayland = ipcClient.isAvailable && !!ipcClient.rules?.flags?.includes('wayland')
		return [
			MenuItems.About,
			...(ipcClient.isAvailable ? [MenuItems.CheckForUpdate] : []),
			...(ipcClient.isAvailable && !(isGnome && isWayland) ? [MenuItems.ShowDevTools] : []),
			...(env.DEV || settingsManager.developerMode ? [MenuItems.Separator, MenuItems.AddGettingStarted] : []),
		]
	}

	public updateAppMenu() {
		if (ipcClient.isAvailable && mimiriPlatform.isMacApp) {
			ipcClient.menu.setAppMenu([
				{
					title: $t('contextMenu.menuMimiriNotes'),
					submenu: this.toItems(this.appleMenu),
				},
				{
					title: $t('contextMenu.menuFile'),
					submenu: this.toItems(this.fileMenu),
				},
				{
					title: $t('contextMenu.menuEdit'),
					submenu: this.toItems(this.editMenu),
				},
				{
					title: $t('contextMenu.menuView'),
					submenu: this.toItems(this.viewMenu),
				},
				{
					title: $t('contextMenu.menuHelp'),
					submenu: this.toItems(this.helpMenu),
				},
			])
		}
	}
}

export const menuManager = new MenuManager()
