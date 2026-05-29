<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">{{ $t('subUpgradeView.tab') }}</div>
		</div>
		<div class="bg-info w-full h-2 mb-4" />
		<div class="flex flex-col overflow-y-auto pr-2" data-testid="upgrade-view">
			<form @submit.prevent="submit" class="max-w-110 relative">
				<ItemHeader>{{ $t('subUpgradeView.chosenPlan') }}</ItemHeader>
				<div class="grid grid-cols-[9em_18em] gap-x-3 gap-y-1 pb-5">
					<div class="text-right">{{ $t('subUpgradeView.plan') }}</div>
					<div>Mimiri Tier 1</div>
					<div class="text-right">{{ $t('subUpgradeView.monthly') }}</div>
					<div v-if="isMonthly">
						{{ formatCurrency(monthlyPrice, currency) }}
					</div>
					<div v-else class="text-size-secondary italic">({{ formatCurrency(monthlyPrice, currency) }})</div>
					<div class="text-right">{{ $t('subUpgradeView.yearly') }}</div>
					<div v-if="!isMonthly">{{ formatCurrency(yearlyPrice, currency) }}</div>
					<div v-else class="text-size-secondary italic">({{ formatCurrency(yearlyPrice, currency) }})</div>
					<div class="text-right">{{ $t('subUpgradeView.recurring') }}</div>
					<div>{{ isMonthly ? $t('subUpgradeView.monthly') : $t('subUpgradeView.yearly') }}</div>
					<div class="text-right"></div>
					<div class="pt-4">
						<button class="primary" @click="changePlan" :data-testid="`sub-${product.sku}-change`">
							{{ $t('subUpgradeView.change') }}
						</button>
					</div>
				</div>
				<ItemHeader>{{ $t('subUpgradeView.billingAddress') }}</ItemHeader>
				<CustomerData
					ref="customerElement"
					mode="create"
					v-model="subscriptionCustomerDraft"
					v-model:changed="changed"
					v-model:valid="valid"
					v-model:country-code="countryCode"
					:disabled="payInProgress"
				/>
				<PaymentMethodSelector v-model="method" :disabled="payInProgress" />
				<PaymentSummary
					v-if="product"
					:items="[{ sku: product.sku, text: product.name, price: product.price, quantity: 1 }]"
					:currency="currency"
					:countryCode="countryCode"
					:disabled="payInProgress"
					v-model:terms="termsAccepted"
					v-model:privacy="privacyAccepted"
				/>
				<div class="mb-20 flex items-center justify-end">
					<LoadingIcon v-if="payInProgress" class="animate-spin w-8 h-8 mr-2 inline-block" />
					<button
						type="submit"
						class="primary"
						:disabled="!valid || !termsAccepted || !privacyAccepted || !method || payInProgress"
						data-testid="pay-button"
					>
						{{ $t('subUpgradeView.payNow') }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CustomerData from './CustomerData.vue'
import PaymentMethodSelector from './PaymentMethodSelector.vue'
import ItemHeader from './ItemHeader.vue'
import { Currency, Period, RenewalType, type SubscriptionProduct } from '../../services/types/subscription'
import { noteManager, subscriptionCustomerDraft } from '../../global'
import { assertGuid } from '../../services/types/guid'
import PaymentSummary from './PaymentSummary.vue'
import LoadingIcon from '../../icons/loading.vue'
import { formatCurrency } from '../../services/helpers'

const props = defineProps<{
	product: SubscriptionProduct
	currency: Currency
}>()

const emit = defineEmits(['pay-in-progress', 'change-plan'])

const changed = ref()
const valid = ref()
const termsAccepted = ref(false)
const privacyAccepted = ref(false)
const customerElement = ref<typeof CustomerData>()
const payInProgress = ref(false)
const countryCode = ref('')

const method = ref('')

const isMonthly = computed(() => {
	return props.product.data.period === Period.Month
})

const monthlyPrice = computed(() => {
	return props.product.data.period === Period.Month ? props.product.price : props.product.price / 12
})

const yearlyPrice = computed(() => {
	return props.product.data.period === Period.Year ? props.product.price : props.product.price * 12
})

const changePlan = () => {
	emit('change-plan')
}

const populate = async () => {
	payInProgress.value = false
}

onMounted(async () => {
	await populate()
})

const submit = async () => {
	if (customerElement.value && valid && termsAccepted.value && privacyAccepted.value && props.product && method.value) {
		payInProgress.value = true
		await customerElement.value.save(termsAccepted.value, privacyAccepted.value)
		await customerElement.value.verifyEmail()
		const newSubResult = await noteManager.payment.newSubscription({
			productId: props.product.id!,
			renewalType: RenewalType.Automatic,
			currency: props.currency,
		})
		if (method.value === 'NEW') {
			const createPayResult = await noteManager.payment.createPaymentLink({
				invoiceId: newSubResult.invoiceId,
				save: true,
				clientRef: 'upgrade',
			})
			window.open(createPayResult.link, '_blank')
			emit('pay-in-progress', newSubResult.invoiceId, true, createPayResult.link)
		} else {
			const methodId = method.value
			assertGuid(methodId)
			const payResult = await noteManager.payment.chargeExistingMethod({
				invoiceId: newSubResult.invoiceId,
				methodId,
				purpose: 'Online order',
			})
			if (payResult.success) {
				emit('pay-in-progress', newSubResult.invoiceId, false)
			}
		}
	}
}
</script>
