<template>
	<SubHome v-if="subscriptionStage === 'subscription'" ref="subHome" @change="change" @pay-invoice="payInvoice" />
	<NewSubscriptionView v-if="subscriptionStage === 'new'" @choose="chooseNewPlan" />
	<PayInvoice v-if="subscriptionStage === 'pay-invoice'" :invoice="activeInvoice" @pay-in-progress="payInProgress" />
	<UpgradeView
		v-if="subscriptionStage === 'upgrade'"
		:product="subscriptionNewProduct"
		:currency="subscriptionCurrency"
		@pay-in-progress="payInProgress"
		@change-plan="change"
	/>
	<WaitingForPayment
		v-if="subscriptionStage === 'pay-in-progress'"
		:invoice-id="invoiceId"
		@close="closeWaiting"
		:waiting-for-user="waitingForUser"
		:link="payLink"
	/>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SubHome from './SubHome.vue'
import { Currency, type Invoice, type SubscriptionProduct } from '../../services/types/subscription'
import type { Guid } from '../../services/types/guid'
import NewSubscriptionView from './NewSubscriptionView.vue'
import UpgradeView from './UpgradeView.vue'
import WaitingForPayment from './WaitingForPayment.vue'
import { noteManager, subscriptionStage, subscriptionNewProduct, subscriptionCurrency } from '../../global'
import PayInvoice from './PayInvoice.vue'

const invoiceId = ref<Guid>()
const waitingForUser = ref<boolean>(false)
const activeInvoice = ref<Invoice>()
const payLink = ref('')
const subHome = ref()

onMounted(() => {
	noteManager.tree.registerActionListener({
		select: (id: Guid) => {
			if (id === 'settings-plan' || id === 'settings-plan-group') {
				subscriptionStage.value = 'subscription'
			}
		},
	})
})

const change = () => {
	subscriptionStage.value = 'new'
}

const closeWaiting = () => {
	subscriptionStage.value = 'subscription'
	setTimeout(() => {
		subHome.value?.populate()
	}, 250)
}

const chooseNewPlan = async (product: SubscriptionProduct, cur: Currency) => {
	subscriptionNewProduct.value = product
	subscriptionCurrency.value = cur
	subscriptionStage.value = 'upgrade'
}

const payInProgress = async (id: Guid, waiting: boolean, link: string) => {
	subscriptionStage.value = 'pay-in-progress'
	invoiceId.value = id
	waitingForUser.value = waiting
	payLink.value = link
}

const payInvoice = async (invoice: Invoice) => {
	activeInvoice.value = invoice
	subscriptionStage.value = 'pay-invoice'
}
</script>
