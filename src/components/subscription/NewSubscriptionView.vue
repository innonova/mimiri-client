<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Choose new plan</div>
	</div>
	<div class="bg-info w-full h-2 mb-4" />
	<div data-testid="new-subscription-view">
		<div class="pb-4 cursor-default flex gap-5 justify-start items-center">
			<PeriodSelector v-model="period" />
			<div class="inline-block" />
			<CurrencySelector v-model="currency" />
		</div>
		<div class="flex gap-1">
			<SubscriptionItem
				v-if="currentProduct && !products.find(p => p.id === currentProduct?.id)"
				:product="currentProduct"
				:subscription="currentSubscription"
				:show-features="true"
				:showCurrent="true"
			/>
			<template v-for="product of products" :key="product.sku">
				<SubscriptionItem
					:product="product"
					:subscription="product.id === currentProduct?.id ? currentSubscription : undefined"
					:showBuy="!currentProduct"
					:showChangeTo="!!currentProduct && product.id !== currentProduct?.id"
					:showCurrent="product.id === currentProduct?.id"
					:show-features="true"
					:currency="currency"
					@buy="buy"
				/>
			</template>
			<input type="hidden" data-testid="subscriptions-loaded" :value="!!products?.length">
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Currency, Period, type Subscription, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import CurrencySelector from './CurrencySelector.vue'
import PeriodSelector from './PeriodSelector.vue'
import { noteManager } from '../../global'

let currentLoaded = false
const currentProduct = ref<SubscriptionProduct>()
const currentSubscription = ref<Subscription>()
const period = ref(Period.Year)
const products = ref<SubscriptionProduct[]>([])
const currency = ref(Currency.CHF)

const emit = defineEmits(['choose'])

const populate = async () => {
	if (!currentLoaded) {
		currentProduct.value = await noteManager.payment.getCurrentSubscriptionProduct()
		currentSubscription.value = await noteManager.payment.getCurrentSubscription()
		currentLoaded = true
		if (currentSubscription.value) {
			period.value = currentSubscription.value.period
		}
	}
	products.value = (await noteManager.payment.getSubscriptionProducts()).filter(
		prod => prod.data.period === period.value,
	)
}

onMounted(async () => {
	currentLoaded = false
	await populate()
})

watch(period, async () => {
	await populate()
})

const buy = (sku: string) => {
	emit(
		'choose',
		products.value.find(p => p.sku === sku),
		currency.value,
	)
}
</script>
