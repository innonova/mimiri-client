<template>
	<div class="flex flex-col h-full">
		<div class="flex items-center py-px px-2.5 bg-toolbar border-b border-solid border-toolbar">
			<ToolbarIcon icon="back" :hoverEffect="true" title="Back" class="md:hidden" @click="onBack"></ToolbarIcon>
			<div class="inline-block h-4 w-0 border border-solid border-toolbar-separator m-0.5 md:hidden"></div>
			<ToolbarIcon
				icon="save"
				:hoverEffect="true"
				:disabled="!saveEnabled"
				title="Save Note"
				@click="save"
			></ToolbarIcon>
			<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"></div>
			<ToolbarIcon
				:icon="settingsManager.wordwrap ? 'wordwrap-on' : 'wordwrap-off'"
				:hoverEffect="true"
				title="Toggle Wordwrap"
				@click="toggleWordWrap"
			></ToolbarIcon>
			<ToolbarIcon
				icon="undo"
				:hoverEffect="true"
				:disabled="!mimiriEditor.state.canUndo"
				title="Undo"
				@click="undo"
			></ToolbarIcon>
			<ToolbarIcon
				icon="redo"
				:hoverEffect="true"
				:disabled="!mimiriEditor.state.canRedo"
				title="Redo"
				@click="redo"
			></ToolbarIcon>
			<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"></div>
			<ToolbarIcon icon="history" :hoverEffect="true" title="Show History" @click="showHistory"></ToolbarIcon>
			<ToolbarIcon
				icon="hide"
				:hoverEffect="true"
				:disabled="!mimiriEditor.canMarkAsPassword && !mimiriEditor.canUnMarkAsPassword"
				title="Mark as Password Ctrl+Shift+C"
				@click="markAsPassword"
			></ToolbarIcon>
		</div>
		<div class="relative flex-auto flex flex-col items-stretch overflow-hidden">
			<div class="overflow-hidden flex-1" ref="editorContainer"></div>
			<SelectionControl></SelectionControl>
			<div v-if="historyVisible" class="w-full h-1/3 flex flex-col">
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
				<button
					class="w-full"
					:class="{ 'text-menu-disabled': !mimiriEditor.history.hasMoreHistory }"
					:disabled="!mimiriEditor.history.hasMoreHistory"
					@click="loadMoreHistory"
				>
					Read More Entries
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, type WatchStopHandle } from 'vue'
import { limitDialog, mimiriEditor, noteManager, saveEmptyNodeDialog, showSearchBox, titleBar } from '../global'
import type { NoteViewModel } from '../services/types/mimer-note'
import { searchManager } from '../services/search-manager'
import ToolbarIcon from './ToolbarIcon.vue'
import SelectionControl from './SelectionControl.vue'
import { VersionConflictError } from '../services/mimer-client'
import { settingsManager } from '../services/settings-manager'

let activeViewModelStopWatch: WatchStopHandle = undefined
let activeViewModel: NoteViewModel = undefined
const editorContainer = ref(null)
const windowFocus = ref(true)
const historyVisible = ref(false)

const biCif = value => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
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
	mimiriEditor.toggleSelectionAsPassword()
}

watch(historyVisible, (newVal, _) => {
	if (newVal) {
		checkLoadHistory()
	}
})

window.addEventListener('focus', () => {
	windowFocus.value = true
})

window.addEventListener('blur', () => {
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
			mimiriEditor.open(noteManager.getNoteById(activeViewModel.id))
			activeViewModelStopWatch = watch(activeViewModel, () => {
				if (activeViewModel && activeViewModel.id === mimiriEditor.note?.id) {
					mimiriEditor.open(noteManager.getNoteById(activeViewModel.id))
				}
			})
		}
	}
}

onMounted(() => {
	mimiriEditor.init(editorContainer.value)
	mimiriEditor.onSave(() => save())
	mimiriEditor.onSearchAll(() => titleBar.value?.searchAllNotes())
	mimiriEditor.onBlur(() => save())
	setActiveViewModel(noteManager.selectedViewModel)

	watch(settingsManager.state, () => {
		mimiriEditor.syncSettings()
	})

	watch(noteManager.state, (newVal, _) => {
		if (newVal?.selectedNoteId && newVal?.selectedNoteId !== activeViewModel?.id) {
			historyVisible.value = false
			mimiriEditor.clearSearchHighlights()
			save().then(() => {
				setActiveViewModel(noteManager.getViewModelById(newVal.selectedNoteId))
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
}

const redo = () => {
	mimiriEditor.redo()
}

const find = () => {
	mimiriEditor.find()
}

const onBack = () => {
	window.history.back()
	noteManager.closeEditorIfMobile()
}

const save = async () => {
	if (activeViewModel && saveEnabled) {
		let note = mimiriEditor.note
		const textValue = mimiriEditor.state.text
		if (note && note.text !== textValue) {
			if (note.text.length > 5 && textValue.length === 0) {
				saveEmptyNodeDialog.value.show(note)
			} else {
				while (true) {
					try {
						note = noteManager.getNoteById(note.id)
						const sizeBefore = note.size
						note.text = textValue
						const sizeAfter = note.size
						if (sizeAfter > noteManager.maxNoteSize) {
							noteManager.select(activeViewModel.id)
							limitDialog.value.show('save-note-size')
						} else if (noteManager.usedBytes > noteManager.maxBytes && sizeAfter >= sizeBefore) {
							noteManager.select(activeViewModel.id)
							limitDialog.value.show('save-total-size')
						} else {
							await note.save()
							if (note.id === mimiriEditor.note.id) {
								mimiriEditor.resetChanged()
							}
						}
						break
					} catch (ex) {
						if (ex instanceof VersionConflictError) {
							continue
						}
						break
					}
				}
			}
		}
	}
}

const toggleWordWrap = () => {
	settingsManager.wordwrap = !settingsManager.wordwrap
}

const showHistory = () => {
	historyVisible.value = !historyVisible.value
}

const saveEnabled = computed(() => {
	const winFocus = windowFocus.value // ensure that compute knows to trigger on this even if the first part of the next statement is false - AEK
	return mimiriEditor.state.changed && winFocus && activeViewModel
})

defineExpose({
	save,
	find,
	showHistory,
})
</script>
