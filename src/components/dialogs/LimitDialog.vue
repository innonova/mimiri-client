<template>
	<dialog class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ title }}</DialogTitle>
			<main class="px-2 leading-5">
				<div>{{ text }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="close">OK</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
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
