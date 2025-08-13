<template>
	<dialog
		class="min-w-72 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="info-dialog"
	>
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close" data-testid="info-dialog-title">{{ titleText }}</DialogTitle>
			<main class="pl-3 pr-4">
				<div class="leading-5 max-w-86 whitespace-pre-wrap">{{ infoText }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="close" data-testid="info-dialog-ok">OK</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const titleText = ref('')
const infoText = ref('')

const show = (title: string, info: string) => {
	titleText.value = title
	infoText.value = info
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
