<template>
	<dialog
		class="w-72 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="delete-note-dialog"
	>
		<div
			v-if="!noteManager.tree.selectedNoteRef().value?.isShared || shareParticipants.length == 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
			data-testid="delete-note"
		>
			<DialogTitle @close="close">Delete Note</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.tree.selectedViewModelRef().value?.title }}
				</div>
				<div v-if="noteManager.tree.selectedNoteRef().value?.isShared" class="mt-5">
					No other users have access to this note
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
				<button class="primary" @click="submitDialog" data-testid="delete-dialog-confirm">Delete</button>
				<button class="secondary" @click="close" data-testid="delete-dialog-cancel">Cancel</button>
			</footer>
		</div>
		<div
			v-if="noteManager.tree.selectedNoteRef().value?.isShareRoot && shareParticipants.length > 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
			data-testid="leave-share"
		>
			<DialogTitle @close="close">Leave Share</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to leave this share:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.tree.selectedViewModelRef().value?.title }}
				</div>
				<div class="mt-5">This note will remain be accessible to:</div>
				<template v-if="shareParticipants.length < 5">
					<div v-for="participant in shareParticipants" :key="participant.username" class="mt-3 ml-3 mb-1 italic">
						{{ participant.username }}
					</div>
				</template>
				<div v-if="shareParticipants.length >= 5" class="mt-3 ml-3 mb-1 italic">
					{{ shareParticipants.length }} other users
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
				<button class="primary" @click="submitDialog" data-testid="leave-dialog-confirm">Leave</button>
				<button class="secondary" @click="close" data-testid="leave-dialog-cancel">Cancel</button>
			</footer>
		</div>
		<div
			v-if="!noteManager.tree.selectedNoteRef().value?.isShareRoot && shareParticipants.length > 0"
			class="grid grid-rows-[auto_1fr_auto] gap-6"
			data-testid="delete-share"
		>
			<DialogTitle @close="close">Delete Note</DialogTitle>
			<main class="px-2 mobile:text-center">
				<div>Are you sure you want to delete:</div>
				<div class="mt-3 ml-3 mb-1 italic">
					{{ noteManager.tree.selectedViewModelRef().value?.title }}
				</div>
				<div class="mt-5">This note will also be deleted for:</div>
				<template v-if="shareParticipants.length < 5">
					<div v-for="participant in shareParticipants" :key="participant.username" class="mt-3 ml-3 mb-1 italic">
						{{ participant.username }}
					</div>
				</template>
				<div v-if="shareParticipants.length >= 5" class="mt-3 ml-3 mb-1 italic">
					{{ shareParticipants.length }} other users
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2 mobile:mt-5">
				<button class="primary" @click="submitDialog" data-testid="delete-dialog-confirm">Delete</button>
				<button class="secondary" @click="close" data-testid="delete-dialog-cancel">Cancel</button>
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
		if (noteManager.tree.selectedNote()?.isShared) {
			shareParticipants.value = (
				await noteManager.note.getShareParticipants(noteManager.tree.selectedNote().id)
			).filter(item => item.username !== noteManager.state.username)
		} else {
			shareParticipants.value = []
		}
		dialog.value.showModal()
	}

	const close = () => {
		dialog.value.close()
	}

	const submitDialog = async () => {
		if (noteManager.tree.selectedNote().isShareRoot) {
			await noteManager.tree.selectedNote().deleteReference()
		} else {
			await noteManager.tree.selectedNote().delete()
		}
		close()
	}

	defineExpose({
		show,
	})
</script>
