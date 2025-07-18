<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Properties']" />
		<div class="flex flex-col overflow-y-auto h-full">
			<div class="grid grid-cols-[7rem_15rem] gap-3 items-baseline px-1 mt-2 mb-10">
				<div>Data:</div>
				<div>{{ formatBytes(note.dataSize) }}</div>
				<div>History:</div>
				<div>{{ formatBytes(note.historySize) }}</div>
				<div>Total:</div>
				<div>{{ formatBytes(note.size) }}</div>
				<div>Created:</div>
				<div>{{ formatDateTime(note.created) }}</div>
				<div>Last Modified:</div>
				<div>{{ formatDateTime(note.updated) }}</div>
				<div class="col-span-2 flex gap-2">
					<button v-if="showDeleteOldHistory" class="primary" @click="deleteOldHistory">Delete old history</button>
					<button v-if="showDeleteAllHistory" class="primary" @click="deleteAllHistory">Delete all history</button>
				</div>
				<div v-if="note.isShared && shareParticipants.length > 0" class="col-span-2 mt-4 leading-5">
					This note is shared with:
				</div>
				<template v-for="participant in shareParticipants" :key="participant.username">
					<div class="whitespace-nowrap">{{ participant.username }}</div>
					<div class="flex">
						<div>{{ formatDateTime(new Date(participant.since)) }}</div>
					</div>
				</template>
				<div v-if="note.isShared && shareParticipants.length === 0" class="col-span-2 mt-4 leading-5">
					You have shared this not but no one has accepted
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
