<template>
	<div v-if="ready" class="flex flex-col h-full">
		<TabBar :items="[$t('subNewSubscriptionView.tab')]" />
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
					{{ $t('subNewSubscriptionView.promoCopy') }}
				</div>
				<Faq :items="faqItems" class="mt-6" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Currency, Period, type Subscription, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import { noteManager, $t } from '../../global'
import Slider from '../elements/Slider.vue'
import TabBar from '../elements/TabBar.vue'
import Faq from '../elements/Faq.vue'

let currentLoaded = false
const currentProduct = ref<SubscriptionProduct>()
const currentSubscription = ref<Subscription>()
const period = ref(Period.Month)
const products = ref<SubscriptionProduct[]>([])
const currency = ref(Currency.CHF)
const ready = ref(false)
const periodOptions = computed(() => [
	{ value: Period.Month, label: $t('subNewSubscriptionView.monthly') },
	{ value: Period.Year, label: $t('subNewSubscriptionView.yearly') },
])

const currencyOptions = [
	{ value: Currency.CHF, label: 'CHF' },
	{ value: Currency.EUR, label: 'EUR' },
	{ value: Currency.USD, label: 'USD' },
]

const faqItems = ref([
	{
		question: $t('subNewSubscriptionView.faq1Question'),
		answer: $t('subNewSubscriptionView.faq1Answer'),
	},
	{
		question: $t('subNewSubscriptionView.faq2Question'),
		answer: $t('subNewSubscriptionView.faq2Answer'),
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
