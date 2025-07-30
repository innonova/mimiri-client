<template>
	<div class="bg-toolbar pt-0.5 pb-1.5 pl-2">
		<span data-testid="sync-status">{{ status }}&nbsp;</span>
	</div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { noteManager, syncStatus } from '../../global'

const status = ref('')

const calculateStatus = () => {
	let result = ''
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
	return result
}

watch([noteManager.state, syncStatus], () => {
	const value = calculateStatus()
	if (value === '') {
		setTimeout(() => {
			status.value = calculateStatus()
		}, 500)
	} else {
		status.value = value
	}
})
</script>
