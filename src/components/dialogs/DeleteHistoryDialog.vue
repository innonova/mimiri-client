<template>
	<dialog class="bg-dialog text-text desktop:border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Delete History</DialogTitle>
			<main class="px-2 leading-5">
				<div v-if="deleteAllHistory">Are you sure you want to delete ALL history</div>
				<div v-if="!deleteAllHistory">Are you sure you want to delete older history</div>
				<div v-if="!deleteAllHistory">(keeping only the most recent 10 versions)</div>
				<div class="mt-4">Affected note:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.tree.selectedViewModelRef().value?.title }}
				</div>
				<div v-if="shareParticipants.length > 0" class="mt-5">This note is shared with:</div>
				<div
					v-if="shareParticipants.length > 0 && shareParticipants.length < 5"
					v-for="participant in shareParticipants"
					:key="participant.username"
					class="mt-3 ml-3 mb-1 italic"
				>
					{{ participant.username }}
				</div>
				<div v-if="shareParticipants.length >= 5" class="mt-3 ml-3 mb-1 italic">
					{{ shareParticipants.length }} other users
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="submitDialog">Delete</button>
				<button class="secondary" @click="close">Cancel</button>
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
