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
			<footer
				class="flex mobile:justify-center gap-2 pr-2 pb-2 pl-2"
				:class="{ 'justify-between': showShow || showUpgrade, 'justify-end': !showShow && !showUpgrade }"
			>
				<button v-if="showShow" class="secondary" @click="showNote" data-testid="sync-error-dialog-show-note">
					Show
				</button>
				<button v-if="showUpgrade" class="secondary" @click="upgrade" data-testid="sync-error-dialog-upgrade">
					Upgrade
				</button>
				<button class="primary" @click="close" data-testid="sync-error-dialog-ok">OK</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, syncOverSizeNote, syncStatus } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import { SYSTEM_NOTE_COUNT } from '../../services/storage/synchronization-service'
import { formatBytes } from '../../services/helpers'
import type { Guid } from '../../services/types/guid'
const dialog = ref(null)
const title = ref('')
const text = ref('')
const showShow = ref(false)
const showUpgrade = ref(false)

const show = async () => {
	showShow.value = false
	showUpgrade.value = false
	if (syncStatus.value === 'count-limit-exceeded') {
		showUpgrade.value = true
		title.value = 'Note Limit Reached'
		const totalCount =
			noteManager.state.userStats.noteCount + noteManager.state.userStats.localNoteCountDelta - SYSTEM_NOTE_COUNT
		const maxCount = noteManager.state.userStats.maxNoteCount

		text.value = `You have created ${totalCount} of your ${maxCount} notes\nYou can either delete some notes or upgrade your account to increase the limit.`
	}
	if (syncStatus.value === 'total-size-limit-exceeded') {
		showUpgrade.value = true
		title.value = 'Data Limit Reached'
		const totalSize = noteManager.state.userStats.size + noteManager.state.userStats.localSizeDelta
		const maxSize = noteManager.state.userStats.maxTotalBytes
		text.value = `You have created ${formatBytes(totalSize)} of your ${formatBytes(maxSize)} data

		You can either delete some data or upgrade your account to increase the limit.`
	}
	if (syncStatus.value === 'note-size-limit-exceeded') {
		showShow.value = true
		const note = await noteManager.tree.getNoteById(syncOverSizeNote.value)
		title.value = 'Note Size Limit Reached'
		const maxSize = noteManager.state.userStats.maxNoteBytes
		text.value = `The Note '${note.title}' (${formatBytes(note.size)})
		exceeds the size limit (${formatBytes(maxSize)})

		You can either split the note into smaller notes or upgrade your account to increase the limit.

		You can also try deleting note history to reduce the size of the note. (This can be done in the note properties)`
	}
	if (syncStatus.value === 'synchronization-error') {
		title.value = 'Synchronization Error'
		text.value = `An unexpected error occurred while attempting to synchronize.\n\nCheck your internet connection or try again later.`
	}
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}
const showNote = async () => {
	const note = await noteManager.tree.getNoteById(syncOverSizeNote.value)
	await note.select()
	dialog.value.close()
}

const upgrade = async () => {
	noteManager.tree.openNote('settings-plan' as Guid)
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
