<template>
	<div v-if="loading" class="h-full">
		<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
		<div class="flex items-center justify-center h-full text-text pb-10">Loading...</div>
	</div>
	<div v-if="!loading" class="flex flex-col h-full bg-back text-text dark-mode safe-area-padding">
		<TitleBar
			v-if="authenticated && !showUpdate && !showDeleteAccount && !showCreateEditAccount"
			ref="titleBar"
		></TitleBar>
		<Login v-if="!authenticated && !showCreateEditAccount && !showConvertAccount"></Login>
		<CreateEditAccount ref="createEditAccountScreen"></CreateEditAccount>
		<ConvertAccount v-if="showConvertAccount"></ConvertAccount>
		<DeleteAccount v-if="showDeleteAccount"></DeleteAccount>
		<Update v-if="authenticated && showUpdate"></Update>
		<div
			v-if="
				authenticated &&
				!showConvertAccount &&
				!showUpdate &&
				!showDeleteAccount &&
				!mimiriPlatform.isLocked &&
				!showCreateEditAccount
			"
			class="flex h-full overflow-hidden"
			@mouseup="endDragging"
		>
			<div
				class="h-full overflow-y-hidden flex flex-col w-full divider-left"
				:class="{ 'hidden md:flex': !showNavigation }"
			>
				<MainToolbar ref="mainToolbar"></MainToolbar>
				<SearchBox v-show="showSearchBox"></SearchBox>
				<NoteTreeView ref="noteTreeView"></NoteTreeView>
				<ShareOfferView v-show="showShareOffers"></ShareOfferView>
			</div>
			<div class="w-2.5 min-w-2.5 bg-toolbar cursor-ew-resize hidden md:block" @mousedown="startDragging"></div>
			<div class="h-full flex flex-col w-full divider-right" :class="{ 'hidden md:flex': !showEditor }">
				<div class="h-full flex flex-col flex-1">
					<NoteEditor ref="noteEditor"></NoteEditor>
				</div>
			</div>
		</div>
		<div
			v-if="authenticated && mimiriPlatform.isLocked"
			class="absolute left-0 top-0 w-full h-full flex bg-back items-center justify-center"
		>
			Locked
		</div>
		<ContextMenu ref="contextMenu"></ContextMenu>
		<NotificationList ref="notificationList"></NotificationList>
		<DeleteNodeDialog ref="deleteNodeDialog"></DeleteNodeDialog>
		<EmptyRecycleBinDialog ref="emptyRecycleBinDialog"></EmptyRecycleBinDialog>
		<ShareDialog ref="shareDialog"></ShareDialog>
		<AboutDialog ref="aboutDialog"></AboutDialog>
		<CheckUpdateDialog ref="checkUpdateDialog"></CheckUpdateDialog>
		<SaveEmptyNodeDialog ref="saveEmptyNodeDialog"></SaveEmptyNodeDialog>
		<LimitDialog ref="limitDialog"></LimitDialog>
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
import Update from './components/Update.vue'
import TitleBar from './components/TitleBar.vue'
import Login from './components/Login.vue'
import CreateEditAccount from './components/CreateEditAccount.vue'
import ContextMenu from './components/ContextMenu.vue'
import NotificationList from './components/NotificationList.vue'
import DeleteNodeDialog from './components/DeleteNodeDialog.vue'
import ShareDialog from './components/ShareDialog.vue'
import ShareOfferView from './components/ShareOfferView.vue'
import AboutDialog from './components/AboutDialog.vue'
import CheckUpdateDialog from './components/CheckUpdateDialog.vue'
import SaveEmptyNodeDialog from './components/SaveEmptyNodeDialog.vue'
import LimitDialog from './components/LimitDialog.vue'
import ConvertAccount from './components/ConvertAccount.vue'
import SearchBox from './components/SearchBox.vue'
import {
	noteManager,
	contextMenu,
	createEditAccountScreen,
	shareDialog,
	showShareOffers,
	showSearchBox,
	deleteNodeDialog,
	emptyRecycleBinDialog,
	showCreateEditAccount,
	showConvertAccount,
	showUpdate,
	mainToolbar,
	noteEditor,
	aboutDialog,
	checkUpdateDialog,
	noteTreeView,
	notificationList,
	titleBar,
	ipcClient,
	mimiriEditor,
	saveEmptyNodeDialog,
	limitDialog,
	showDeleteAccount,
	updateManager,
	mobileLog,
} from './global'
import { settingsManager } from './services/settings-manager'
import LoadingIcon from './icons/loading.vue'
import { mimiriPlatform } from './services/mimiri-platform'
import DeleteAccount from './components/DeleteAccount.vue'
import { menuManager } from './services/menu-manager'
import { Debounce } from './services/helpers'
import EmptyRecycleBinDialog from './components/EmptyRecycleBinDialog.vue'

mobileLog.log(`App Loading ${settingsManager.channel} ${updateManager.currentVersion}`)

const colorScheme = ref('only light')
const loading = ref(true)

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

const updateTheme = () => {
	document.documentElement.setAttribute('data-theme', settingsManager.darkMode ? 'dark' : 'light')
	colorScheme.value = settingsManager.darkMode ? 'only dark' : 'only light'
}

updateTheme()

if (!mimiriPlatform.isElectron) {
	if (mimiriPlatform.isIos) {
		document.documentElement.setAttribute('data-env-support', 'true')
	} else if (!mimiriPlatform.isWeb) {
		const saSupport = getComputedStyle(document.documentElement).getPropertyValue('--sa-support')
		document.documentElement.setAttribute('data-env-support', saSupport !== '0px' ? 'true' : 'false')
	} else {
		document.documentElement.setAttribute('data-env-support', 'off')
	}
}

if (mimiriPlatform.isElectron && mimiriPlatform.isLinux) {
	document.body.classList.add('rounded-lg')
}

watch(settingsManager.state, () => {
	updateTheme()
	menuManager.updateAppMenu()
})

watch(noteManager.state, () => {
	menuManager.updateAppMenu()
})

window.addEventListener('resize', onResize)

document.addEventListener('contextmenu', e => e.preventDefault(), false)

if (ipcClient.isAvailable) {
	noteManager.setCacheManager(ipcClient.cache)
	menuManager.updateTrayMenu()
	menuManager.updateAppMenu()
}

// noteManager.beginTest('import-test')

const handleShortcut = event => {
	const treeViewShortCutsActive =
		(document.activeElement.tagName === 'BODY' || !noteEditor.value?.$el.contains(document.activeElement)) &&
		event.target.tagName === 'BODY'

	const ctrlActive = (event.ctrlKey && !mimiriPlatform.isMac) || (event.metaKey && mimiriPlatform.isMac)

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
				if (event.shiftKey) {
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
document.addEventListener('keydown', handleShortcut, false)

const resizeDebounce = new Debounce(async () => {
	if (ipcClient.isAvailable) {
		const size = await ipcClient.window.getMainWindowSize()
		settingsManager.mainWindowSize = size
	}
}, 250)

window.addEventListener('resize', async () => {
	resizeDebounce.activate()
})
;(async () => {
	await settingsManager.load()
	if (settingsManager.mainWindowSize.width > 100 && settingsManager.mainWindowSize.height > 100) {
		await ipcClient.window.setMainWindowSize(settingsManager.mainWindowSize)
	}

	updateTheme()
	await updateManager.checkUpdateInitial()
	loading.value = false
	await settingsManager.save()
})()

const handleDragging = e => {
	let pos = e.pageX
	if (pos < 200) {
		pos = 200
	}
	const maxWidth = window.innerWidth - 400
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

@media (min-width: 768px) {
	.divider-left {
		min-width: v-bind(dividerPosition);
		width: v-bind(dividerPosition);
	}

	.divider-right {
		width: v-bind(editorWidth);
	}
}

.dark-mode {
	color-scheme: v-bind(colorScheme);
}
</style>
