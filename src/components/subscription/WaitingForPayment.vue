<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">{{ $t('subWaitingForPayment.tab') }}</div>
	</div>
	<div class="bg-info w-full h-2 mb-2" />
	<div class="p-1 pt-2 mt-5 text-center max-w-110" data-testid="waiting-view">
		<div v-if="waitingForUser">
			<div>{{ $t('subWaitingForPayment.waitingBrowser') }}</div>
			<div class="mt-2">
				{{ $t('subWaitingForPayment.noWindowOpened') }}
				<a :href="link" target="_blank">{{ $t('subWaitingForPayment.clickHere') }}</a>
			</div>
		</div>
		<div v-if="!waitingForUser">{{ $t('subWaitingForPayment.waitingAutomatic') }}</div>
		<div class="flex items-center justify-center my-6">
			<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block" /> {{ status }}
		</div>
		<div v-if="running" class="flex justify-center gap-2 mt-8">
			<button class="primary" @click="check" data-testid="waiting-check">{{ $t('subWaitingForPayment.check') }}</button>
			<button class="primary" @click="emit('close')" data-testid="waiting-cancel">
				{{ $t('subWaitingForPayment.cancel') }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { noteManager, $t } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
import type { Guid } from '../../services/types/guid'

const props = defineProps<{
	invoiceId?: Guid
	waitingForUser: boolean
	link: string
	expectedMethodCount?: number
}>()

const emit = defineEmits(['close'])
const status = ref($t('subWaitingForPayment.waiting'))
const running = ref(false)

let timerActive = false

const check = async () => {
	status.value = $t('subWaitingForPayment.checking')
	if (props.invoiceId) {
		const inv = await noteManager.payment.getInvoicePaymentStatus(props.invoiceId)
		if (inv.status === 'confirmed') {
			running.value = false
			status.value = $t('subWaitingForPayment.success')
			await new Promise(resolve => setTimeout(resolve, 1000))
			await noteManager.session.updateUserStats()
			emit('close')
			return
		} else if (inv.status !== 'pending') {
			running.value = false
			status.value = $t('subWaitingForPayment.failure')
			await new Promise(resolve => setTimeout(resolve, 1000))
			emit('close')
			return
		}
	} else if (props.expectedMethodCount) {
		const methods = await noteManager.payment.getPaymentMethods()
		if (methods.length === props.expectedMethodCount) {
			running.value = false
			status.value = $t('subWaitingForPayment.success')
			await new Promise(resolve => setTimeout(resolve, 1000))
			await noteManager.session.updateUserStats()
			emit('close')
			return
		}
	}
	await new Promise(resolve => setTimeout(resolve, 250))
	if (running.value && props.invoiceId) {
		status.value = 'Waiting...'
		nextCheck()
	}
}

const nextCheck = () => {
	if (!timerActive) {
		timerActive = true
		setTimeout(() => {
			timerActive = false
			void check()
		}, 1000)
	}
}

onUnmounted(() => {
	running.value = false
})

onMounted(async () => {
	status.value = $t('subWaitingForPayment.waiting')
	running.value = true
	nextCheck()
})
</script>
