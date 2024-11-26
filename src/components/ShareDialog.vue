<template>
	<dialog class="bg-dialog border border-solid border-dialog-border text-text" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center">
				<h1 class="pl-2">Share Note</h1>
				<button class="cursor-default w-8" @click="close">X</button>
			</header>
			<main class="px-2">
				<div>
					<label class="flex justify-between items-center">
						<span>Share with:</span>
						<input
							ref="nameInput"
							class="w-48 bg-input text-input-text ml-2"
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
			<footer class="flex justify-end gap-2">
				<button class="bg-button-primary text-button-primary-text mr-2 mb-2" @click="submitDialog">OK</button>
				<button class="bg-button-secondary text-button-secondary-text mr-2 mb-2" @click="close">Cancel</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { noteManager } from '../global'
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
