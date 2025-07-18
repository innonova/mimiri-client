<template>
	<dialog class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Save Empty Note</DialogTitle>
			<main class="px-2">
				<div>Are you sure you want to save empty version of node:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteItem?.title }}
				</div>
			</main>
			<footer class="flex justify-end gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog">Yes</button>
				<button class="secondary" @click="close">No</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MimerNote } from '../../services/types/mimer-note'
import { mimiriEditor } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const noteItem = ref<MimerNote>(undefined)
let complete: (value: boolean) => void

const show = (note: MimerNote) => {
	return new Promise<boolean>(resolve => {
		complete = resolve
		noteItem.value = note
		dialog.value.showModal()
	})
}

const close = () => {
	if (mimiriEditor.note.id === noteItem.value.id) {
		mimiriEditor.reloadNode()
	}
	complete(false)
	dialog.value.close()
}

const submitDialog = async () => {
	complete(true)
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
