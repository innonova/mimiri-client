<template>
	<div
		v-if="loading"
		class="h-full dark-mode safe-area-padding text-size-base"
		:class="{
			'bg-splash text-white': !mimiriPlatform.isElectron,
			'bg-back text-text': mimiriPlatform.isElectron,
		}"
	>
		<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
		<div v-if="secondPassed" class="flex flex-col items-center justify-center h-full pb-10">
			<img v-if="!mimiriPlatform.isElectron" class="ml-1.5 mr-1 mt-px p-1 w-32 h-32" src="/img/logo-big.png" />
			<div class="flex text-size-header">
				<div>Initializing</div>
				<div class="w-0">{{ activity }}</div>
			</div>
			<div class="text-size-title mt-5 px-5 leading-6 text-center max-w-96">
				This might take a moment if this is the first time you are starting Mimiri Notes
			</div>
		</div>
	</div>
	<div v-if="!loading" class="flex flex-col h-full bg-back text-text dark-mode safe-area-padding text-size-base">
		<TitleBar ref="titleBar"></TitleBar>
		<ConvertAccount v-if="showConvertAccount"></ConvertAccount>
		<div v-show="!localAuth.locked" class="flex h-full overflow-hidden" @mouseup="endDragging">
			<div
				class="h-full overflow-y-hidden flex flex-col w-full divider-left"
				:class="{ 'hidden desktop:flex': !showNavigation }"
			>
				<MainToolbar ref="mainToolbar"></MainToolbar>
				<SearchBox v-show="showSearchBox"></SearchBox>
				<NoteTreeView ref="noteTreeView"></NoteTreeView>
				<ShareOfferView v-show="showShareOffers"></ShareOfferView>
			</div>
			<div class="w-2.5 min-w-2.5 bg-toolbar cursor-ew-resize hidden desktop:block" @mousedown="startDragging"></div>
			<div class="h-full flex flex-col w-full divider-right" :class="{ 'hidden desktop:flex': !showEditor }">
				<div v-show="noteManager.selectedNote?.type === 'note-text'" class="h-full flex flex-col flex-1">
					<NoteEditor ref="noteEditor"></NoteEditor>
				</div>
				<div
					v-if="
						noteManager.selectedNote?.type.startsWith('settings-') || noteManager.selectedNote?.type === 'recycle-bin'
					"
					class="h-full flex flex-col flex-1"
				>
					<SystemPage></SystemPage>
				</div>
			</div>
		</div>
		<div
			v-if="authenticated && localAuth.locked"
			class="absolute left-0 top-0 w-full h-full flex bg-back items-center justify-center"
		>
			<LockScreen></LockScreen>
		</div>
		<ContextMenu ref="contextMenu"></ContextMenu>
		<NotificationList ref="notificationList"></NotificationList>
		<DeleteNodeDialog ref="deleteNodeDialog"></DeleteNodeDialog>
		<DeleteMethodDialog ref="deletePaymentMethodDialog"></DeleteMethodDialog>
		<EmptyRecycleBinDialog ref="emptyRecycleBinDialog"></EmptyRecycleBinDialog>
		<PasswordGeneratorDialog ref="passwordGeneratorDialog"></PasswordGeneratorDialog>
		<ShareDialog ref="shareDialog"></ShareDialog>
		<AcceptShareDialog ref="acceptShareDialog"></AcceptShareDialog>
		<SaveEmptyNodeDialog ref="saveEmptyNodeDialog"></SaveEmptyNodeDialog>
		<LimitDialog ref="limitDialog"></LimitDialog>
		<PasswordDialog ref="passwordDialog"></PasswordDialog>
		<LoginDialog ref="loginDialog"></LoginDialog>
		<div
			v-if="noteManager.state.busy"
			class="absolute left-0 top-0 w-full h-full flex items-center justify-around text-white"
			:class="{ 'bg-backdrop': noteManager.state.busyLong }"
		>
			<LoadingIcon v-if="noteManager.state.spinner" class="animate-spin w-12 h-12"></LoadingIcon>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NoteTreeView from './components/NoteTreeView.vue'
import NoteEditor from './components/NoteEditor.vue'
import MainToolbar from './components/MainToolbar.vue'
import TitleBar from './components/TitleBar.vue'
import ContextMenu from './components/ContextMenu.vue'
import NotificationList from './components/NotificationList.vue'
import DeleteNodeDialog from './components/dialogs/DeleteNodeDialog.vue'
import DeleteMethodDialog from './components/dialogs/DeleteMethodDialog.vue'
import ShareDialog from './components/dialogs/ShareDialog.vue'
import AcceptShareDialog from './components/dialogs/AcceptShareDialog.vue'
import ShareOfferView from './components/ShareOfferView.vue'
import SaveEmptyNodeDialog from './components/dialogs/SaveEmptyNodeDialog.vue'
import LimitDialog from './components/dialogs/LimitDialog.vue'
import PasswordDialog from './components/dialogs/PasswordDialog.vue'
import LoginDialog from './components/dialogs/LoginDialog.vue'
import ConvertAccount from './components/ConvertAccount.vue'
import SearchBox from './components/SearchBox.vue'
import EmptyRecycleBinDialog from './components/dialogs/EmptyRecycleBinDialog.vue'
import PasswordGeneratorDialog from './components/dialogs/PasswordGeneratorDialog.vue'
import {
	noteManager,
	contextMenu,
	shareDialog,
	acceptShareDialog,
	showShareOffers,
	showSearchBox,
	deleteNodeDialog,
	emptyRecycleBinDialog,
	passwordGeneratorDialog,
	showCreateAccount,
	showConvertAccount,
	mainToolbar,
	noteEditor,
	noteTreeView,
	notificationList,
	titleBar,
	ipcClient,
	mimiriEditor,
	saveEmptyNodeDialog,
	passwordDialog,
	loginDialog,
	limitDialog,
	updateManager,
	mobileLog,
	deletePaymentMethodDialog,
} from './global'
import { settingsManager } from './services/settings-manager'
import LoadingIcon from './icons/loading.vue'
import { mimiriPlatform } from './services/mimiri-platform'
import { menuManager } from './services/menu-manager'
import { Debounce, deObfuscate } from './services/helpers'
import { localAuth } from './services/local-auth'
import LockScreen from './components/LockScreen.vue'
import { useEventListener } from '@vueuse/core'
import SystemPage from './components/SystemPage.vue'
import { toHex } from './services/hex-base64'

mobileLog.log(`App Loading ${settingsManager.channel} ${updateManager.currentVersion}`)

const colorScheme = ref('only light')
const loading = ref(true)
const secondPassed = ref(false)
const activity = ref('')

const authenticated = computed(() => noteManager.state.authenticated)

const showNavigation = computed(() => !noteManager.state.noteOpen)
const showEditor = computed(() => noteManager.state.noteOpen)

let splitterPos = 300
const dividerPosition = ref(`${splitterPos}px`)
const editorWidth = ref(`${window.innerWidth - splitterPos - 10}px`)

const onResize = () => {
	dividerPosition.value = `${splitterPos}px`
	editorWidth.value = `${window.innerWidth - splitterPos - 10}px`
}

document.documentElement.setAttribute('data-device-type', noteManager.isMobile ? 'mobile' : 'desktop')

const updateTheme = () => {
	document.documentElement.setAttribute('data-theme', settingsManager.darkMode ? 'dark' : 'light')
	colorScheme.value = settingsManager.darkMode ? 'only dark' : 'only light'
	var root = document.querySelector(':root') as HTMLElement
	root.style.setProperty(
		'--font-editor',
		`'${settingsManager.editorFontFamily}', 'Consolas', 'Courier New', 'monospace'`,
	)
	root.style.setProperty('--text-size-editor', `${settingsManager.editorFontSize}px`)
}

updateTheme()

const progressActivity = () => {
	if (loading.value) {
		activity.value += '.'
		if (activity.value.length > 3) {
			activity.value = ''
		}
		setTimeout(progressActivity, 500)
	}
}

if (!mimiriPlatform.isElectron) {
	if (!mimiriPlatform.isWeb && mimiriPlatform.isIosApp) {
		document.documentElement.setAttribute('data-env-support', 'true')
	} else if (!mimiriPlatform.isWeb) {
		const saSupport = getComputedStyle(document.documentElement).getPropertyValue('--sa-support')
		document.documentElement.setAttribute('data-env-support', saSupport !== '0px' ? 'true' : 'false')
	} else {
		document.documentElement.setAttribute('data-env-support', 'off')
	}
}

if (mimiriPlatform.isElectron && mimiriPlatform.isLinuxApp) {
	document.body.classList.add('rounded-lg')
}

watch(settingsManager.state, () => {
	updateTheme()
	menuManager.updateAppMenu()
})

watch(noteManager.state, () => {
	menuManager.updateAppMenu()
})
useEventListener(window, 'resize', onResize)

useEventListener(document, 'contextmenu', e => e.preventDefault(), false)

if (ipcClient.isAvailable) {
	noteManager.setCacheManager(ipcClient.cache)
	menuManager.updateTrayMenu()
	menuManager.updateAppMenu()
}

const handleShortcut = event => {
	const ctrlActive = (event.ctrlKey && !mimiriPlatform.isMacApp) || (event.metaKey && mimiriPlatform.isMacApp)

	if (event.key === 'r' && ctrlActive) {
		event.preventDefault()
		event.stopPropagation()
	}
	if (
		!authenticated ||
		localAuth.locked ||
		showCreateAccount.value ||
		noteManager.selectedNote?.id === 'settings-pin'
	) {
		return
	}

	const treeViewShortCutsActive =
		(document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) &&
		event.target.tagName === 'BODY'

	if (event.key === 'd' && ctrlActive) {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.duplicateActiveNote()
			}
		}
	}
	if (event.key === 'x' && ctrlActive) {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.cutActiveNote()
			}
		}
	}
	if (event.key === 'c' && ctrlActive) {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.copyActiveNote()
			}
		}
	}
	if (event.key === 'v' && ctrlActive) {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.pasteIntoActiveNote()
			}
		}
	}
	if (event.key === 'Delete') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				if (event.shiftKey || !!noteManager.selectedNote?.isInRecycleBin) {
					noteTreeView.value.deleteActiveNote()
				} else {
					noteTreeView.value.recycleActiveNote()
				}
			}
		}
	}
	if (event.key === 'F2') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.renameActiveNote()
			}
		}
	}
	if (event.key === 'ArrowUp') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.moveSelectionUp()
			}
		}
	}
	if (event.key === 'ArrowDown') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.moveSelectionDown()
			}
		}
	}
	if (event.key === 'ArrowLeft') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.moveSelectionLeft()
			}
		}
	}
	if (event.key === 'ArrowRight') {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.moveSelectionRight()
			}
		}
	}
	if (event.key === 's' && ctrlActive) {
		event.preventDefault()
		noteEditor.value.save()
	}
	if (event.key === 'C' && ctrlActive) {
		event.preventDefault()
		mimiriEditor.toggleSelectionAsPassword()
	}
	if (event.key === 'n' && ctrlActive) {
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			noteManager.newNote()
		}
	}
	if (event.key === 'F3' || (event.key === 'F' && ctrlActive)) {
		event.preventDefault()
		if (titleBar.value) {
			titleBar.value.searchAllNotes()
		}
	}
	if (event.key === 'Escape') {
		if (showSearchBox.value) {
			showSearchBox.value = false
		}
	}

	if (!ctrlActive && !event.altKey) {
		if (event.key.length === 1 && event.key === event.key.toLowerCase() && noteTreeView.value?.hasFocus()) {
			noteManager.findNextNoteStartingWith(event.key)
		}
	}
}
useEventListener(document, 'keydown', handleShortcut, false)

const resizeDebounce = new Debounce(async () => {
	if (ipcClient.isAvailable) {
		const size = await ipcClient.window.getMainWindowSize()
		settingsManager.mainWindowSize = size
	}
}, 250)

useEventListener(window, 'resize', async () => {
	resizeDebounce.activate()
})
;(async () => {
	try {
		setTimeout(() => (secondPassed.value = true), 1000)
		progressActivity()

		await settingsManager.load()
		if (settingsManager.mainWindowSize.width > 100 && settingsManager.mainWindowSize.height > 100) {
			await ipcClient.window.setMainWindowSize(settingsManager.mainWindowSize)
		}

		updateTheme()
		await updateManager.checkUpdateInitial()
		try {
			if (!noteManager.isLoggedIn && settingsManager.autoLogin && settingsManager.autoLoginData) {
				await noteManager.setLoginData(await deObfuscate(settingsManager.autoLoginData))
				if (noteManager.isLoggedIn) {
					await noteManager.loadState()
				}
			}
		} catch (ex) {
			console.log(ex)
		}

		if (!noteManager.isLoggedIn) {
			try {
				await noteManager.recoverLogin()
			} catch (ex) {
				console.log(ex)
			}
		}

		let showLogin = !noteManager.isLoggedIn

		if (!noteManager.isLoggedIn) {
			if (settingsManager.isNewInstall) {
				await noteManager.loginAnonymousAccount()
				if (noteManager.isLoggedIn) {
					settingsManager.isNewInstall = false
					showLogin = false
				}
			} else {
				showLogin = true
			}
		}

		loading.value = false
		await settingsManager.save()
		if (showLogin) {
			loginDialog.value.show(true)
		}
	} catch (ex) {
		setTimeout(() => location.reload(), 1000)
	}
})()

const handleDragging = e => {
	let pos = e.pageX
	if (pos < 200) {
		pos = 200
	}
	const maxWidth = window.innerWidth - 100
	if (pos > maxWidth) {
		pos = maxWidth
	}

	splitterPos = pos
	dividerPosition.value = `${splitterPos}px`
	editorWidth.value = `${window.innerWidth - splitterPos - 10}px`
}
const startDragging = e => {
	if (e.button === 0) {
		document.addEventListener('mousemove', handleDragging)
	}
}
const endDragging = () => {
	document.removeEventListener('mousemove', handleDragging)
}
</script>

<style scoped>
.safe-area-padding {
	padding-top: var(--safe-area-top);
}

.divider-left:where([data-device-type='desktop'] *) {
	min-width: v-bind(dividerPosition);
	width: v-bind(dividerPosition);
}

.divider-right:where([data-device-type='desktop'] *) {
	width: v-bind(editorWidth);
}

.dark-mode {
	color-scheme: v-bind(colorScheme);
}
</style>
