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
		<span data-testid="sync-status" :class="{ 'pl-7': noteManager.state.isMobile }">{{ status }}</span>
	</button>
	<input type="hidden" data-testid="sync-status-code" :value="syncStatus" />
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { noteManager, syncErrorDialog, syncStatus, $t } from '../../global'

const status = ref('')
const error = ref(false)

const calculateStatus = () => {
	let result = ''
	error.value = false
	if (!noteManager.state.isOnline) {
		result = $t('statusBar.offline')
	}
	if (!noteManager.state.isLoggedIn) {
		result = $t('statusBar.notLoggedIn')
	}
	if (syncStatus.value === 'retrieving-changes') {
		result = $t('statusBar.synchronizing')
	}
	if (syncStatus.value === 'sending-changes') {
		result = $t('statusBar.synchronizing')
	}
	if (syncStatus.value === 'synchronization-error') {
		error.value = true
		result = $t('statusBar.syncError')
	}
	if (syncStatus.value === 'count-limit-exceeded') {
		error.value = true
		result = $t('statusBar.syncErrorLimitExceeded')
	}
	if (syncStatus.value === 'total-size-limit-exceeded') {
		error.value = true
		result = $t('statusBar.syncErrorLimitExceeded')
	}
	if (syncStatus.value === 'note-size-limit-exceeded') {
		error.value = true
		result = $t('statusBar.syncErrorNoteSize')
	}
	if (syncStatus.value === 'server-rejection') {
		error.value = true
		result = $t('statusBar.syncErrorServerRejection')
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
