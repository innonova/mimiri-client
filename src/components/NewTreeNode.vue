<template>
	<div class="tree-indent relative whitespace-nowrap cursor-default">
		<div class="rounded overflow-hidden h-[25px] flex items-center justify-start py-4 md:py-0 bg-item-selected">
			<div class="flex items-center ml-1 mr-0.5 h-full min-w-5 md:w-4 md:min-w-4"></div>
			<NoteIcon
				class="w-[30px] h-[30px] md:w-[23px] md:h-[23px] p-0.5 mr-1 md:mr-0.5"
				:class="{ 'text-shared': noteManager.selectedViewModel?.shared }"
			></NoteIcon>
			<input
				class="outline-none bg-item-selected border-collapse flex-0"
				ref="nameInput"
				type="text"
				@blur="endEdit"
				@keydown="checkCancelEdit"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NoteIcon from '../icons/file/document_2.vue'
import { createNewNode, createNewRootNode, noteManager } from '../global'

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
		if (createNewNode.value && noteManager.selectedNote) {
			await noteManager.selectedNote.addChild(name)
		} else if (createNewRootNode.value) {
			await noteManager.root.addChild(name)
		}
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
