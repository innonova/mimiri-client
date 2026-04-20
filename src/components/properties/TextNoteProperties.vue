<template>
	<div class="flex flex-col h-full" data-testid="text-note-properties">
		<TabBar :items="[$t('textNoteProperties.tab')]" />
		<div class="flex flex-col overflow-y-auto h-full">
			<div class="grid grid-cols-[7rem_15rem] gap-3 items-baseline px-1 mt-2 mb-10">
				<div>{{ $t('textNoteProperties.data') }}</div>
				<div data-testid="note-data-size">{{ formatBytes(note.dataSize) }}</div>
				<div>{{ $t('textNoteProperties.history') }}</div>
				<div data-testid="note-history-size">{{ formatBytes(note.historySize) }}</div>
				<div>{{ $t('textNoteProperties.total') }}</div>
				<div data-testid="note-total-size">{{ formatBytes(note.size) }}</div>
				<div>{{ $t('textNoteProperties.created') }}</div>
				<div data-testid="note-created">{{ formatDateTime(note.created) }}</div>
				<div>{{ $t('textNoteProperties.lastModified') }}</div>
				<div data-testid="note-updated">{{ formatDateTime(note.updated) }}</div>
				<div>{{ $t('textNoteProperties.key') }}</div>
				<div data-testid="note-key">{{ note.keyFriendlyName }}</div>
				<div class="col-span-2 flex gap-2">
					<button v-if="showDeleteOldHistory" class="primary" @click="deleteOldHistory">
						{{ $t('textNoteProperties.deleteOldHistory') }}
					</button>
					<button v-if="showDeleteAllHistory" class="primary" @click="deleteAllHistory">
						{{ $t('textNoteProperties.deleteAllHistory') }}
					</button>
				</div>
				<div v-if="note.isShared && shareParticipants.length > 0" class="col-span-2 mt-4 leading-5">
					{{ $t('textNoteProperties.sharedWith') }}
				</div>
				<template v-for="participant in shareParticipants" :key="participant.username">
					<div class="col-span-2 flex gap-3">
						<div class="whitespace-nowrap min-w-[7rem]" data-testid="share-participant-username">
							{{ participant.username }}
						</div>
						<div class="flex">
							<div>{{ formatDateTime(new Date(participant.since)) }}</div>
						</div>
					</div>
				</template>
				<div
					v-if="note.isShared && shareParticipantsLoaded && shareParticipants.length === 0"
					class="col-span-2 mt-4 leading-5"
					data-testid="no-share-participants"
				>
					{{ $t('textNoteProperties.noOneAccepted') }}
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { deleteHistoryDialog, noteManager } from '../../global'
import { formatBytes, formatDateTime } from '../../services/helpers'
import TabBar from '../elements/TabBar.vue'

const shareParticipants = ref([])
const shareParticipantsLoaded = ref(false)
const showDeleteOldHistory = ref(false)
const showDeleteAllHistory = ref(false)

const note = computed(() => noteManager.tree.selectedNote())

const update = async () => {
	if (note.value.isShared) {
		shareParticipants.value = (await noteManager.note.getShareParticipants(note.value.id)).filter(
			item => item.username !== noteManager.state.username,
		)
	} else {
		shareParticipants.value = []
	}
	shareParticipantsLoaded.value = true
	if (note.value.historyItems.length === 0) {
		await note.value.loadHistory()
	}
	showDeleteOldHistory.value = note.value.historyItems.length > 10 || note.value.hasMoreHistory
	showDeleteAllHistory.value = note.value.historyItems.length > 0
}

watch(
	[note],
	async () => {
		await update()
	},
	{ immediate: true },
)

const deleteOldHistory = async () => {
	deleteHistoryDialog.value.show(false, () => {
		void update()
	})
}

const deleteAllHistory = async () => {
	deleteHistoryDialog.value.show(true, () => {
		void update()
	})
}
</script>
