<template>
	<dialog class="w-72 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">Save Empty Note</div>
				<button class="cursor-default w-8" @click="close">X</button>
			</header>
			<main class="px-2">
				<div>Are you sure you want to save empty version of node:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteItem?.title }}
				</div>
			</main>
			<footer class="flex justify-end gap-2">
				<button class="bg-button-primary text-button-primary-text mr-2 mb-2 hover:opacity-80" @click="submitDialog">
					Yes
				</button>
				<button class="bg-button-secondary text-button-secondary-text mr-2 mb-2 hover:opacity-80" @click="close">
					No
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MimerNote } from '../services/types/mimer-note'
import { mimiriEditor } from '../global'
const dialog = ref(null)
const noteItem = ref<MimerNote>(undefined)

const show = (note: MimerNote) => {
	noteItem.value = note
	dialog.value.showModal()
}

const close = () => {
	if (mimiriEditor.note.id === noteItem.value.id) {
		mimiriEditor.reloadNode()
	}
	dialog.value.close()
}

const submitDialog = async () => {
	noteItem.value.text = ''
	noteItem.value.save()
	close()
}

defineExpose({
	show,
})
</script>
