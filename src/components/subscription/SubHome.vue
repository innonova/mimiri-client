<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Current Plan</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<div class="p-1 pt-2 flex">
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
		></SubscriptionItem>
	</div>
</template>

<script setup lang="ts">
import { noteManager } from '../../global'
import { type Subscription, type SubscriptionProduct, Currency } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import { onMounted, ref } from 'vue'

const product = ref<SubscriptionProduct>()
const subscription = ref<Subscription>()

const emit = defineEmits(['change'])

onMounted(async () => {
	await populate()
})

const populate = async () => {
	product.value = await noteManager.paymentClient.getCurrentSubscriptionProduct()
	subscription.value = await noteManager.paymentClient.getCurrentSubscription()
}

const change = async () => {
	emit('change')
	// showNewPlanView.value = true
	// await router.push('/new-subscription')
}

const cancel = async () => {
	await noteManager.paymentClient.cancelSubscription()
	await populate()
}

const resume = async () => {
	await noteManager.paymentClient.resumeSubscription()
	await populate()
}
</script>
