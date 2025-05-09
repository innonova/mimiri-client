<template>
	<ItemHeader>Summary</ItemHeader>
	<div class="mb-0.5">Items</div>
	<template v-for="item of items" :key="item.sku">
		<div class="flex flex-row justify-between border-t border-b py-3">
			<div>Subscription - {{ item.text }} - ({{ item.sku }})</div>
			<div class="text-right">{{ formatCurrency(item.price, currency) }}</div>
		</div>
	</template>
	<div class="my-5">
		<div class="flex justify-between">
			<div>Total amount to be paid now:</div>
			<div data-testid="upgrade-total" class="font-bold">
				{{ formatCurrency(total, currency) }}
			</div>
		</div>
		<div v-if="vatRate(countryCode) > 0" class="flex justify-between mt-1">
			<div>Of this VAT:</div>
			<div data-testid="upgrade-vat">
				{{ formatCurrency(calculateReverseVat(total, vatRate(countryCode)), currency) }}
			</div>
		</div>
		<div class="flex justify-between mt-1">
			<div>Currency:</div>
			<div data-testid="upgrade-currency">{{ currency }}</div>
		</div>
	</div>
	<div class="mb-5">
		<label class="flex items-center gap-2 justify-end">
			I have read and accept the
			<a href="https://mimiri.io/terms" target="_blank">Terms & Conditions</a
			><input
				v-model="termsAccepted"
				name="accept-terms"
				:disabled="disabled"
				class="mt-1"
				type="checkbox"
				data-testid="accept-terms"
		/></label>
		<label class="flex items-center mt-1.5 gap-2 justify-end"
			>I have read and accept the <a href="https://mimiri.io/privacy" target="_blank">Privacy Policy</a
			><input
				v-model="privacyAccepted"
				name="accept-privacy"
				:disabled="disabled"
				class="mt-1"
				type="checkbox"
				data-testid="accept-privacy"
		/></label>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Currency, SummaryItem } from '../../services/types/subscription'
import ItemHeader from './ItemHeader.vue'
import { calculateReverseVat, formatCurrency, vatRate } from '../../services/helpers'

const props = defineProps<{
	items: SummaryItem[]
	currency: Currency
	countryCode: string
	disabled?: boolean
}>()

const termsAccepted = defineModel('terms')
const privacyAccepted = defineModel('privacy')

const total = computed(() => props.items.map(item => item.price * item.quantity).reduce((p, n) => p + n, 0))
</script>
