<template>
	<dialog
		class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="dialog-delete-payment-method"
	>
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Delete Payment Method</DialogTitle>
			<main class="px-2">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ text }}
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog" data-testid="dialog-yes">Yes</button>
				<button class="secondary" data-testid="dialog-no" @click="close">No</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const text = ref('')
let cb: (confirmed: boolean) => void | undefined = undefined

const show = (name: string, callback: (confirmed: boolean) => void) => {
	dialog.value.showModal()
	text.value = name
	cb = callback
}

const close = () => {
	cb(false)
	dialog.value.close()
}

const submitDialog = async () => {
	cb(true)
	close()
}

defineExpose({
	show,
})
</script>
