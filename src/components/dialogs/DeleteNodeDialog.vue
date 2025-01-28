<template>
	<dialog class="w-72 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Delete Note</DialogTitle>
			<main class="px-2">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.selectedViewModel?.title }}
				</div>
			</main>
			<footer class="flex justify-end gap-2 pr-2 pb-2">
				<button @click="submitDialog">Yes</button>
				<button class="secondary" @click="close">No</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)

const show = () => {
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	await noteManager.selectedNote.delete()
	close()
}

defineExpose({
	show,
})
</script>
