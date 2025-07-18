<template>
	<div
		class="flex-auto pt-1.5 pr-2.5 pb-25 pl-1 bg-input overflow-y-auto overflow-x-hidden"
		@contextmenu="showContextMenu"
		@scroll="onScroll"
		ref="mainElement"
		data-testid="note-tree"
	>
		<template v-if="noteManager.tree.rootRef().value?.viewModel.children.length">
			<TreeNode v-for="node of noteManager.tree.rootRef().value?.viewModel.children" :node="node" :key="node.id" />
		</template>
		<NewTreeNode v-if="createNewRootNode" />
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
			noteManager.tree.root()?.viewModel.children.length &&
			noteManager.tree.selectedNote()
		) {
			stateLoaded = true
			mainElement.value.scrollTop = persistedState.getTreeScrollTop()
			if (noteManager.state.isMobile && persistedState.noteOpen && noteManager.tree.selectedNote()) {
				noteManager.tree.openNote(noteManager.tree.selectedNote().id)
			}
			stopWatching()
		}
	})

	const duplicateActiveNote = async () => {
		const note = noteManager.tree.selectedNote()
		if (note) {
			if (note.isSystem) {
				return
			}
			const index = note.parent.childIds.indexOf(note.id)
			await note.copy(note.parent, index + 1)
		}
	}
	const copyActiveNote = () => {
		const note = noteManager.tree.selectedNote()
		if (note?.isSystem) {
			return
		}
		clipboardNote.value = note
		isCut.value = false
	}
	const cutActiveNote = () => {
		const note = noteManager.tree.selectedNote()
		if (note?.isSystem) {
			return
		}
		clipboardNote.value = note
		isCut.value = true
	}
	const pasteIntoActiveNote = async () => {
		const note = noteManager.tree.selectedNote()
		if (note?.isSystem) {
			return
		}
		if (clipboardNote.value && note) {
			note.expand()
			if (isCut.value) {
				await clipboardNote.value.move(note)
			} else {
				await clipboardNote.value.copy(note)
			}
		}
	}

	const deleteActiveNote = () => {
		const note = noteManager.tree.selectedNote()
		if (note?.isSystem) {
			return
		}
		deleteNodeDialog.value.show()
	}

	const recycleActiveNote = () => {
		const note = noteManager.tree.selectedNote()
		if (note?.isSystem) {
			return
		}
		if (note.isShareRoot) {
			deleteNodeDialog.value.show()
		} else {
			note.moveToRecycleBin()
		}
	}

	const renameActiveNote = () => {
		const note = noteManager.tree.selectedNote()
		if (note && !note.isSystem) {
			note.viewModel.renaming = true
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
		const note = noteManager.tree.selectedNote()
		if (note) {
			if (note.index == 0) {
				if (note.parent && !note.isTopLevel) {
					note.parent.select()
				}
			} else if (note.prevSibling) {
				findBottomMostNode(note.prevSibling).select()
			}
		} else if (noteManager.tree.root().children.length > 0) {
			noteManager.tree.root().children[0].select()
		}
	}

	const moveSelectionDown = () => {
		const note = noteManager.tree.selectedNote()
		if (note) {
			if (note.expanded) {
				if (note.children.length > 0) {
					note.children[0].select()
				}
			} else {
				findNextNodeDown(note)?.select()
			}
		} else if (noteManager.tree.root().children.length > 0) {
			noteManager.tree.root().children[0].select()
		}
	}

	const moveSelectionLeft = () => {
		const note = noteManager.tree.selectedNote()
		if (note) {
			if (note.expanded) {
				note.collapse()
			} else if (note.parent && !note.isTopLevel) {
				note.parent.select()
			}
		} else if (noteManager.tree.root().children.length > 0) {
			noteManager.tree.root().children[0].select()
		}
	}

	const moveSelectionRight = () => {
		const note = noteManager.tree.selectedNote()
		if (note) {
			if (note.expanded) {
				if (note.children.length > 0) {
					note.children[0].select()
				}
			} else {
				note.expand()
			}
		} else if (noteManager.tree.root().children.length > 0) {
			noteManager.tree.root().children[0].select()
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
		if (mainElement.value && noteManager && (!noteManager.state.noteOpen || !noteManager.state.isMobile)) {
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
