<template>
	<dialog
		class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="empty-recycle-bin-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ $t('emptyRecycleBinDialog.title') }}</DialogTitle>
			<main class="px-2">
				<div>{{ $t('emptyRecycleBinDialog.question') }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog" :disabled="isDeleting" data-testid="empty-recycle-bin-yes">
					{{ $t('emptyRecycleBinDialog.yes') }}
				</button>
				<button class="secondary" @click="close" :disabled="isDeleting" data-testid="empty-recycle-bin-no">
					{{ $t('emptyRecycleBinDialog.no') }}
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const isOpen = ref(false)
const isDeleting = ref(false)

const show = () => {
	isOpen.value = true
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	if (isDeleting.value) {return}
	isDeleting.value = true
	try {
		await noteManager.tree.recycleBin().deleteChildren()
		setTimeout(() => {
			noteManager.session.queueSync()
		}, 1000)
		close()
	} finally {
		isDeleting.value = false
	}
}

defineExpose({
	show,
})
</script>
