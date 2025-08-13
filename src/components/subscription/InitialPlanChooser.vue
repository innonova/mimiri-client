<template>
	<div
		class="absolute left-0 top-0 w-full h-full flex items-center justify-center bg-dialog-backdrop"
		data-testid="initial-plan-chooser"
	>
		<div class="bg-back p-10 mx-4 flex flex-col overflow-auto">
			<div class="pb-4 cursor-default flex gap-5 justify-center items-center">
				<PeriodSelector v-model="period" />
				<div class="inline-block" />
				<CurrencySelector v-model="currency" />
			</div>
			<div class="flex gap-1">
				<template v-for="product of products" :key="product.sku">
					<SubscriptionItem
						:product="product"
						:show-choose="true"
						:show-features="true"
						:currency="currency"
						@choose="choose"
					/>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Currency, Period, type SubscriptionProduct } from '../../services/types/subscription'
import SubscriptionItem from './SubscriptionItem.vue'
import CurrencySelector from './CurrencySelector.vue'
import PeriodSelector from './PeriodSelector.vue'
import { noteManager, subscriptionCurrency, subscriptionNewProduct, subscriptionStage } from '../../global'
import type { Guid } from '../../services/types/guid'

const period = ref(Period.Year)
const products = ref<SubscriptionProduct[]>([])
const currency = ref(Currency.CHF)

const populate = async () => {
	products.value = (await noteManager.payment.getSubscriptionProducts()).filter(
		prod => prod.data.period === period.value || prod.sku === 'free',
	)
}

onMounted(async () => {
	if (noteManager.state.isMobile) {
		await noteManager.auth.clearNeedsToChooseTier()
	} else {
		await populate()
	}
})

watch(period, async () => {
	await populate()
})

const choose = async (sku: string) => {
	await noteManager.auth.clearNeedsToChooseTier()
	if (sku === 'free') {
		noteManager.tree.openNote('settings-plan' as Guid)
	} else {
		noteManager.tree.openNote('settings-plan' as Guid)
		setTimeout(() => {
			subscriptionNewProduct.value = products.value.find(p => p.sku === sku)
			subscriptionCurrency.value = currency.value
			subscriptionStage.value = 'upgrade'
		})
	}
}
</script>
