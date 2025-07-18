<template>
	<div class="flex flex-col h-full">
		<div class="flex items-center py-px px-2.5 bg-toolbar border-b border-solid border-toolbar mobile:justify-between">
			<ToolbarIcon
				icon="back"
				:hoverEffect="true"
				title="Back"
				class="desktop:hidden"
				@click="onBack"
				data-testid="editor-back-button"
			/>
			<div class="inline-block h-4 w-0 border border-solid border-toolbar-separator m-0.5 desktop:hidden" />
			<ToolbarIcon
				icon="save"
				:hoverEffect="true"
				:disabled="!saveEnabled"
				title="Save Note"
				@click="saveClicked"
				data-testid="editor-save-button"
			/>
			<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5" />
			<ToolbarIcon
				:icon="settingsManager.wordwrap ? 'wordwrap-on' : 'wordwrap-off'"
				:hoverEffect="true"
				:disabled="noteManager.tree.selectedNoteRef().value?.isSystem"
				:title="settingsManager.wordwrap ? 'Disable Word Wrap' : 'Enable Word Wrap'"
				:toggledOn="settingsManager.wordwrap"
				@click="toggleWordWrap"
				data-testid="editor-toggle-wordwrap"
			/>
			<ToolbarIcon
				icon="undo"
				:hoverEffect="true"
				:disabled="!mimiriEditor.canUndo"
				title="Undo"
				@click="undo"
				data-testid="editor-undo-button"
			/>
			<ToolbarIcon
				icon="redo"
				:hoverEffect="true"
				:disabled="!mimiriEditor.canRedo"
				title="Redo"
				@click="redo"
				data-testid="editor-redo-button"
			/>
			<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5" />
			<ToolbarIcon
				icon="history"
				:hoverEffect="true"
				:title="historyVisible ? 'Hide History' : 'Show History'"
				:disabled="noteManager.tree.selectedNoteRef().value?.isSystem"
				:toggledOn="historyVisible"
				@click="showHistory"
				data-testid="editor-history-button"
			/>
			<ToolbarIcon
				icon="hide"
				:hoverEffect="true"
				:disabled="!mimiriEditor.canMarkAsPassword && !mimiriEditor.canUnMarkAsPassword"
				title="Mark as Password Ctrl+Shift+C"
				@click="markAsPassword"
				data-testid="editor-mark-as-password"
			/>
		</div>
		<div class="relative flex-auto flex flex-col items-stretch overflow-hidden">
			<div v-if="historyVisible && selectedHistoryItem" class="px-2 py-1 bg-info-bar cursor-default text-size-menu">
				{{ selectedHistoryItem.username }} - {{ formatDate(selectedHistoryItem.timestamp) }} (read-only)
			</div>
			<div
				class="overflow-hidden flex-1"
				style="display: none"
				ref="monacoContainer"
				data-testid="editor-monaco-container"
			/>
			<div
				class="overflow-hidden flex-1"
				style="display: none"
				ref="simpleContainer"
				data-testid="editor-simple-container"
			/>
			<div
				class="overflow-hidden flex-1"
				style="display: none"
				ref="displayContainer"
				data-testid="editor-display-container"
			/>
			<div v-if="!historyVisible && mimiriEditor.mode === 'display'" class="display-editor-toolbar flex flex-row gap-1">
				<button
					@click="activateEdit"
					class="bg-button-primary text-button-primary-text hover:brightness-125 select-none; font-display text-size-base; cursor-default; py-2 px-4; w-full"
				>
					Edit
				</button>
				<button @click="activateSettings" class="bg-button-primary text-button-primary-text hover:brightness-125">
					<SettingIcon class="w-6 h-6 my-1 mx-3" />
				</button>
			</div>
			<SelectionControl v-if="mimiriEditor.mode === 'advanced'" />
			<div v-if="historyVisible" class="w-full h-1/3 flex flex-col">
				<div
					class="flex items-center justify-between bg-toolbar border-b border-solid border-toolbar cursor-default text-size-menu p-0.5"
				>
					<div>History entries:</div>
					<CloseButton @click="showHistory" class="w-6 h-6" />
				</div>
				<div class="flex-auto overflow-y-auto h-0 pb-5 w-full bg-input">
					<template v-for="(historyItem, index) of mimiriEditor.history.historyItems" :key="historyItem.timestamp">
						<div
							class="py-1.5 px-2.5 cursor-default"
							:class="{
								'bg-item-selected': index === mimiriEditor.history.state.selectedHistoryIndex,
							}"
							@click="selectHistoryItem(index)"
						>
							{{ historyItem.username }} - {{ formatDate(historyItem.timestamp) }}
						</div>
					</template>
				</div>
				<button class="primary rounded-none!" :disabled="!mimiriEditor.history.hasMoreHistory" @click="loadMoreHistory">
					Read More Entries
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, type WatchStopHandle } from 'vue'
import { infoDialog, limitDialog, mimiriEditor, noteManager, showSearchBox, titleBar } from '../global'
import type { NoteViewModel } from '../services/types/mimer-note'
import { searchManager } from '../services/search-manager'
import ToolbarIcon from './ToolbarIcon.vue'
import SelectionControl from './SelectionControl.vue'
import { settingsManager } from '../services/settings-manager'
import { useEventListener } from '@vueuse/core'
import CloseButton from './elements/CloseButton.vue'
import SettingIcon from '../icons/cog.vue'
import type { Guid } from '../services/types/guid'

let activeViewModelStopWatch: WatchStopHandle = undefined
let activeViewModel: NoteViewModel = undefined
const monacoContainer = ref(null)
const simpleContainer = ref(null)
const displayContainer = ref(null)
const windowFocus = ref(true)
const historyVisible = ref(false)
const displayMode = ref(true)
const selectedHistoryItem = computed(() => mimiriEditor.history.state.selectedHistoryItem)
let saveInProgress = false

const biCif = value => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
}

const activateEdit = () => {
	displayMode.value = false
	mimiriEditor.activateEdit()
}

const activateSettings = () => {
	noteManager.tree.openNote('settings-general' as Guid)
}

const formatDate = (value: string) => {
	const date = new Date(value)
	const result = `${date.getFullYear()}.${biCif(date.getMonth() + 1)}.${biCif(date.getDate())} ${biCif(
		date.getHours(),
	)}:${biCif(date.getMinutes())}:${biCif(date.getSeconds())}`
	return result
}

const loadMoreHistory = async () => {
	await mimiriEditor.history.loadMoreHistory()
}

const selectHistoryItem = (index: number) => {
	mimiriEditor.history.selectHistoryItem(index)
}

const checkLoadHistory = async () => {
	await mimiriEditor.history.checkLoadHistory()
}

const markAsPassword = () => {
	mimiriEditor.focus()
	mimiriEditor.toggleSelectionAsPassword()
}

watch(historyVisible, (newVal, _) => {
	if (newVal) {
		checkLoadHistory()
	}
})

useEventListener(window, 'focus', () => {
	windowFocus.value = true
})

useEventListener(window, 'blur', () => {
	save()
	windowFocus.value = false
})

const setActiveViewModel = viewModel => {
	if (activeViewModel !== viewModel) {
		if (activeViewModelStopWatch) {
			activeViewModelStopWatch()
			activeViewModelStopWatch = undefined
		}
		activeViewModel = viewModel
		if (activeViewModel) {
			mimiriEditor.open(noteManager.tree.getNoteById(activeViewModel.id))
			activeViewModelStopWatch = watch(activeViewModel, () => {
				if (activeViewModel && activeViewModel.id === mimiriEditor.note?.id) {
					mimiriEditor.open(noteManager.tree.getNoteById(activeViewModel.id))
				}
			})
		}
	}
}

onMounted(() => {
	mimiriEditor.init(monacoContainer.value, simpleContainer.value, displayContainer.value)
	mimiriEditor.onSave(() => save())
	mimiriEditor.onSearchAll(() => titleBar.value?.searchAllNotes())
	mimiriEditor.onBlur(() => save())
	setActiveViewModel(noteManager.tree.selectedViewModel())

	watch(settingsManager.state, () => {
		mimiriEditor.syncSettings()
	})

	watch(noteManager.state, (newVal, _) => {
		if (newVal?.selectedNoteId && newVal?.selectedNoteId !== activeViewModel?.id) {
			historyVisible.value = false
			mimiriEditor.clearSearchHighlights()
			save().then(() => {
				setActiveViewModel(noteManager.tree.getViewModelById(newVal.selectedNoteId))
				if (showSearchBox.value) {
					mimiriEditor.setSearchHighlights(searchManager.state.term)
				}
			})
		}
	})

	watch(historyVisible, (newVal, _) => {
		mimiriEditor.history.isShowing = newVal
	})
})

watch(showSearchBox, (newVal, _) => {
	if (newVal) {
		mimiriEditor.setSearchHighlights(searchManager.state.term)
	} else {
		mimiriEditor.clearSearchHighlights()
	}
})

watch(searchManager.state, (newVal, _) => {
	if (newVal && showSearchBox.value) {
		mimiriEditor.setSearchHighlights(searchManager.state.term)
	} else {
		mimiriEditor.clearSearchHighlights()
	}
})

const undo = () => {
	mimiriEditor.undo()
	mimiriEditor.focus()
}

const redo = () => {
	mimiriEditor.redo()
	mimiriEditor.focus()
}

const find = () => {
	mimiriEditor.find()
}

const onBack = () => {
	save()
	mimiriEditor.mobileClosing()
	window.history.back()
	noteManager.ui.closeEditorIfMobile()
}

const saveClicked = async () => {
	mimiriEditor.focus()
	save()
}

const toggleWordWrap = event => {
	mimiriEditor.toggleWordWrap()
	mimiriEditor.focus()
}

const showHistory = () => {
	historyVisible.value = !historyVisible.value
	mimiriEditor.focus()
}

const saveEnabled = computed(() => {
	const winFocus = windowFocus.value // ensure that compute knows to trigger on this even if the first part of the next statement is false - AEK
	return mimiriEditor.changed && winFocus && !!activeViewModel
})

const save = async () => {
	if (activeViewModel && saveEnabled.value && !saveInProgress) {
		saveInProgress = true
		try {
			const result = await mimiriEditor.save()

			if (result === 'note-size') {
				noteManager.tree.select(activeViewModel.id)
				limitDialog.value.show('save-note-size')
			} else if (result === 'total-size') {
				noteManager.tree.select(activeViewModel.id)
				limitDialog.value.show('save-total-size')
			} else if (result === 'lost-update') {
				infoDialog.value.show(
					'Note was changed',
					`The note you just saved appears to have been changed outside the editor while you were editing it.

This may happen if you edited the note in another tab or device.

This may also happen if your connection is unstable.

Or if this is a shared note: another user may have edited it.

You can view all changes in the history.`,
				)
			}
		} finally {
			saveInProgress = false
		}
	}
}

defineExpose({
	save,
	find,
	showHistory,
})
</script>
