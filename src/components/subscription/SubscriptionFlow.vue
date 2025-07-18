<template>
	<SubHome v-if="selectedId === 'subscription'" ref="subHome" @change="change" @pay-invoice="payInvoice" />
	<NewSubscriptionView v-if="selectedId === 'new'" @choose="chooseNewPlan" />
	<PayInvoice v-if="selectedId === 'pay-invoice'" :invoice="activeInvoice" @pay-in-progress="payInProgress" />
	<UpgradeView
		v-if="selectedId === 'upgrade'"
		:product="newProduct"
		:currency="currency"
		@pay-in-progress="payInProgress"
		@change-plan="change"
	/>
	<WaitingForPayment
		v-if="selectedId === 'pay-in-progress'"
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
	import { noteManager } from '../../global'
	import PayInvoice from './PayInvoice.vue'

	const selectedId = ref('subscription')
	const newProduct = ref<SubscriptionProduct>()
	const currency = ref<Currency>(Currency.CHF)
	const invoiceId = ref<Guid>()
	const waitingForUser = ref<boolean>(false)
	const activeInvoice = ref<Invoice>()
	const payLink = ref('')
	const subHome = ref()

	onMounted(() => {
		noteManager.tree.registerActionListener({
			select: (id: Guid) => {
				if (id === 'settings-plan' || id === 'settings-plan-group') {
					selectedId.value = 'subscription'
				}
			},
		})
	})

	const change = () => {
		selectedId.value = 'new'
	}

	const closeWaiting = () => {
		selectedId.value = 'subscription'
		setTimeout(() => {
			subHome.value?.populate()
		}, 250)
	}

	const chooseNewPlan = async (product: SubscriptionProduct, cur: Currency) => {
		newProduct.value = product
		currency.value = cur
		selectedId.value = 'upgrade'
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
	}
</script>
