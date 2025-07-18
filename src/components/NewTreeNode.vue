<template>
	<div class="tree-indent relative whitespace-nowrap cursor-default">
		<div
			class="rounded-sm overflow-hidden h-[30px] desktop:h-[25px] flex items-center py-[19px] desktop:py-0 bg-item-selected"
		>
			<div class="flex items-center ml-1 mr-0.5 h-full min-w-5 desktop:w-4 desktop:min-w-4" />
			<NoteIcon
				class="w-[30px] h-[30px] desktop:w-[23px] desktop:h-[23px] p-0.5 mr-1 desktop:mr-0.5"
				:class="{ 'text-shared': createNewNode && noteManager.tree.selectedViewModelRef().value?.shared }"
			/>
			<input
				class="outline-none bg-item-selected! border-collapse p-0! pt-px flex-1 min-w-1 text-size-base!"
				ref="nameInput"
				type="text"
				@blur="endEdit"
				@keydown="checkCancelEdit"
				data-testid="new-tree-node-input"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NoteIcon from '../icons/note.vue'
import { createNewNode, createNewRootNode, mimiriEditor, noteManager } from '../global'

const nameInput = ref(null)

onMounted(() => {
	nameInput.value.focus()
})

const checkCancelEdit = e => {
	e.stopPropagation()
	if (e.key === 'Escape') {
		nameInput.value.blur()
		createNewNode.value = false
		createNewRootNode.value = false
		// props.node.renaming = false
		// renameInput.value.value = props.node.title
		// renameInput.value.blur()
	}
	if (e.key === 'Enter') {
		nameInput.value.blur()
	}
}

const endEdit = async e => {
	const name = nameInput.value?.value.trim()
	if (name) {
		if (createNewNode.value && noteManager.tree.selectedNote()) {
			await noteManager.tree.selectedNote().addChild(name)
		} else if (createNewRootNode.value) {
			await noteManager.tree.root().addChild(name)
		}
		mimiriEditor.focus()
	}
	createNewNode.value = false
	createNewRootNode.value = false
	// const newName = (e.target as HTMLInputElement).value
	// const note = noteManager.getNoteById(props.node.id)
	// if (note.title !== newName) {
	// 	props.node.title = newName
	// 	note.title = newName
	// 	note.save()
	// }
}
</script>

<style scoped>
.tree-indent .tree-indent {
	margin-left: 25px;
}
</style>
