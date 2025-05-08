<template>
	<PaymentMethods v-if="selectedId === 'methods'" @pay-in-progress="payInProgress"></PaymentMethods>
	<WaitingForPayment
		v-if="selectedId === 'pay-in-progress'"
		@close="closeWaiting"
		:waiting-for-user="waitingForUser"
		:expected-method-count="expectedMethodCount"
		:link="payLink"
	></WaitingForPayment>
</template>

<script setup lang="ts">
import type { Guid } from '../../services/types/guid'
import { noteManager } from '../../global'
import WaitingForPayment from './WaitingForPayment.vue'
import { onMounted, ref } from 'vue'
import PaymentMethods from './PaymentMethods.vue'

let pageAfterPay = 'methods'
const selectedId = ref('methods')
const waitingForUser = ref<boolean>(false)
const payLink = ref('')
const expectedMethodCount = ref(0)

onMounted(() => {
	noteManager.registerActionListener({
		select: (id: Guid) => {
			if (id === 'settings-payment-methods') {
				selectedId.value = 'methods'
			}
		},
	})
})

const closeWaiting = () => {
	selectedId.value = pageAfterPay
}

const payInProgress = async (id: Guid, waiting: boolean, link: string, expectedCount: number) => {
	selectedId.value = 'pay-in-progress'
	waitingForUser.value = waiting
	payLink.value = link
	expectedMethodCount.value = expectedCount
}
</script>
