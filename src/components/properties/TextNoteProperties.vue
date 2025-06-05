<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Properties']"></TabBar>
		<div class="flex flex-col overflow-y-auto h-full">
			<div class="grid grid-cols-[7rem_12rem] gap-3 items-baseline px-1 mt-2 mb-10">
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
				<div v-if="note.isShared && shareParticipants.length > 0" class="col-span-2 mt-4">
					This note is shared with:
				</div>
				<template v-for="participant in shareParticipants" :key="participant.username">
					<div class="whitespace-nowrap">{{ participant.username }}</div>
					<div class="flex">
						<div>{{ formatDateTime(new Date(participant.since)) }}</div>
					</div>
				</template>
				<div v-if="note.isShared && shareParticipants.length === 0" class="col-span-2 mt-4">
					You have shared this not but no one has accepted
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { noteManager } from '../../global'
import { formatBytes, formatDate, formatDateTime, formatTime } from '../../services/helpers'
import TabBar from '../elements/TabBar.vue'

const shareParticipants = ref([])

const note = computed(() => noteManager.selectedNote)

watch(
	note,
	async () => {
		if (note.value.isShared) {
			shareParticipants.value = (await noteManager.getShareParticipants(note.value.id)).filter(
				item => item.username !== noteManager.username,
			)
		} else {
			shareParticipants.value = []
		}
	},
	{ immediate: true },
)
</script>
