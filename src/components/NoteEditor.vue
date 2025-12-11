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
			<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5 desktop:hidden" />
			<ToolbarIcon
				icon="save"
				:hoverEffect="true"
				:disabled="!saveEnabled"
				title="Save Note"
				@click="saveClicked"
				data-testid="editor-save-button"
			/>

			<div class="flex overflow-auto h-full">
				<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator mx-0.5 mt-[0.275rem]" />
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
				<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator mx-0.5 mt-[0.275rem]" />
				<ToolbarIcon
					icon="history"
					:hoverEffect="true"
					:title="historyVisible ? 'Hide History' : 'Show History'"
					:disabled="noteManager.tree.selectedNoteRef().value?.isSystem"
					:toggledOn="historyVisible"
					@click="showHistory"
					data-testid="editor-history-button"
				/>
				<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator mx-0.5 mt-[0.275rem]" />
				<ToolbarIcon
					icon="hide"
					:hoverEffect="true"
					:disabled="
						!mimiriEditor.isActionSupported('mark-password') && !mimiriEditor.isActionSupported('unmark-password')
					"
					title="Mark as Password Ctrl+Shift+C"
					@click="markAsPassword"
					data-testid="editor-mark-as-password"
				/>
				<ToolbarIcon
					icon="heading"
					:hoverEffect="true"
					:disabled="false"
					title="Heading"
					@click="insertHeading"
					data-testid="editor-insert-heading"
				/>
				<ToolbarIcon
					icon="code-block"
					:hoverEffect="true"
					:disabled="false"
					title="Code Block"
					@click="insertCodeBlock"
					data-testid="editor-insert-code-block"
				/>
				<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5" />
				<ToolbarIcon
					icon="check-list"
					:hoverEffect="true"
					:disabled="false"
					title="Checkbox"
					@click="insertCheckboxList"
					data-testid="editor-insert-checkbox"
				/>
				<ToolbarIcon
					icon="list"
					:hoverEffect="true"
					:disabled="false"
					title="List"
					@click="insertUnorderedList"
					data-testid="editor-insert-unordered-list"
				/>
				<ToolbarIcon
					icon="number-list"
					:hoverEffect="true"
					:disabled="false"
					title="Ordered List"
					@click="insertOrderedList"
					data-testid="editor-insert-ordered-list"
				/>
				<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5" />
				<ToolbarIcon
					v-if="showWordWrap"
					:icon="settingsManager.wordwrap ? 'wordwrap-on' : 'wordwrap-off'"
					:hoverEffect="true"
					:disabled="noteManager.tree.selectedNoteRef().value?.isSystem"
					:title="settingsManager.wordwrap ? 'Disable Word Wrap' : 'Enable Word Wrap'"
					:toggledOn="settingsManager.wordwrap"
					@click="toggleWordWrap"
					data-testid="editor-toggle-wordwrap"
				/>
			</div>
			<div class="flex-1"></div>
			<ToolbarIcon
				:icon="mimiriEditor.mode === 'advanced' ? 'wysiwyg' : 'code'"
				:hoverEffect="true"
				:disabled="historyVisible"
				title="Toggle Edit Mode"
				@click="toggleEditModeClicked"
				data-testid="editor-toggle-edit-mode-button"
			/>
		</div>
		<div class="relative flex-auto flex flex-col items-stretch overflow-hidden">
			<div v-if="historyVisible && selectedHistoryItem" class="px-2 py-1 bg-info-bar cursor-default text-size-menu">
				{{ selectedHistoryItem.username }} - {{ formatDate(selectedHistoryItem.timestamp) }} (read-only)
			</div>
			<ConflictBanner ref="conflictBanner" @navigate="onConflictNavigate" />
			<div
				class="overflow-hidden flex-1"
				style="display: none"
				ref="monacoContainer"
				data-testid="editor-monaco-container"
			/>
			<div
				class="overflow-hidden flex-col relative"
				style="display: none"
				ref="proseMirrorContainer"
				data-testid="editor-prosemirror-container"
			>
				<AutoComplete ref="proseMirrorPopup"></AutoComplete>
			</div>
			<SelectionControl v-if="mimiriEditor.mode === 'advanced'" />
			<div
				v-if="historyVisible && mimiriEditor.history.note"
				class="w-full h-1/3 flex flex-col"
				data-testid="editor-history-container"
			>
				<div
					class="flex items-center justify-between bg-toolbar border-b border-solid border-toolbar cursor-default text-size-menu p-0.5"
				>
					<div>History entries:</div>
					<CloseButton @click="showHistory" class="w-6 h-6" />
				</div>
				<div class="flex-auto overflow-y-auto h-0 pb-5 w-full bg-input" data-testid="editor-history-scroll-container">
					<div class="grid grid-cols-[auto_auto_1fr] gap-x-2">
						<template v-for="(historyItem, index) of historyItems" :key="historyItem.timestamp">
							<div
								class="py-1.5 px-2.5 cursor-default col-span-full grid grid-cols-subgrid items-center"
								:class="{
									'bg-item-selected': index === mimiriEditor.history.state.selectedHistoryIndex,
								}"
								@click="selectHistoryItem(index)"
								:data-testid="`editor-history-item-${index}`"
							>
								<div>{{ historyItem.username }}</div>
								<div>-</div>
								<div>{{ formatDate(historyItem.timestamp) }}</div>
							</div>
						</template>
					</div>
				</div>
				<button
					class="primary rounded-none!"
					:disabled="!mimiriEditor.history.note.viewModel.hasMoreHistory"
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
import { env, infoDialog, limitDialog, mimiriEditor, noteManager, showSearchBox, titleBar } from '../global'
import type { NoteViewModel } from '../services/types/mimer-note'
import { searchManager } from '../services/search-manager'
import ToolbarIcon from './ToolbarIcon.vue'
import SelectionControl from './SelectionControl.vue'
import { settingsManager } from '../services/settings-manager'
import { useEventListener } from '@vueuse/core'
import CloseButton from './elements/CloseButton.vue'
import { mimiriApi } from '../services/storage/mimiri-api'
import AutoComplete from './elements/AutoComplete.vue'
import ConflictBanner from './elements/ConflictBanner.vue'

let activeViewModelStopWatch: WatchStopHandle = undefined
let activeViewModel: NoteViewModel = undefined
const monacoContainer = ref(null)
const proseMirrorContainer = ref(null)
const proseMirrorPopup = ref<InstanceType<typeof AutoComplete> | null>(null)
const conflictBanner = ref<InstanceType<typeof ConflictBanner> | null>(null)
const windowFocus = ref(true)
const historyVisible = ref(false)
const selectedHistoryItem = computed(() => mimiriEditor.history.state.selectedHistoryItem)
const historyItems = computed(() => {
	if (env.DEV && mimiriApi.state.historyEntries) {
		return mimiriApi.state.historyEntries
	}
	return mimiriEditor.history.note.viewModel.history
})
let saveInProgress = false

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
	mimiriEditor.focus()
	mimiriEditor.toggleSelectionAsPassword()
}

const insertCheckboxList = () => {
	mimiriEditor.focus()
	mimiriEditor.executeFormatAction('insert-checkbox-list')
}

const insertUnorderedList = () => {
	mimiriEditor.focus()
	mimiriEditor.executeFormatAction('insert-unordered-list')
}

const insertOrderedList = () => {
	mimiriEditor.focus()
	mimiriEditor.executeFormatAction('insert-ordered-list')
}

const insertHeading = () => {
	mimiriEditor.focus()
	mimiriEditor.executeFormatAction('insert-heading')
}

const insertCodeBlock = () => {
	mimiriEditor.focus()
	mimiriEditor.executeFormatAction('insert-code-block')
}

const toggleEditModeClicked = () => {
	void mimiriEditor.toggleEditMode()
}

watch(historyVisible, (newVal, _) => {
	if (newVal) {
		void checkLoadHistory()
	}
})

useEventListener(window, 'focus', () => {
	windowFocus.value = true
})

useEventListener(window, 'blur', () => {
	void save()
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
			void mimiriEditor.open(noteManager.tree.getNoteById(activeViewModel.id))
			activeViewModelStopWatch = watch(activeViewModel, () => {
				if (activeViewModel && activeViewModel.id === mimiriEditor.note?.id) {
					void mimiriEditor.open(noteManager.tree.getNoteById(activeViewModel.id))
				}
			})
		}
	}
}

function onConflictNavigate(direction: 'prev' | 'next') {
	mimiriEditor.navigateConflict(direction)
}

onMounted(() => {
	mimiriEditor.init(monacoContainer.value, proseMirrorContainer.value, proseMirrorPopup.value, conflictBanner.value)
	mimiriEditor.onSave(() => save())
	mimiriEditor.onSearchAll(() => titleBar.value?.searchAllNotes())
	mimiriEditor.onError(error => {
		if (error === 'note-size') {
			limitDialog.value.show('save-note-size')
		} else if (error === 'total-size') {
			limitDialog.value.show('save-total-size')
		} else if (error === 'lost-update') {
			infoDialog.value.show(
				'Note was changed',
				`The note you just saved appears to have been changed outside the editor while you were editing it.

This may happen if you edited the note in another tab or device.

This may also happen if your connection is unstable.

Or if this is a shared note: another user may have edited it.

You can view all changes in the history.`,
			)
		}
	})
	setActiveViewModel(noteManager.tree.selectedViewModel())

	watch(settingsManager.state, () => {
		mimiriEditor.syncSettings()
	})

	watch(noteManager.state, (newVal, _) => {
		if (newVal?.selectedNoteId && newVal?.selectedNoteId !== activeViewModel?.id) {
			historyVisible.value = false
			mimiriEditor.clearSearchHighlights()
			void save().then(() => {
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
	void save()
	window.history.back()
	noteManager.ui.closeEditorIfMobile()
}

const saveClicked = async () => {
	mimiriEditor.focus()
	void save()
}

const toggleWordWrap = () => {
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

const showWordWrap = computed(() => {
	return mimiriEditor.supportsWordWrap
})

const save = async () => {
	if (activeViewModel && saveEnabled.value && !saveInProgress) {
		saveInProgress = true
		try {
			await mimiriEditor.save()
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
