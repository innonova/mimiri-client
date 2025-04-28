<template>
	<div v-if="showSubscriptions" class="flex flex-col h-full">
		<div
			class="flex items-center bg-title-bar select-none drag"
			:class="{
				'h-[36px]': mimiriPlatform.isPc,
				'h-14': !mimiriPlatform.isPc,
			}"
		>
			<img
				v-if="mimiriPlatform.isPc && !mimiriPlatform.isMac"
				class="ml-1.5 mr-1 mt-px p-1 min-w-7 w-7 h-7"
				src="/img/logo.png"
			/>
			<div ref="titleBar" class="pl-2 text-size-title w-full h-full flex items-center">Mimiri Plan</div>
			<button class="cursor-default w-7 h-7 outline-none m-1" @click="close">X</button>
		</div>

		<div class="flex flex-col overflow-hidden md:flex-row pt-5">
			<div class="md:mr-10 select-none max-md:w-full flex flex-col max-md:,b-5">
				<template v-for="item of menuItems" :key="item.title">
					<div
						class="p-2 max-md:w-full max-md:text-center md:pl-5 md:pr-20"
						:class="{
							'bg-info cursor-default': item.id === selectedId,
							'cursor-pointer': item.id !== selectedId,
						}"
						@click="menuClick(item.id)"
					>
						{{ item.title }}
					</div>
				</template>
			</div>
			<div class="flex flex-col gap-16 min-w-[500px] overflow-y-hidden">
				<div class="mt-5 overflow-y-hidden">
					<div v-if="selectedId === 'subscription'">
						<SubHome @change="change"></SubHome>
					</div>
					<div v-if="selectedId === 'account'" class="h-full">
						<Account></Account>
					</div>
					<div v-if="selectedId === 'methods'" class="h-full">
						<PaymentMethods></PaymentMethods>
					</div>
					<div v-if="selectedId === 'invoices'" class="h-full">
						<Invoices></Invoices>
					</div>
					<div v-if="selectedId === 'new'" class="h-full">
						<NewSubscriptionView @choose="chooseNewPlan"></NewSubscriptionView>
					</div>
					<div v-if="selectedId === 'upgrade'" class="h-full">
						<UpgradeView :product="newProduct" :currency="currency" @pay-in-progress="payInProgress"></UpgradeView>
					</div>
					<div v-if="selectedId === 'pay-in-progress'" class="h-full">
						<WaitingForPayment
							:invoice-id="invoiceId"
							@close="closeWaiting"
							:waiting-for-user="waitingForUser"
						></WaitingForPayment>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, noteManager, showSubscriptions } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'
import SubHome from './subscription/SubHome.vue'
import Account from './subscription/Account.vue'
import PaymentMethods from './subscription/PaymentMethods.vue'
import Invoices from './subscription/Invoices.vue'
import UpgradeView from './subscription/UpgradeView.vue'
import NewSubscriptionView from './subscription/NewSubscriptionView.vue'
import { Currency, type SubscriptionProduct } from '../services/types/subscription'
import WaitingForPayment from './subscription/WaitingForPayment.vue'
import type { Guid } from '../services/types/guid'

const selectedId = ref('subscription')
const newProduct = ref<SubscriptionProduct>()
const currency = ref<Currency>(Currency.CHF)
const invoiceId = ref<Guid>()
const waitingForUser = ref<boolean>(false)

const change = () => {
	selectedId.value = 'new'
}

const closeWaiting = () => {
	selectedId.value = 'subscription'
}

const chooseNewPlan = async (product: SubscriptionProduct, currency: Currency) => {
	newProduct.value = product
	currency = currency
	selectedId.value = 'upgrade'
}

const payInProgress = async (id: Guid, waiting: boolean) => {
	selectedId.value = 'pay-in-progress'
	invoiceId.value = id
	waitingForUser.value = waiting
}

const menuItems = [
	{ id: 'subscription', title: 'Current Plan' },
	{ id: 'account', title: 'Account' },
	{ id: 'methods', title: 'Payment Methods' },
	{ id: 'invoices', title: 'Invoices' },
]

const menuClick = (id: string) => {
	selectedId.value = id
}

const close = () => {
	showSubscriptions.value = false
}

const show = () => {
	if (noteManager.featureEnabled('subscription')) {
		selectedId.value = 'subscription'
		showSubscriptions.value = true
	}
}

defineExpose({
	show,
})
</script>
