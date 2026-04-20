<template>
	<dialog
		class="bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ $t('deleteHistoryDialog.title') }}</DialogTitle>
			<main class="px-2 leading-5">
				<div v-if="deleteAllHistory">{{ $t('deleteHistoryDialog.deleteAll') }}</div>
				<div v-if="!deleteAllHistory">{{ $t('deleteHistoryDialog.deleteOlder') }}</div>
				<div v-if="!deleteAllHistory">{{ $t('deleteHistoryDialog.keepRecent') }}</div>
				<div class="mt-4">{{ $t('deleteHistoryDialog.affectedNote') }}</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.tree.selectedViewModelRef().value?.title }}
				</div>
				<div v-if="shareParticipants.length > 0" class="mt-5">{{ $t('deleteHistoryDialog.sharedWith') }}</div>
				<template v-if="shareParticipants.length > 0 && shareParticipants.length < 5">
					<div v-for="participant in shareParticipants" :key="participant.username" class="mt-3 ml-3 mb-1 italic">
						{{ participant.username }}
					</div>
				</template>
				<div v-if="shareParticipants.length >= 5" class="mt-3 ml-3 mb-1 italic">
					{{ $t('deleteHistoryDialog.otherUsers', { count: shareParticipants.length }) }}
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog">{{ $t('deleteHistoryDialog.delete') }}</button>
				<button class="secondary" @click="close">{{ $t('deleteHistoryDialog.cancel') }}</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const deleteAllHistory = ref(false)
const shareParticipants = ref([])
const isOpen = ref(false)
let callback: () => void

const show = async (all: boolean, cb: () => void) => {
	deleteAllHistory.value = !!all
	callback = cb
	if (noteManager.tree.selectedNote()?.isShared) {
		shareParticipants.value = (await noteManager.note.getShareParticipants(noteManager.tree.selectedNote().id)).filter(
			item => item.username !== noteManager.state.username,
		)
	} else {
		shareParticipants.value = []
	}
	isOpen.value = true
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	if (deleteAllHistory.value) {
		await noteManager.tree.selectedNote().deleteHistory()
	} else {
		await noteManager.tree.selectedNote().deleteArchivedHistory()
	}
	callback()
	close()
}

defineExpose({
	show,
})
</script>
