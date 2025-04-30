<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Payment in progress</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<div class="p-1 pt-2 m-auto text-left" data-testid="waiting-view">
		<div v-if="waitingForUser">Waiting for payment to be completed in browser window</div>
		<div v-if="!waitingForUser">Waiting for payment to complete (this will happen automatically)</div>
		<div class="flex items-center justify-center my-6">
			<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon> {{ status }}
		</div>
		<div class="flex justify-between mt-8">
			<button class="w-36" data-testid="waiting-report">Report Problem</button>
			<button @click="check" data-testid="waiting-check">Check</button>
			<button @click="emit('close')" data-testid="waiting-cancel">Cancel</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { noteManager } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
import type { Guid } from '../../services/types/guid'

const props = defineProps<{
	invoiceId: Guid
	waitingForUser: boolean
}>()

const emit = defineEmits(['close'])
const status = ref('Waiting...')

let running = false
let timerActive = false

const check = async () => {
	if (props.invoiceId) {
		status.value = 'Checking...'
		const inv = await noteManager.paymentClient.getInvoice(props.invoiceId)
		if (inv.status === 'paid') {
			running = false
			status.value = 'Success'
			await new Promise(resolve => setTimeout(resolve, 1000))
			await noteManager.updateUserStats()
			emit('close')
			return
		}
		await new Promise(resolve => setTimeout(resolve, 250))
		if (running) {
			status.value = 'Waiting...'
			nextCheck()
		}
	}
}

const nextCheck = () => {
	if (!timerActive) {
		timerActive = true
		setTimeout(() => {
			timerActive = false
			check()
		}, 1000)
	}
}

onUnmounted(() => {
	running = false
})

onMounted(async () => {
	status.value = 'Waiting...'
	running = true
	nextCheck()
})
</script>
