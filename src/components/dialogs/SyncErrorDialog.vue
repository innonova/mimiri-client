<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="sync-error-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close" data-testid="sync-error-dialog-title">{{ title }}</DialogTitle>
			<main class="px-2 leading-5">
				<div class="whitespace-pre-line">{{ text }}</div>
			</main>
			<footer
				class="flex mobile:justify-center gap-2 pr-2 pb-2 pl-2"
				:class="{ 'justify-between': showShow || showUpgrade, 'justify-end': !showShow && !showUpgrade }"
			>
				<button v-if="showShow" class="secondary" @click="showNote" data-testid="sync-error-dialog-show-note">
					{{ $t('syncErrorDialog.show') }}
				</button>
				<button v-if="showUpgrade" class="secondary" @click="upgrade" data-testid="sync-error-dialog-upgrade">
					{{ $t('syncErrorDialog.upgrade') }}
				</button>
				<button class="primary" @click="close" data-testid="sync-error-dialog-ok">
					{{ $t('syncErrorDialog.ok') }}
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, syncOverSizeNote, syncStatus, $t } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import { SYSTEM_NOTE_COUNT } from '../../services/storage/synchronization-service'
import { formatBytes } from '../../services/helpers'
import type { Guid } from '../../services/types/guid'
const dialog = ref(null)
const title = ref('')
const text = ref('')
const showShow = ref(false)
const showUpgrade = ref(false)
const isOpen = ref(false)

const show = async () => {
	showShow.value = false
	showUpgrade.value = false
	if (syncStatus.value === 'count-limit-exceeded') {
		showUpgrade.value = true && !noteManager.state.isMobile
		title.value = $t('syncErrorDialog.noteLimitTitle')
		const totalCount =
			noteManager.state.userStats.noteCount + noteManager.state.userStats.localNoteCountDelta - SYSTEM_NOTE_COUNT
		const maxCount = noteManager.state.userStats.maxNoteCount

		text.value = $t('syncErrorDialog.noteLimitText', { count: totalCount, max: maxCount })
	}
	if (syncStatus.value === 'total-size-limit-exceeded') {
		showUpgrade.value = true && !noteManager.state.isMobile
		title.value = $t('syncErrorDialog.dataLimitTitle')
		const totalSize = noteManager.state.userStats.size + noteManager.state.userStats.localSizeDelta
		const maxSize = noteManager.state.userStats.maxTotalBytes
		text.value = $t('syncErrorDialog.dataLimitText', { used: formatBytes(totalSize), max: formatBytes(maxSize) })
	}
	if (syncStatus.value === 'note-size-limit-exceeded') {
		showShow.value = true && !noteManager.state.isMobile
		const note = await noteManager.tree.getNoteById(syncOverSizeNote.value)
		title.value = $t('syncErrorDialog.noteSizeLimitTitle')
		const maxSize = noteManager.state.userStats.maxNoteBytes
		text.value = $t('syncErrorDialog.noteSizeLimitText', {
			title: note.title,
			size: formatBytes(note.size),
			max: formatBytes(maxSize),
		})
	}
	if (syncStatus.value === 'synchronization-error') {
		title.value = $t('syncErrorDialog.syncErrorTitle')
		text.value = $t('syncErrorDialog.syncErrorText')
	}
	if (syncStatus.value === 'server-rejection') {
		title.value = $t('syncErrorDialog.syncErrorTitle')
		text.value = $t('syncErrorDialog.serverRejectionText')
	}
	isOpen.value = true
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
