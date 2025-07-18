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
		:title="node.title"
	>
		<div
			class="rounded-sm relative overflow-hidden h-[30px] desktop:h-[25px] flex items-center py-[19px] desktop:py-0"
			:class="{
				'bg-item-selected': isSelected && !createNewNode && !createNewRootNode,
				'text-menu-disabled': node.isRecycleBin && !hasChildren && !isSelected,
			}"
			ref="visualElement"
			:data-testid="dataTestId"
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
					:data-testid="`${dataTestId}-closed`"
					title="Expand"
					class="h-5 w-5 desktop:h-4 desktop:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				/>
				<MinusIcon
					v-if="node.expanded"
					:data-testid="`${dataTestId}-open`"
					title="Collapse"
					class="h-5 w-5 desktop:h-4 desktop:w-4 mt-px"
					:class="{ invisible: !hasChildren }"
				/>
			</div>
			<NoteIcon
				v-if="node.icon === 'note'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<CogIcon
				v-if="node.icon === 'cog'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<FontIcon
				v-if="node.icon === 'font'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<CoinsIcon
				v-if="node.icon === 'coins'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<InfoIcon
				v-if="node.icon === 'info'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<DownloadIcon
				v-if="node.icon === 'download'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<LockIcon
				v-if="node.icon === 'lock'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<AccountIcon
				v-if="node.icon === 'account'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<AnnouncementIcon
				v-if="node.icon === 'announcement'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<BulbIcon
				v-if="node.icon === 'bulb'"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<RecycleBinIcon
				v-if="node.icon === 'recycle-bin' && hasChildren"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<RecycleBinEmptyIcon
				v-if="node.icon === 'recycle-bin' && !hasChildren"
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': node.shared }"
			/>
			<div v-if="node.hasInfo" class="absolute bottom-0.5 left-[35px] w-2 h-2 rounded-sm bg-bad" />
			<input
				v-if="editName"
				class="outline-hidden bg-item-selected! border-collapse p-0! pt-px! flex-1 min-w-1 text-size-base!"
				ref="renameInput"
				type="text"
				:value="node.title"
				@blur="endEdit"
				@keydown="checkCancelEdit"
				data-testid="rename-input"
			/>
			<div
				v-if="!editName"
				class="select-none flex-1 overflow-hidden text-ellipsis"
				:class="{
					'text-search-parent': isOnlyParent,
					'text-error': !shouldShow,
				}"
			>
				{{ node.title }}
			</div>
			<button class="desktop:hidden pl-10 py-[7px] flex justify-end" @click="selectNode(true)">
				<OpenIcon class="w-[23px] h-[23px] p-0.5 mr-1" />
			</button>
		</div>
		<template v-if="(node.expanded && !searchModeActive) || searchModeActive">
			<template v-for="childNode of node.children" :key="childNode.id">
				<TreeNode :node="<NoteViewModel>childNode" />
			</template>
		</template>
		<NewTreeNode v-if="isSelected && createNewNode" />
	</div>
</template>

<script setup lang="ts">
	import { computed, ref, watch } from 'vue'
	import { noteManager, dragId, showSearchBox, createNewNode, createNewRootNode, features, debug } from '../global'
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
	import CogIcon from '../icons/cog.vue'
	import FontIcon from '../icons/font.vue'
	import AccountIcon from '../icons/account.vue'
	import CoinsIcon from '../icons/coins.vue'
	import InfoIcon from '../icons/info.vue'
	import DownloadIcon from '../icons/download.vue'
	import LockIcon from '../icons/lock.vue'
	import AnnouncementIcon from '../icons/announcement.vue'
	import BulbIcon from '../icons/bulb.vue'

	const visualElement = ref(null)
	const renameInput = ref(null)
	const indicatorTop = ref('0px')
	const indicatorVisible = ref(false)
	let dragOver = 0
	let target = 0

	const dataTestId = computed(() => {
		if (props.node.isControlPanel) {
			return `node-control-panel`
		}
		if (props.node.isRecycleBin) {
			return `node-recycle-bin`
		}
		return `node-${props.node.id}`
	})

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
		if (!props.node.isSystem) {
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
			const note = noteManager.tree.getNoteById(dragId.value)
			const dropNote = noteManager.tree.getNoteById(props.node.id)
			if (target < 0) {
				await note.move(dropNote.parent, dropNote.index)
			} else if (target === 0) {
				dropNote.expand()
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

				if (event.offsetY < top && !props.node.isSystem) {
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

	const checkCancelEdit = e => {
		e.stopPropagation()
		if (e.key === 'Escape') {
			// eslint-disable-next-line vue/no-mutating-props
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
			// eslint-disable-next-line vue/no-mutating-props
			props.node.renaming = false
			const inputElement = e.target as HTMLInputElement
			if (inputElement) {
				const newName = inputElement.value
				const note = noteManager.tree.getNoteById(props.node.id)
				if (note.title !== newName) {
					// eslint-disable-next-line vue/no-mutating-props
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

		if (props.node.isSystem) {
			menuManager.showMenu({ x: e.x, y: e.y }, [
				...(props.node.children.length > 0 && props.node.isRecycleBin ? [MenuItems.EmptyRecycleBin] : []),
				MenuItems.Refresh,
			])
		} else {
			let showShare = true
			let showAcceptShare = features.includes('share-code')
			if (props.node.shared) {
				const note = noteManager.tree.getNoteById(props.node.id)
				showShare = note.isShareRoot
				showAcceptShare = false
			}
			if (!noteManager.state.isOnline) {
				showShare = false
				showAcceptShare = false
			}

			const note = noteManager.tree.getNoteById(props.node.id)
			const isInRecycleBin = note.isInRecycleBin

			menuManager.showMenu({ x: e.x, y: e.y }, [
				...(isInRecycleBin ? [] : [MenuItems.NewNote, MenuItems.Separator, MenuItems.Duplicate]),
				MenuItems.Cut,
				MenuItems.Copy,
				...(isInRecycleBin ? [] : [MenuItems.Paste, MenuItems.CopyPath]),

				MenuItems.Separator,
				...(showShare && !isInRecycleBin ? [MenuItems.Share] : []),
				...(showAcceptShare && !isInRecycleBin ? [MenuItems.ReceiveShareUnder] : []),
				MenuItems.Refresh,
				MenuItems.Separator,
				...(isInRecycleBin ? [] : [MenuItems.Rename]),
				e.shiftKey || isInRecycleBin || props.node.shared ? MenuItems.Delete : MenuItems.Recycle,
				MenuItems.Separator,
				MenuItems.Properties,
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
