<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Current Plan</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="p-1 pt-2 flex" :data-testid="populated ? 'home-view' : ''">
		<SubscriptionItem
			v-if="product"
			:product="product"
			:subscription="subscription"
			:showFeatures="true"
			:showResume="subscription?.renewalType === 'none'"
			:showUpgrade="product.sku === 'free' && subscription?.renewalType !== 'none'"
			:showChange="product.sku !== 'free' && subscription?.renewalType !== 'none'"
			:showCancel="product.sku !== 'free' && subscription?.renewalType !== 'none'"
			:currency="subscription?.renewalCurrency"
			:showStatus="true"
			@change="change"
			@cancel="cancel"
			@resume="resume"
			@pay-invoice="payInvoice"
		></SubscriptionItem>
		<input type="hidden" data-testid="current-subscription-sku" :value="product?.sku" />
		<input type="hidden" data-testid="current-subscription-paid-until" :value="subscription?.paidUntil" />
	</div>
</template>

<script setup lang="ts">
import { noteManager } from '../../global'
import { type Invoice, type Subscription, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import { onMounted, ref } from 'vue'

const product = ref<SubscriptionProduct>()
const subscription = ref<Subscription>()
const populated = ref(false)

const emit = defineEmits(['change', 'pay-invoice'])

onMounted(async () => {
	await populate()
})

const populate = async () => {
	populated.value = false
	product.value = await noteManager.paymentClient.getCurrentSubscriptionProduct()
	subscription.value = await noteManager.paymentClient.getCurrentSubscription()
	populated.value = true
}

const change = async () => {
	emit('change')
}

const cancel = async () => {
	await noteManager.paymentClient.cancelSubscription()
	await populate()
}

const resume = async () => {
	await noteManager.paymentClient.resumeSubscription()
	await populate()
}

const payInvoice = (invoice: Invoice) => {
	emit('pay-invoice', invoice)
}

defineExpose({
	populate,
})
</script>
