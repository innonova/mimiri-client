<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Current Plan']" />
		<div v-if="ready" class="flex flex-col overflow-y-auto">
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
				/>
				<input type="hidden" data-testid="current-subscription-sku" :value="product?.sku" />
				<input type="hidden" data-testid="current-subscription-paid-until" :value="subscription?.paidUntil" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { noteManager } from '../../global'
import { type Invoice, type Subscription, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import { onMounted, ref } from 'vue'
import TabBar from '../elements/TabBar.vue'

const ready = ref(false)
const product = ref<SubscriptionProduct>()
const subscription = ref<Subscription>()
const populated = ref(false)

const emit = defineEmits(['change', 'pay-invoice'])

onMounted(async () => {
	await populate()
})

const populate = async () => {
	populated.value = false
	product.value = await noteManager.payment.getCurrentSubscriptionProduct()
	subscription.value = await noteManager.payment.getCurrentSubscription()
	populated.value = true
	if (product.value.sku === 'free') {
		emit('change')
	} else {
		ready.value = true
	}
}

const change = async () => {
	emit('change')
}

const cancel = async () => {
	await noteManager.payment.cancelSubscription()
	await populate()
}

const resume = async () => {
	await noteManager.payment.resumeSubscription()
	await populate()
}

const payInvoice = (invoice: Invoice) => {
	emit('pay-invoice', invoice)
}

defineExpose({
	populate,
})
</script>
