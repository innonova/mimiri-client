<template>
	<div
		class="flex-auto pt-1.5 pr-2.5 pb-25 pl-1 bg-input overflow-y-auto overflow-x-hidden"
		@contextmenu="showContextMenu"
		@scroll="onScroll"
		ref="mainElement"
		data-testid="note-tree"
	>
		<TreeNode
			v-if="showNodes && noteManager.tree.root?.viewModel.children.length"
			v-for="node of noteManager.tree.root.viewModel.children"
			:node="node"
			:key="node.id"
		></TreeNode>
		<NewTreeNode v-if="createNewRootNode"></NewTreeNode>
		<div v-if="noSearchResults" class="text-center text-text text-size-menu mt-2 cursor-default">No results found</div>
	</div>
</template>

<script setup lang="ts">
import { clipboardNote, createNewRootNode, deleteNodeDialog, isCut, noteManager, showSearchBox } from '../global'
import type { MimerNote } from '../services/types/mimer-note'
import TreeNode from './TreeNode.vue'
import NewTreeNode from './NewTreeNode.vue'
import { MenuItems, menuManager } from '../services/menu-manager'
import { Debounce } from '../services/helpers'
import { computed, ref, watch } from 'vue'
import { persistedState } from '../services/persisted-state'
import { searchManager } from '../services/search-manager'

const mainElement = ref(null)
let stateLoaded = false
const showNodes = ref(false)

watch(
	noteManager.state,
	() => {
		showNodes.value = noteManager.state.stateLoaded && noteManager.state.isLoggedIn && noteManager.state.stateLoaded
	},
	{ immediate: true },
)

const noSearchResults = computed(
	() =>
		showSearchBox.value &&
		searchManager.state.searchActive &&
		!searchManager.state.searchRunning &&
		Object.keys(searchManager.state.notes).length === 0,
)

const stopWatching = watch(noteManager.state, () => {
	if (
		noteManager.state.stateLoaded &&
		!stateLoaded &&
		noteManager.state.isLoggedIn &&
		noteManager.tree.root?.viewModel.children.length &&
		noteManager.tree.selectedNote
	) {
		stateLoaded = true
		mainElement.value.scrollTop = persistedState.getTreeScrollTop()
		if (noteManager.isMobile && persistedState.noteOpen && noteManager.tree.selectedNote) {
			noteManager.tree.openNote(noteManager.tree.selectedNote.id)
		}
		stopWatching()
	}
})

const duplicateActiveNote = async () => {
	if (noteManager.tree.selectedNote) {
		const index = noteManager.tree.selectedNote.parent.childIds.indexOf(noteManager.tree.selectedNote.id)
		await noteManager.tree.selectedNote.copy(noteManager.tree.selectedNote.parent, index + 1)
	}
}
const copyActiveNote = () => {
	clipboardNote.value = noteManager.tree.selectedNote
	isCut.value = false
}
const cutActiveNote = () => {
	clipboardNote.value = noteManager.tree.selectedNote
	isCut.value = true
}
const pasteIntoActiveNote = async () => {
	if (clipboardNote.value && noteManager.tree.selectedNote) {
		noteManager.tree.selectedNote.expand()
		if (isCut.value) {
			await clipboardNote.value.move(noteManager.tree.selectedNote)
		} else {
			await clipboardNote.value.copy(noteManager.tree.selectedNote)
		}
	}
}

const deleteActiveNote = () => {
	deleteNodeDialog.value.show()
}

const recycleActiveNote = () => {
	if (noteManager.tree.selectedNote.isShareRoot) {
		deleteNodeDialog.value.show()
	} else {
		noteManager.tree.selectedNote.moveToRecycleBin()
	}
}

const renameActiveNote = () => {
	if (noteManager.tree.selectedNote && !noteManager.tree.selectedNote.isSystem) {
		noteManager.tree.selectedNote.viewModel.renaming = true
	}
}

const findBottomMostNode = (note: MimerNote) => {
	if (note.expanded && note.children.length > 0) {
		return findBottomMostNode(note.children[note.children.length - 1])
	}
	return note
}
const findNextNodeDown = (note: MimerNote) => {
	if (note.nextSibling) {
		return note.nextSibling
	}
	if (note.parent) {
		return findNextNodeDown(note.parent)
	}
	return undefined
}

const moveSelectionUp = () => {
	const note = noteManager.tree.selectedNote
	if (note) {
		if (note.index == 0) {
			if (note.parent && !note.isTopLevel) {
				note.parent.select()
			}
		} else if (note.prevSibling) {
			findBottomMostNode(note.prevSibling).select()
		}
	} else if (noteManager.tree.root.children.length > 0) {
		noteManager.tree.root.children[0].select()
	}
}

const moveSelectionDown = () => {
	const note = noteManager.tree.selectedNote
	if (note) {
		if (note.expanded) {
			if (note.children.length > 0) {
				note.children[0].select()
			}
		} else {
			findNextNodeDown(note)?.select()
		}
	} else if (noteManager.tree.root.children.length > 0) {
		noteManager.tree.root.children[0].select()
	}
}

const moveSelectionLeft = () => {
	const note = noteManager.tree.selectedNote
	if (note) {
		if (note.expanded) {
			note.collapse()
		} else if (note.parent && !note.isTopLevel) {
			note.parent.select()
		}
	} else if (noteManager.tree.root.children.length > 0) {
		noteManager.tree.root.children[0].select()
	}
}

const moveSelectionRight = () => {
	const note = noteManager.tree.selectedNote
	if (note) {
		if (note.expanded) {
			if (note.children.length > 0) {
				note.children[0].select()
			}
		} else {
			note.expand()
		}
	} else if (noteManager.tree.root.children.length > 0) {
		noteManager.tree.root.children[0].select()
	}
}

const showContextMenu = async e => {
	e.stopPropagation()
	e.preventDefault()
	menuManager.showMenu({ x: e.x, y: e.y }, [MenuItems.NewRootNote, MenuItems.RefreshRoot])
}

const hasFocus = () => {
	return document.activeElement.tagName === 'BODY'
}

const scrollDebounce = new Debounce(async () => {
	if (mainElement.value && noteManager && (!noteManager.state.noteOpen || !noteManager.isMobile)) {
		const scrollTop = Math.round(mainElement.value.scrollTop)
		persistedState.setTreeScrollTop(scrollTop)
	}
}, 250)

const onScroll = () => {
	if (stateLoaded) {
		scrollDebounce.activate()
	}
}

defineExpose({
	duplicateActiveNote,
	copyActiveNote,
	cutActiveNote,
	pasteIntoActiveNote,
	deleteActiveNote,
	recycleActiveNote,
	renameActiveNote,
	moveSelectionUp,
	moveSelectionDown,
	moveSelectionLeft,
	moveSelectionRight,
	hasFocus,
})
</script>
