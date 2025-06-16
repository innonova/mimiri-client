<template>
	<dialog class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border" ref="dialog">
		<div
			v-if="!noteManager.selectedNote?.isShared || shareParticipants.length == 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
		>
			<DialogTitle @close="close">Delete Note</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.selectedViewModel?.title }}
				</div>
				<div v-if="noteManager.selectedNote?.isShared" class="mt-5">No other users have access to this note</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
				<button class="primary" @click="submitDialog">Delete</button>
				<button class="secondary" @click="close">Cancel</button>
			</footer>
		</div>
		<div
			v-if="noteManager.selectedNote?.isShareRoot && shareParticipants.length > 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
		>
			<DialogTitle @close="close">Leave Share</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to leave this share:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.selectedViewModel?.title }}
				</div>
				<div class="mt-5">This note will remain be accessible to:</div>
				<div
					v-if="shareParticipants.length < 5"
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
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
				<button class="primary" @click="submitDialog">Leave</button>
				<button class="secondary" @click="close">Cancel</button>
			</footer>
		</div>
		<div
			v-if="!noteManager.selectedNote?.isShareRoot && shareParticipants.length > 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
		>
			<DialogTitle @close="close">Delete Note</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.selectedViewModel?.title }}
				</div>
				<div class="mt-5">This note will also be deleted for:</div>
				<div
					v-if="shareParticipants.length < 5"
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
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
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
const shareParticipants = ref([])

const show = async () => {
	if (noteManager.selectedNote?.isShared) {
		shareParticipants.value = (await noteManager.getShareParticipants(noteManager.selectedNote.id)).filter(
			item => item.username !== noteManager.username,
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
	if (noteManager.selectedNote.isShareRoot) {
		await noteManager.selectedNote.deleteReference()
	} else {
		await noteManager.selectedNote.delete()
	}
	close()
}

defineExpose({
	show,
})
</script>
