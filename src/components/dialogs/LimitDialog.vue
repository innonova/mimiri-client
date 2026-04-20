<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ title }}</DialogTitle>
			<main class="px-2 leading-5">
				<div>{{ text }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="close">{{ $t('limitDialog.ok') }}</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, $t } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const title = ref('')
const text = ref('')
const isOpen = ref(false)

const toMB = bytes => {
	return `${Math.round((100 * bytes) / 1024 / 1024) / 100} MB`
}

const show = (limit: string) => {
	if (limit === 'create-note-count') {
		title.value = $t('limitDialog.noteCountTitle')
		text.value = $t('limitDialog.noteCountText', {
			count: noteManager.state.userStats.noteCount,
			max: noteManager.state.userStats.maxNoteCount,
		})
	}
	if (limit === 'create-note-size' || limit === 'save-total-size') {
		title.value = $t('limitDialog.dataSizeTitle')
		text.value = $t('limitDialog.dataSizeText', {
			used: toMB(noteManager.state.userStats.size),
			max: toMB(noteManager.state.userStats.maxTotalBytes),
		})
	}
	if (limit === 'save-note-size') {
		title.value = $t('limitDialog.noteSizeTitle')
		text.value = $t('limitDialog.noteSizeText', {
			size: toMB(noteManager.tree.selectedNote()?.size ?? 0),
			max: toMB(noteManager.state.userStats.maxNoteBytes),
		})
	}
	isOpen.value = true
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
