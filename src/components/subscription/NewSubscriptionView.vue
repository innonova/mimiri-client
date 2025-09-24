<template>
	<div v-if="ready" class="flex flex-col h-full">
		<TabBar :items="['Current Plan']" />
		<div class="flex flex-col items-start overflow-auto">
			<div data-testid="new-subscription-view" class="flex flex-col items-center">
				<div class="pb-4 pt-4 compact:pt-2 cursor-default flex gap-5 justify-center items-center">
					<Slider v-model="period" :options="periodOptions" />
					<Slider v-model="currency" :options="currencyOptions" />
				</div>
				<div class="flex gap-1 compact:gap-0 compact:ml-[-5px] compact:mt-[-5px]">
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
					<input type="hidden" data-testid="subscriptions-loaded" :value="!!products?.length" />
				</div>
				<div class="text-center text-size-promo mt-5">
					The free tier isn’t a trial - it’s built to be fully usable and will always be here. <br />
					But it’s our subscribers who make it possible for Mimiri Notes to keep moving forward for everyone.
				</div>
				<Faq :items="faqItems" class="mt-6" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Currency, Period, type Subscription, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import { noteManager } from '../../global'
import Slider from '../elements/Slider.vue'
import TabBar from '../elements/TabBar.vue'
import Faq from '../elements/Faq.vue'

let currentLoaded = false
const currentProduct = ref<SubscriptionProduct>()
const currentSubscription = ref<Subscription>()
const period = ref(Period.Year)
const products = ref<SubscriptionProduct[]>([])
const currency = ref(Currency.CHF)
const ready = ref(false)
const periodOptions = [
	{ value: Period.Month, label: 'Monthly' },
	{ value: Period.Year, label: 'Yearly' },
]

const currencyOptions = [
	{ value: Currency.CHF, label: 'CHF' },
	{ value: Currency.EUR, label: 'EUR' },
	{ value: Currency.USD, label: 'USD' },
]

const faqItems = ref([
	{
		question: 'Is the free tier really free?',
		answer: `Yes, the free tier is free and will remain so.
		For most use cases, the limits are more than adequate.`,
	},
	{
		question: 'Why would I choose a paid plan?',
		answer: `The main reason to subscribe is to support the ongoing development of Mimiri Notes.`,
	},
])

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
	ready.value = true
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
