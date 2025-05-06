<template>
	<div
		v-if="shouldShow"
		class="tree-indent relative whitespace-nowrap cursor-default"
		@contextmenu="showContextMenu"
		draggable="true"
		@dragstart="startDrag"
		@drop="onDrop"
		@dragover="onDragOver"
		@dragenter="onDragEnter"
		@dragleave="onDragLeave"
	>
		<div
			class="rounded overflow-hidden h-[30px] md:h-[25px] flex items-center py-[19px] md:py-0"
			:class="{
				'bg-item-selected': isSelected && !createNewNode && !createNewRootNode,
				'text-menu-disabled': node.isRecycleBin && !hasChildren && !isSelected,
			}"
			ref="visualElement"
			data-testid="tree-node"
			@click="selectNode(false)"
			@dblclick="toggleNode"
		>
			<div
				v-show="indicatorVisible"
				id="drop-indicator"
				class="absolute left-4 indicator-top w-full h-0 border-2 border-solid border-drop-indicator pointer-events-none"
			></div>
			<div v-show="!searchModeActive" class="flex items-center pl-1 pr-0.5 h-full" @click="toggleNode">
				<PlusIcon
					v-if="!node.expanded"
					class="h-5 w-5 md:h-4 md:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				></PlusIcon>
				<MinusIcon
					v-if="node.expanded"
					class="h-5 w-5 md:h-4 md:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				></MinusIcon>
			</div>
			<NoteIcon
				v-if="!node.isRecycleBin"
				class="w-[30px] h-[30px] md:w-[23px] md:h-[23px] p-0.5 mr-1 md:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			></NoteIcon>
			<RecycleBinIcon
				v-if="node.isRecycleBin && hasChildren"
				class="w-[30px] h-[30px] md:w-[23px] md:h-[23px] p-0.5 mr-1 md:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			></RecycleBinIcon>
			<RecycleBinEmptyIcon
				v-if="node.isRecycleBin && !hasChildren"
				class="w-[30px] h-[30px] md:w-[23px] md:h-[23px] p-0.5 mr-1 md:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			></RecycleBinEmptyIcon>
			<input
				v-if="editName"
				class="outline-none bg-item-selected border-collapse flex-1 min-w-1 text-size-base"
				ref="renameInput"
				type="text"
				:value="node.title"
				@blur="endEdit"
				@keydown="checkCancelEdit"
			/>
			<div
				v-if="!editName"
				class="select-none flex-1 overflow-hidden overflow-ellipsis"
				:class="{
					'text-search-parent': isOnlyParent,
					'text-error': !shouldShow,
				}"
			>
				{{ node.title }}
			</div>
			<div class="md:hidden pl-10 py-[7px] flex justify-end" @click="selectNode(true)">
				<OpenIcon class="w-[23px] h-[23px] p-0.5 mr-1"></OpenIcon>
			</div>
		</div>
		<template v-for="childNode of node.children" :key="childNode.id">
			<TreeNode
				v-show="(node.expanded && !searchModeActive) || searchModeActive"
				:node="<NoteViewModel>childNode"
			></TreeNode>
		</template>
		<NewTreeNode v-if="isSelected && createNewNode"></NewTreeNode>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { noteManager, dragId, showSearchBox, createNewNode, createNewRootNode } from '../global'
import type { NoteViewModel } from '../services/types/mimer-note'
import { searchManager } from '../services/search-manager'
import NewTreeNode from './NewTreeNode.vue'
import NoteIcon from '../icons/note.vue'
import RecycleBinIcon from '../icons/recycle-bin.vue'
import RecycleBinEmptyIcon from '../icons/recycle-bin-empty.vue'
import PlusIcon from '../icons/plus.vue'
import MinusIcon from '../icons/minus.vue'
import OpenIcon from '../icons/open.vue'
import { MenuItems, menuManager } from '../services/menu-manager'

const visualElement = ref(null)
const renameInput = ref(null)
const indicatorTop = ref('0px')
const indicatorVisible = ref(false)
let dragOver = 0
let target = 0

const props = defineProps<{
	node: NoteViewModel
}>()

const editName = computed(() => !!props.node?.renaming)

watch(editName, (newVal, _) => {
	if (newVal) {
		setTimeout(() => {
			if (renameInput.value) {
				renameInput.value.focus()
				renameInput.value.select()
			}
		})
	}
})

const hasChildren = computed(() => props.node.children.length > 0)
const isSelected = computed(() => props.node.id === noteManager.state.selectedNoteId)
const shouldShow = computed(() => {
	const searchBoxShowing = showSearchBox.value
	return searchManager.isNoteFound(props.node.id) || searchManager.isChildFound(props.node.id) || !searchBoxShowing
})
const isOnlyParent = computed(() => {
	const searchBoxShowing = showSearchBox.value
	return !searchManager.isNoteFound(props.node.id) && searchBoxShowing
})
const searchModeActive = computed(() => {
	const searchBoxShowing = showSearchBox.value
	return searchManager.state.searchActive && searchBoxShowing
})

const startDrag = event => {
	event.stopPropagation()
	if (noteManager.isOnline && !props.node.isRecycleBin) {
		event.dataTransfer.dropEffect = 'move'
		event.dataTransfer.effectAllowed = 'move'
		dragId.value = props.node.id
	} else {
		event.preventDefault()
	}
}

const onDrop = async event => {
	try {
		event.stopPropagation()
		dragOver = 0
		indicatorVisible.value = false
		const note = noteManager.getNoteById(dragId.value)
		const dropNote = noteManager.getNoteById(props.node.id)
		if (target < 0) {
			await note.move(dropNote.parent, dropNote.index)
		} else if (target === 0) {
			dropNote.expand()
			await note.move(dropNote)
		} else {
			await note.move(dropNote.parent, dropNote.index + 1)
		}
	} catch (ex) {
		console.log(ex)
	}
}

const onDragOver = event => {
	try {
		event.stopPropagation()
		const id = dragId.value
		if (id !== props.node.id) {
			event.preventDefault()
			const height = visualElement.value.offsetHeight
			const top = height / 3
			const bottom = (2 * height) / 3

			if (event.offsetY < top && !props.node.isRecycleBin) {
				indicatorTop.value = '0px'
				target = -1
			} else if (event.offsetY > bottom) {
				indicatorTop.value = `${height}px`
				target = 1
			} else {
				indicatorTop.value = `${height / 2}px`
				target = 0
			}
		}
	} catch (ex) {
		console.log(ex)
	}
}

const onDragEnter = event => {
	try {
		event.stopPropagation()
		const id = dragId.value
		if (id !== props.node.id) {
			event.preventDefault()
			if (++dragOver > 0) {
				indicatorVisible.value = true
			}
		}
	} catch (ex) {
		console.log(ex)
	}
}

const onDragLeave = event => {
	try {
		event.stopPropagation()
		const id = dragId.value
		if (id !== props.node.id) {
			if (--dragOver <= 0) {
				indicatorVisible.value = false
			}
		}
	} catch (ex) {
		console.log(ex)
	}
}

const toggleNode = async e => {
	e.stopPropagation()
	if (hasChildren.value && !searchModeActive.value) {
		if (!props.node.expanded) {
			const note = noteManager.getNoteById(props.node.id)
			note.expand()
		} else {
			const note = noteManager.getNoteById(props.node.id)
			note.collapse()
		}
	}
}

const selectNode = async (mobileSwitch: boolean) => {
	noteManager.getNoteById(props.node.id).select()
	if (mobileSwitch) {
		noteManager.openNote()
	}
}

const checkCancelEdit = e => {
	e.stopPropagation()
	if (e.key === 'Escape') {
		props.node.renaming = false
		renameInput.value.value = props.node.title
		renameInput.value.blur()
	}
	if (e.key === 'Enter') {
		renameInput.value.blur()
	}
}

const endEdit = async e => {
	if (props.node.renaming) {
		props.node.renaming = false
		const inputElement = e.target as HTMLInputElement
		if (inputElement) {
			const newName = inputElement.value
			const note = noteManager.getNoteById(props.node.id)
			if (note.title !== newName) {
				props.node.title = newName
				note.title = newName
				await note.save()
			}
		}
	}
}

const showContextMenu = async e => {
	e.stopPropagation()
	e.preventDefault()
	await selectNode(false)

	if (props.node.isRecycleBin) {
		menuManager.showMenu({ x: e.x, y: e.y }, [
			...(props.node.children.length > 0 ? [MenuItems.EmptyRecycleBin] : []),
			MenuItems.Refresh,
		])
	} else {
		let showShare = true
		if (props.node.shared) {
			const note = noteManager.getNoteById(props.node.id)
			showShare = note.isShareRoot
		}
		menuManager.showMenu({ x: e.x, y: e.y }, [
			MenuItems.NewNote,
			MenuItems.Separator,
			MenuItems.Duplicate,
			MenuItems.Cut,
			MenuItems.Copy,
			MenuItems.Paste,
			MenuItems.CopyPath,
			MenuItems.Separator,
			...(showShare ? [MenuItems.Share] : []),
			MenuItems.Refresh,
			MenuItems.Separator,
			MenuItems.Rename,
			e.shiftKey ? MenuItems.Delete : MenuItems.Recycle,
		])
	}
}
</script>

<style scoped>
.tree-indent .tree-indent {
	margin-left: 25px;
}

.indicator-top {
	top: v-bind(indicatorTop);
}

.expand-icon-vertical-adjust {
	vertical-align: 2px;
}

.title-vertical-adjust {
	vertical-align: 3px;
}
</style>
