<template>
	<dialog class="bg-dialog border border-solid border-dialog-border text-text min-w-78" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Accept Share</DialogTitle>
			<main class="px-2">
				<div>
					<label class="flex justify-between items-center">
						<span class="whitespace-nowrap">Share code:</span>
						<input
							ref="codeInput"
							class="basic-input ml-2"
							type="text"
							autofocus
							v-model="code"
							:class="{ invalid: invalid }"
							v-on:keyup.enter="submitDialog"
						/>
					</label>
				</div>
				<div v-if="invalid" class="mt-4 pr-1 text-right text-error">No share found!</div>
			</main>
			<footer class="flex justify-end gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog">OK</button>
				<button class="secondary" @click="close">Cancel</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import type { MimerNote } from '../../services/types/mimer-note'
const dialog = ref(null)
const code = ref('')
const codeInput = ref(null)

const invalid = ref(false)
let parent: MimerNote

const show = (note?: MimerNote) => {
	parent = note
	code.value = ''
	invalid.value = false
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	invalid.value = false
	if (!code.value.trim()) {
		invalid.value = true
		codeInput.value.focus()
		return
	}
	const offer = await noteManager.getShareOffer(code.value.trim())
	if (offer) {
		await noteManager.acceptShare(offer, parent)
		close()
	} else {
		invalid.value = true
	}
}

defineExpose({
	show,
})
</script>
