<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="sync-error-dialog"
	>
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close" data-testid="sync-error-dialog-title">{{ title }}</DialogTitle>
			<main class="px-2 leading-5">
				<div class="whitespace-pre-line">{{ text }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="close" data-testid="sync-error-dialog-ok">OK</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, syncStatus } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import { SYSTEM_NOTE_COUNT } from '../../services/storage/synchronization-service'
import { formatBytes } from '../../services/helpers'
const dialog = ref(null)
const title = ref('')
const text = ref('')

const show = () => {
	if (syncStatus.value === 'count-limit-exceeded') {
		title.value = 'Note Limit Reached'
		const totalCount =
			noteManager.state.userStats.noteCount + noteManager.state.userStats.localNoteCountDelta - SYSTEM_NOTE_COUNT
		const maxCount = noteManager.state.userStats.maxNoteCount

		text.value = `You have created ${totalCount} of your ${maxCount} notes\nYou can either delete some notes or upgrade your account to increase the limit.`
	}
	if (syncStatus.value === 'total-size-limit-exceeded') {
		title.value = 'Data Limit Reached'
		const totalSize = noteManager.state.userStats.size + noteManager.state.userStats.localSizeDelta
		const maxSize = noteManager.state.userStats.maxTotalBytes
		text.value = `You have created ${formatBytes(totalSize)} of your ${formatBytes(
			maxSize,
		)} data\nYou can either delete some data or upgrade your account to increase the limit.`
	}
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
