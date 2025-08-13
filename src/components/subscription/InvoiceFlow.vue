<template>
	<Invoices v-if="selectedId === 'invoices'" @pay-invoice="payInvoice" />
	<PayInvoice v-if="selectedId === 'pay-invoice'" :invoice="activeInvoice" @pay-in-progress="payInProgress" />
	<WaitingForPayment
		v-if="selectedId === 'pay-in-progress'"
		:invoice-id="invoiceId"
		@close="closeWaiting"
		:waiting-for-user="waitingForUser"
		:link="payLink"
	/>
</template>

<script setup lang="ts">
import { type Invoice } from '../../services/types/subscription'
import type { Guid } from '../../services/types/guid'
import { noteManager } from '../../global'
import Invoices from './Invoices.vue'
import PayInvoice from './PayInvoice.vue'
import WaitingForPayment from './WaitingForPayment.vue'
import { onMounted, ref } from 'vue'

let pageAfterPay = 'invoices'
const selectedId = ref('invoices')
const invoiceId = ref<Guid>()
const waitingForUser = ref<boolean>(false)
const activeInvoice = ref<Invoice>()
const payLink = ref('')

onMounted(() => {
	noteManager.tree.registerActionListener({
		select: (id: Guid) => {
			if (id === 'settings-invoices') {
				selectedId.value = 'invoices'
			}
		},
	})
})

const closeWaiting = () => {
	selectedId.value = pageAfterPay
}
const payInProgress = async (id: Guid, waiting: boolean, link: string) => {
	selectedId.value = 'pay-in-progress'
	invoiceId.value = id
	waitingForUser.value = waiting
	payLink.value = link
}

const payInvoice = async (invoice: Invoice) => {
	activeInvoice.value = invoice
	selectedId.value = 'pay-invoice'
	pageAfterPay = 'invoices'
}
</script>
