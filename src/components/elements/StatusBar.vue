<template>
	<button
		v-if="status"
		@click="showDetails"
		class="bg-toolbar pt-0.5 pb-2 pl-2 text-left cursor-pointer"
		:class="{
			'text-error font-semibold': error,
		}"
		data-testid="status-bar"
	>
		<span data-testid="sync-status">{{ status }}</span>
	</button>
	<input type="hidden" data-testid="sync-status-code" :value="syncStatus" />
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { noteManager, syncErrorDialog, syncStatus } from '../../global'

const status = ref('')
const error = ref(false)

const calculateStatus = () => {
	console.log('SynchronizationService.calculateStatus() - syncStatus:', syncStatus.value)

	let result = ''
	error.value = false
	if (!noteManager.state.isOnline) {
		result = 'Offline'
	}
	if (!noteManager.state.isLoggedIn) {
		result = 'Not logged in'
	}
	if (syncStatus.value === 'retrieving-changes') {
		result = 'Synchronizing...'
	}
	if (syncStatus.value === 'sending-changes') {
		result = 'Synchronizing...'
	}
	if (syncStatus.value === 'count-limit-exceeded') {
		error.value = true
		result = 'Sync Error: Limit exceeded (see details)'
	}
	if (syncStatus.value === 'total-size-limit-exceeded') {
		error.value = true
		result = 'Sync Error: Limit exceeded (see details)'
	}
	if (syncStatus.value === 'note-size-limit-exceeded') {
		error.value = true
		result = 'Sync Error: Note size exceeded (see details)'
	}

	return result
}

const showDetails = () => {
	if (error.value) {
		syncErrorDialog.value?.show()
	}
}

watch(
	[noteManager.state, syncStatus],
	() => {
		const value = calculateStatus()
		if (value === '') {
			setTimeout(() => {
				status.value = calculateStatus()
			}, 500)
		} else {
			status.value = value
		}
	},
	{ immediate: true },
)
</script>
