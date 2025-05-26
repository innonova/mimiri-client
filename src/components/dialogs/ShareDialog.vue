<template>
	<dialog class="bg-dialog border border-solid border-dialog-border text-text" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Share Note</DialogTitle>
			<main class="px-2">
				<div>
					<label class="flex justify-between items-center">
						<span>Share with:</span>
						<input
							ref="nameInput"
							class="basic-input ml-2"
							type="text"
							autofocus
							v-model="name"
							:class="{ invalid: invalid }"
							v-on:keyup.enter="submitDialog"
						/>
					</label>
				</div>
				<div class="mt-4 text-right hidden">
					<label for="allow-reshare">Allow reshare</label
					><input ref="allowReshare" id="allow-reshare" type="checkbox" class="align-middle mr-0 ml-2" />
				</div>
			</main>
			<footer class="flex justify-end gap-2 pr-2 pb-2">
				<button @click="submitDialog">OK</button>
				<button class="secondary" @click="close">Cancel</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const nameInput = ref(null)
const allowReshare = ref(null)

const name = ref('')
const invalid = ref(false)

const hasSelectedNode = computed(() => !!noteManager.state.selectedNoteId)
const parentName = computed(() => noteManager.selectedViewModel?.title)

const show = () => {
	allowReshare.value.checked = false
	nameInput.value = ''
	invalid.value = false
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	if (!name.value.trim()) {
		invalid.value = true
		nameInput.value.focus()
		return
	}
	const trimmedName = name.value.trim()
	noteManager.selectedNote.shareWith(trimmedName)
	close()
	name.value = ''
}

defineExpose({
	show,
})
</script>
