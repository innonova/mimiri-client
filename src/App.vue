<template>
	<input :value="appStatus" type="hidden" data-testid="app-status" />
	<div
		v-if="loading"
		class="h-full dark-mode safe-area-padding text-size-base"
		:class="{
			'bg-splash text-white': !mimiriPlatform.isElectron,
			'bg-back text-text': mimiriPlatform.isElectron,
		}"
	>
		<div id="title-bar" class="w-full h-[36px] pl-px select-none drag" />
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
		<TitleBar ref="titleBar" />
		<ConvertAccount v-if="showConvertAccount" />
		<div v-show="!localAuth.locked" class="flex h-full overflow-hidden" @mouseup="endDragging">
			<div
				class="h-full overflow-y-hidden flex flex-col w-full divider-left"
				:class="{ 'hidden desktop:flex': !showNavigation }"
			>
				<MainToolbar ref="mainToolbar" />
				<SearchBox v-show="showSearchBox" />
				<NoteTreeView ref="noteTreeView" />
				<StatusBar />
			</div>
			<div class="w-2.5 min-w-2.5 bg-toolbar cursor-ew-resize hidden desktop:block" @mousedown="startDragging" />
			<div class="h-full flex flex-col w-full divider-right" :class="{ 'hidden desktop:flex': !showEditor }">
				<div
					v-show="
						noteManager.tree.selectedNoteRef().value?.type === 'note-text' &&
						noteManager.state.viewMode === ViewMode.Content
					"
					class="h-full flex flex-col flex-1"
				>
					<NoteEditor ref="noteEditor" />
				</div>
				<div
					v-if="
						noteManager.tree.selectedNoteRef().value?.type.startsWith('settings-') ||
						noteManager.tree.selectedNoteRef().value?.type === 'recycle-bin'
					"
					class="h-full flex flex-col flex-1"
				>
					<SystemPage />
				</div>
				<div
					v-if="
						!noteManager.tree.selectedNoteRef().value?.isSystem && noteManager.state.viewMode === ViewMode.Properties
					"
					class="h-full flex flex-col flex-1"
				>
					<PropertiesPage />
				</div>
			</div>
		</div>
		<div
			v-if="authenticated && localAuth.locked"
			class="absolute left-0 top-0 w-full h-full flex bg-back items-center justify-center"
		>
			<LockScreen />
		</div>
		<div v-if="blockUserInput" class="absolute left-0 top-0 w-full h-full flex bg-transparent" />
		<ContextMenu ref="contextMenu" />
		<NotificationList ref="notificationList" />
		<DeleteNodeDialog ref="deleteNodeDialog" />
		<DeleteHistoryDialog ref="deleteHistoryDialog" />
		<DeleteMethodDialog ref="deletePaymentMethodDialog" />
		<EmptyRecycleBinDialog ref="emptyRecycleBinDialog" />
		<PasswordGeneratorDialog ref="passwordGeneratorDialog" />
		<ShareDialog ref="shareDialog" />
		<AcceptShareDialog ref="acceptShareDialog" />
		<SaveEmptyNodeDialog ref="saveEmptyNodeDialog" />
		<LimitDialog ref="limitDialog" />
		<PasswordDialog ref="passwordDialog" />
		<LoginDialog ref="loginDialog" />
		<InfoDialog ref="infoDialog" />
		<InconsistencyDialog ref="inconsistencyDialog" />
		<SyncErrorDialog ref="syncErrorDialog" />
		<DeleteLocalDataDialog ref="deleteLocalDataDialog" />
		<div
			v-if="noteManager.state.busy"
			class="absolute left-0 top-0 w-full h-full flex items-center justify-around text-white"
			:class="{ 'bg-backdrop': noteManager.state.busyLong }"
		>
			<LoadingIcon v-if="noteManager.state.spinner" class="animate-spin w-12 h-12" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
	syncErrorDialog,
	updateManager,
	deletePaymentMethodDialog,
	deleteHistoryDialog,
	deleteLocalDataDialog,
	infoDialog,
	debug,
	blockUserInput,
	appStatus,
	inconsistencyDialog,
} from './global'
import { settingsManager } from './services/settings-manager'
import LoadingIcon from './icons/loading.vue'
import { mimiriPlatform } from './services/mimiri-platform'
import { menuManager } from './services/menu-manager'
import { Debounce } from './services/helpers'
import { localAuth } from './services/local-auth'
import LockScreen from './components/LockScreen.vue'
import { useEventListener } from '@vueuse/core'
import SystemPage from './components/SystemPage.vue'
import { AccountType, ViewMode } from './services/storage/type'
import PropertiesPage from './components/PropertiesPage.vue'
import DeleteHistoryDialog from './components/dialogs/DeleteHistoryDialog.vue'
import InfoDialog from './components/dialogs/InfoDialog.vue'
import InconsistencyDialog from './components/dialogs/InconsistencyDialog.vue'
import StatusBar from './components/elements/StatusBar.vue'
import SyncErrorDialog from './components/dialogs/SyncErrorDialog.vue'
import DeleteLocalDataDialog from './components/dialogs/DeleteLocalDataDialog.vue'
import type { Guid } from './services/types/guid'

const colorScheme = ref('only light')
const loading = ref(true)
const secondPassed = ref(false)
const activity = ref('')

const authenticated = computed(() => noteManager.state.isLoggedIn)

const showNavigation = computed(() => !noteManager.state.noteOpen)
const showEditor = computed(() => noteManager.state.noteOpen)

let splitterPos = 300
const dividerPosition = ref(`${splitterPos}px`)
const editorWidth = ref(`${window.innerWidth - splitterPos - 10}px`)

const onResize = () => {
	dividerPosition.value = `${splitterPos}px`
	editorWidth.value = `${window.innerWidth - splitterPos - 10}px`
}

document.documentElement.setAttribute('data-device-type', noteManager.state.isMobile ? 'mobile' : 'desktop')

const updateTheme = () => {
	document.documentElement.setAttribute('data-theme', settingsManager.darkMode ? 'dark' : 'light')
	colorScheme.value = settingsManager.darkMode ? 'only dark' : 'only light'
	const root = document.querySelector(':root') as HTMLElement
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

useEventListener(
	document,
	'contextmenu',
	e => {
		if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
			e.preventDefault()
		}
	},
	false,
)

if (ipcClient.isAvailable) {
	// noteManager.setCacheManager(ipcClient.cache)
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
		!authenticated.value ||
		localAuth.locked ||
		showCreateAccount.value ||
		noteManager.tree.selectedNote()?.id === 'settings-pin'
	) {
		return
	}

	const treeViewShortCutsActive =
		(document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) &&
		event.target.tagName === 'BODY'
	const isSystemNote = noteManager.tree.selectedNote()?.isSystem

	if (event.key === 'd' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.duplicateActiveNote()
			}
		}
	}
	if (event.key === 'x' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.cutActiveNote()
			}
		}
	}
	if (event.key === 'c' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.copyActiveNote()
			}
		}
	}
	if (event.key === 'v' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				noteTreeView.value.pasteIntoActiveNote()
			}
		}
	}
	if (event.key === 'Delete') {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			if (noteTreeView.value) {
				if (
					event.shiftKey ||
					!!noteManager.tree.selectedNote()?.isInRecycleBin ||
					noteManager.tree.selectedNote().isShared
				) {
					noteTreeView.value.deleteActiveNote()
				} else {
					noteTreeView.value.recycleActiveNote()
				}
			}
		}
	}
	if (event.key === 'F2') {
		if (isSystemNote) {
			return
		}
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
		if (isSystemNote) {
			return
		}
		event.preventDefault()
		noteEditor.value.save()
	}
	if (event.key === 'C' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		event.preventDefault()
		mimiriEditor.toggleSelectionAsPassword()
	}
	if (event.key === 'n' && ctrlActive) {
		if (isSystemNote) {
			return
		}
		if (treeViewShortCutsActive) {
			event.preventDefault()
			event.stopPropagation()
			noteManager.ui.newNote()
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
			noteManager.ui.findNextNoteStartingWith(event.key)
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

appStatus.value = 'loading'
onMounted(async () => {
	try {
		appStatus.value = 'loading'
		setTimeout(() => (secondPassed.value = true), 1000)
		progressActivity()

		await settingsManager.load()
		debug.init()
		debug.log(`App Loading ${settingsManager.channel} ${updateManager.currentVersion}`)
		if (settingsManager.mainWindowSize.width > 100 && settingsManager.mainWindowSize.height > 100) {
			await ipcClient.window.setMainWindowSize(settingsManager.mainWindowSize)
		}

		updateTheme()
		if (await updateManager.checkUpdateInitial()) {
			appStatus.value = 'update'
			return
		}
		loading.value = false
		await noteManager.session.initialize()

		appStatus.value = 'ready'
	} catch (ex) {
		appStatus.value = 'error'
		debug.logError('Error during app initialization', ex)
		// setTimeout(() => location.reload(), 1000)
	}
})

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
