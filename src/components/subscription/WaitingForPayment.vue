<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Payment in progress</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<div class="p-1 pt-2 mt-5 text-center max-w-[30rem]" data-testid="waiting-view">
		<div v-if="waitingForUser">
			<div>Waiting for payment to be completed in browser window</div>
			<div class="mt-2">
				If a new window did not open in your browser <a :href="link" target="_blank">click here</a>
			</div>
		</div>
		<div v-if="!waitingForUser">Waiting for payment to complete (this will happen automatically)</div>
		<div class="flex items-center justify-center my-6">
			<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon> {{ status }}
		</div>
		<div v-if="running" class="flex justify-center gap-2 mt-8">
			<!-- <button class="w-36" data-testid="waiting-report">Report Problem</button> -->
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
	invoiceId?: Guid
	waitingForUser: boolean
	link: string
	expectedMethodCount?: number
}>()

const emit = defineEmits(['close'])
const status = ref('Waiting...')
const running = ref(false)

let timerActive = false

const check = async () => {
	status.value = 'Checking...'
	if (props.invoiceId) {
		const inv = await noteManager.paymentClient.getInvoicePaymentStatus(props.invoiceId)
		if (inv.status === 'confirmed') {
			running.value = false
			status.value = 'Success'
			await new Promise(resolve => setTimeout(resolve, 1000))
			await noteManager.updateUserStats()
			emit('close')
			return
		} else if (inv.status !== 'pending') {
			running.value = false
			status.value = 'Failure'
			await new Promise(resolve => setTimeout(resolve, 1000))
			emit('close')
			return
		}
	} else if (props.expectedMethodCount) {
		const methods = await noteManager.paymentClient.getPaymentMethods()
		if (methods.length === props.expectedMethodCount) {
			running.value = false
			status.value = 'Success'
			await new Promise(resolve => setTimeout(resolve, 1000))
			await noteManager.updateUserStats()
			emit('close')
			return
		}
	}
	await new Promise(resolve => setTimeout(resolve, 250))
	if (running && props.invoiceId) {
		status.value = 'Waiting...'
		nextCheck()
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
	running.value = false
})

onMounted(async () => {
	status.value = 'Waiting...'
	running.value = true
	nextCheck()
})
</script>
