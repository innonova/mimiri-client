<template>
	<div class="bg-input h-2/3 overflow-none select-none flex flex-col" tabindex="1">
		<div class="flex justify-between items-center py-px px-2.5 bg-toolbar border-b border-solid border-toolbar">
			<div>Share Offers</div>
			<ToolbarIcon
				icon="refresh"
				:hoverEffect="true"
				title="Refresh Root Notes"
				@click="refreshShareOffers"
			></ToolbarIcon>
		</div>
		<div class="py-px px-1 overflow-y-auto h-full">
			<template v-for="offer of noteManager.state.shareOffers" :key="offer.id">
				<div
					class="p-1 cursor-default flex flex-col items-start w-full border-b border-solid border-menu-separator mb-4"
				>
					<div class="flex-auto flex w-full" :title="formatDate(new Date(offer.created))">
						<NoteIcon class="w-[24px] h-[24px] inline-block pt-1 pb-px text-shared"></NoteIcon>
						<div class="px-1">{{ offer.name }}</div>
					</div>
					<div class="ml-7">
						from: <span class="italic">{{ offer.sender }}</span>
					</div>
					<div class="flex w-full justify-end mt-2">
						<button @click="acceptOffer(offer)">Accept</button>
						<button class="secondary" @click="declineOffer(offer)">Ignore</button>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { noteManager } from '../global'
import type { NoteShareInfo } from '../services/types/note-share-info'
import ToolbarIcon from './ToolbarIcon.vue'
import NoteIcon from '../icons/note.vue'

const formatDate = (value: Date) => {
	return (
		value.getFullYear() +
		'-' +
		('0' + (value.getMonth() + 1)).slice(-2) +
		'-' +
		('0' + value.getDate()).slice(-2) +
		' ' +
		('0' + value.getHours()).slice(-2) +
		':' +
		('0' + value.getMinutes()).slice(-2) +
		':' +
		('0' + value.getSeconds()).slice(-2)
	)
}

const acceptOffer = async (offer: NoteShareInfo) => {
	await noteManager.acceptShare(offer)
}

const declineOffer = async (offer: NoteShareInfo) => {
	await noteManager.deleteShareOffer(offer)
}

const refreshShareOffers = () => {
	noteManager.loadShareOffers()
}
</script>
