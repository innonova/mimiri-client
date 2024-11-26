<template>
	<dialog class="w-80 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">{{ title }}</div>
				<button class="cursor-default w-8" @click="close">X</button>
			</header>
			<main class="px-2 leading-5">
				<div>{{ text }}</div>
			</main>
			<footer class="flex justify-end gap-2">
				<button class="bg-button-secondary text-button-secondary-text mr-2 mb-2 hover:opacity-80" @click="close">
					OK
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../global'
const dialog = ref(null)
const title = ref('')
const text = ref('')

const toMB = bytes => {
	return `${Math.round((100 * bytes) / 1024 / 1024) / 100} MB`
}

const show = (limit: string) => {
	if (limit === 'create-note-count') {
		title.value = 'Note Limit Reached'
		text.value = `You have created ${noteManager.noteCount} of your ${noteManager.maxNoteCount} notes`
	}
	if (limit === 'create-note-size' || limit === 'save-total-size') {
		title.value = 'Data Limit Reached'
		text.value = `You have used ${toMB(noteManager.usedBytes)} of your ${toMB(noteManager.maxBytes)}`
	}
	if (limit === 'save-note-size') {
		title.value = 'Note Exceeds Max Size'
		text.value = `The note you are trying to save is ${toMB(
			noteManager.selectedNote?.size ?? 0,
		)} the maximum allowed is ${toMB(noteManager.maxNoteSize)}`
	}
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
