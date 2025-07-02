<template>
	<div
		class="flex flex-col items-center border shadow-sm rounded-xs"
		:class="{ 'w-48': compact }"
		:data-testid="`sub-${product.sku}`"
	>
		<div class="pt-2 text-center h-9">
			<div class="text-size-product">{{ product.name }}</div>
			<!-- <div v-if="product.current" class="relative top-[-8px] text-sm italic">(current)</div> -->
		</div>
		<div class="text-center h-10">
			<div v-if="product.data.period === Period.Month" :data-testid="`sub-${product.sku}-per-month`">
				{{ formatCurrency(product.price, currency) }}/md
			</div>
			<div
				v-if="product.data.period === Period.Month"
				class="italic text-size-secondary font-light"
				:data-testid="`sub-${product.sku}-per-year-derived`"
			>
				{{ formatCurrency(product.price * 12, currency) }}/year
			</div>
			<div v-if="product.data.period === Period.Year" :data-testid="`sub-${product.sku}-per-year`">
				{{ formatCurrency(product.price, currency) }}/year
			</div>
			<div
				v-if="product.data.period === Period.Year"
				:data-testid="`sub-${product.sku}-per-month-derived`"
				class="italic text-size-secondary font-light"
			>
				{{ formatCurrency(product.price / 12, currency) }}/month
			</div>
		</div>
		<hr v-if="showFeatures" class="w-[95%]" />
		<div v-if="showFeatures" class="py-4 pl-8 pr-4">
			<ul class="list-disc">
				<template v-for="feature of product.data.features" :key="feature.title">
					<li class="py-1 whitespace-nowrap">{{ feature.description }}</li>
				</template>
			</ul>
		</div>
		<div
			v-if="subscription?.renewalType === RenewalType.None && !ended"
			class="pt-2 flex-1 w-full flex flex-col items-center"
			data-testid="subscription-ends"
		>
			<hr class="w-[95%]" />
			<div class="text-bad py-2">Ends on:</div>
			<div class="text-bad pb-3" data-testid="subscription-end-date">
				{{ formatExpirationDate(subscription.paidUntil) }}
			</div>
		</div>
		<div
			v-if="subscription && ended"
			class="pt-2 flex-1 w-full flex flex-col items-center"
			data-testid="subscription-ends"
		>
			<hr class="w-[95%]" />
			<div class="py-2">Ended on:</div>
			<div class="pb-3" data-testid="subscription-end-date">
				{{ formatExpirationDate(subscription.paidUntil) }}
			</div>
		</div>
		<div
			v-if="subscription?.renewalType === RenewalType.Automatic && !overdue && showStatus"
			class="pt-2 flex-1 w-full flex flex-col items-center"
			data-testid="subscription-renews-automatically"
		>
			<hr class="w-[95%]" />
			<div class="text-good py-2">Renews automatically on:</div>
			<div class="text-good pb-3" data-testid="subscription-end-date">
				{{ formatExpirationDate(subscription.paidUntil) }}
			</div>
		</div>
		<div v-if="overdue" class="pt-2 flex-1 w-full flex flex-col items-center" data-testid="subscription-overdue">
			<hr class="w-[95%]" />
			<div class="text-bad py-2">Payment overdue!</div>
			<div class="pb-3"><button @click="payNow" data-testid="subscription-overdue-pay-now">Pay Now</button></div>
		</div>
		<div
			v-if="subscription?.renewalType === RenewalType.Manual"
			class="pt-2 flex-1 w-full flex flex-col items-center"
			data-testid="renews-manually"
		>
			<hr class="w-[95%]" />
			<div class="text-good py-2">Manually renew before:</div>
			<div class="text-good pb-3" data-testid="subscription-end-date">
				{{ formatExpirationDate(subscription.paidUntil) }}
			</div>
		</div>
		<div
			v-if="
				!overdue &&
				(showResume || showBuy || showChoose || showUpgrade || showChange || showChangeTo || showCancel || showCurrent)
			"
			class="flex-1 w-full flex flex-col items-center justify-end pb-2"
		>
			<hr class="w-[95%]" />
			<div class="pt-4 h-10 flex gap-2 items-center mb-2 px-2">
				<button
					v-if="showResume"
					:disabled="disabled"
					@click="emit('resume')"
					class="primary"
					:data-testid="`sub-${product.sku}-resume`"
				>
					Resume
				</button>
				<button
					v-if="showBuy"
					:disabled="disabled"
					@click="emit('buy', product.sku)"
					class="primary"
					:data-testid="`sub-${product.sku}-buy`"
				>
					Buy
				</button>
				<button
					v-if="showChoose"
					:disabled="disabled"
					@click="emit('choose', product.sku)"
					class="primary"
					:data-testid="`sub-${product.sku}-choose`"
				>
					Choose
				</button>
				<button
					v-if="showUpgrade"
					:disabled="disabled"
					@click="emit('change', product.sku)"
					class="primary"
					:data-testid="`sub-${product.sku}-upgrade`"
				>
					Upgrade
				</button>
				<button
					v-if="showChange"
					:disabled="disabled"
					@click="emit('change', product.sku)"
					class="primary"
					:data-testid="`sub-${product.sku}-change`"
				>
					Change
				</button>
				<button
					v-if="showChangeTo"
					:disabled="disabled"
					@click="emit('buy', product.sku)"
					class="primary"
					:data-testid="`sub-${product.sku}-change-to`"
				>
					Change to
				</button>
				<button
					v-if="showCancel"
					:disabled="disabled"
					@click="emit('cancel')"
					class="primary"
					:data-testid="`sub-${product.sku}-cancel`"
				>
					Cancel
				</button>
				<div v-if="showCurrent">Current</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { currentTime, formatCurrency, formatExpirationDate } from '../../services/helpers'
import {
	Currency,
	Period,
	RenewalType,
	type Subscription,
	type SubscriptionProduct,
} from '../../services/types/subscription'
import { isAfter } from 'date-fns'
import { noteManager } from '../../global'

const props = defineProps<{
	product: SubscriptionProduct
	subscription?: Subscription
	showBuy?: boolean
	showChoose?: boolean
	showFeatures?: boolean
	showResume?: boolean
	showUpgrade?: boolean
	showCancel?: boolean
	showChange?: boolean
	showChangeTo?: boolean
	showCurrent?: boolean
	compact?: boolean
	showStatus?: boolean
	currency?: Currency
	disabled?: boolean
}>()

const emit = defineEmits(['buy', 'choose', 'change', 'cancel', 'resume', 'pay-invoice'])

const now = ref<Date>(currentTime())
const overdue = computed(
	() =>
		isAfter(now.value, props.subscription?.paidUntil ?? now.value) &&
		props.subscription?.renewalType !== RenewalType.None,
)
const ended = computed(
	() =>
		isAfter(now.value, props.subscription?.paidUntil ?? now.value) &&
		props.subscription?.renewalType === RenewalType.None,
)

const payNow = async () => {
	const invoices = await noteManager.payment.getOpenInvoices()
	const overdue = invoices.filter(inv => inv.due && isAfter(now.value, inv.due))
	if (overdue.length > 0) {
		const invoiceId = overdue[0].id
		emit('pay-invoice', overdue[0])
	}
}
</script>
