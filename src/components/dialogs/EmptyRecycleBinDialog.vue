<template>
	<dialog
		class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="empty-recycle-bin-dialog"
	>
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Empty Recycle Bin</DialogTitle>
			<main class="px-2">
				<div>Are you sure you want to permanently delete all items int the recycle bin?</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog" data-testid="empty-recycle-bin-yes">Yes</button>
				<button class="secondary" @click="close" data-testid="empty-recycle-bin-no">No</button>
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
	await noteManager.tree.recycleBin().deleteChildren()
	close()
}

defineExpose({
	show,
})
</script>
