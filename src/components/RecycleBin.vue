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
			class="rounded-sm overflow-hidden h-[30px] desktop:h-[25px] flex items-center py-4 desktop:py-0"
			:class="{
				'bg-item-selected': isSelected && !createNewNode && !createNewRootNode,
				'text-menu-disabled': !hasChildren,
			}"
			ref="visualElement"
			@click="selectNode(false)"
			@dblclick="toggleNode"
		>
			<div
				v-show="indicatorVisible"
				id="drop-indicator"
				class="absolute left-4 indicator-top w-full h-0 border-2 border-solid border-drop-indicator pointer-events-none"
			/>
			<div v-show="!searchModeActive" class="flex items-center pl-1 pr-0.5 h-full" @click="toggleNode">
				<PlusIcon
					v-if="!node.expanded"
					class="h-5 w-5 desktop:h-4 desktop:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				/>
				<MinusIcon
					v-if="node.expanded"
					class="h-5 w-5 desktop:h-4 desktop:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				/>
			</div>
			<RecycleBinIcon
				v-if="hasChildren"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<RecycleBinEmptyIcon
				v-if="!hasChildren"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<div
				class="select-none flex-1 overflow-hidden text-ellipsis"
				:class="{
					'text-search-parent': isOnlyParent,
					'text-error': !shouldShow,
				}"
			>
				Recycle Bin
			</div>
			<div class="desktop:hidden pl-14 flex justify-end" @click="selectNode(true)">
				<OpenIcon class="w-[23px] h-[23px] p-0.5" />
			</div>
		</div>
		<template v-for="childNode of node.children" :key="childNode.id">
			<TreeNode v-show="(node.expanded && !searchModeActive) || searchModeActive" :node="<NoteViewModel>childNode" />
		</template>
	</div>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { noteManager, dragId, showSearchBox, createNewNode, createNewRootNode, debug } from '../global'
	import type { NoteViewModel } from '../services/types/mimer-note'
	import { searchManager } from '../services/search-manager'
	import TreeNode from './TreeNode.vue'
	import RecycleBinIcon from '../icons/recycle-bin.vue'
	import RecycleBinEmptyIcon from '../icons/recycle-bin-empty.vue'
	import PlusIcon from '../icons/plus.vue'
	import MinusIcon from '../icons/minus.vue'
	import OpenIcon from '../icons/open.vue'
	import { MenuItems, menuManager } from '../services/menu-manager'
	import { de } from 'date-fns/locale'

	const visualElement = ref(null)
	const renameInput = ref(null)
	const indicatorTop = ref('0px')
	const indicatorVisible = ref(false)
	let dragOver = 0
	let target = 0

	const props = defineProps<{
		node: NoteViewModel
	}>()

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
		event.preventDefault()
	}

	const onDrop = async event => {
		try {
			event.stopPropagation()
			dragOver = 0
			indicatorVisible.value = false
			const note = noteManager.tree.getNoteById(dragId.value)
			const dropNote = noteManager.tree.getNoteById(props.node.id)
			if (target <= 0) {
				await note.move(dropNote)
			} else {
				await note.move(dropNote.parent, dropNote.index + 1)
			}
		} catch (ex) {
			debug.logError('Error dropping note', ex)
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

				if (event.offsetY > bottom) {
					indicatorTop.value = `${height}px`
					target = 1
				} else {
					indicatorTop.value = `${height / 2}px`
					target = 0
				}
			}
		} catch (ex) {
			debug.logError('Error during drag over', ex)
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
			debug.logError('Error during drag enter', ex)
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
			debug.logError('Error during drag leave', ex)
		}
	}

	const toggleNode = async e => {
		e.stopPropagation()
		if (hasChildren.value && !searchModeActive.value) {
			if (!props.node.expanded) {
				const note = noteManager.tree.getNoteById(props.node.id)
				note.expand()
			} else {
				const note = noteManager.tree.getNoteById(props.node.id)
				note.collapse()
			}
		}
	}

	const selectNode = async (mobileSwitch: boolean) => {
		noteManager.tree.openNote(props.node.id, mobileSwitch)
	}

	const showContextMenu = async e => {
		e.stopPropagation()
		e.preventDefault()
		await selectNode(false)

		menuManager.showMenu({ x: e.x, y: e.y }, [
			MenuItems.NewNote,
			MenuItems.NewRootNote,
			MenuItems.Separator,
			MenuItems.Duplicate,
			MenuItems.Cut,
			MenuItems.Copy,
			MenuItems.Paste,
			MenuItems.CopyPath,
			MenuItems.Separator,
			MenuItems.Share,
			MenuItems.Refresh,
			MenuItems.Separator,
			MenuItems.Rename,
			MenuItems.Delete,
		])
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
