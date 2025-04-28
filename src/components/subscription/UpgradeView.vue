<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">Upgrade</div>
		</div>
		<div class="bg-info w-full h-2 mb-4"></div>
		<div class="flex flex-col overflow-y-auto pr-2" data-testid="upgrade-view">
			<form v-on:submit.prevent="submit">
				<ItemHeader>Chosen subscription</ItemHeader>
				<div class="flex justify-center pb-5">
					<Subscription
						v-if="product"
						:product="product"
						:compact="true"
						:showChange="true"
						:currency="currency"
						@change="changePlan"
					></Subscription>
				</div>
				<ItemHeader>Billing address</ItemHeader>
				<CustomerData
					ref="customerElement"
					mode="create"
					v-model:changed="changed"
					v-model:valid="valid"
				></CustomerData>
				<PaymentMethodSelector v-model="method"></PaymentMethodSelector>
				<div v-if="product">
					<ItemHeader>Summary</ItemHeader>
					<div class="mb-px">Items</div>
					<div class="flex flex-row justify-between border-t border-b border-gray-200 py-2">
						<div>Subscription - {{ product.name }} - ({{ product.sku }})</div>
						<div class="text-right">{{ formatCurrency(product.price, currency) }}</div>
					</div>
					<div class="my-5">
						<div class="flex justify-between">
							<div>Total amount to be paid now:</div>
							<div data-testid="upgrade-total" class="font-bold">
								{{ formatCurrency(product.price, currency) }}
							</div>
						</div>
						<div class="flex justify-between mt-1">
							<div>Of this VAT:</div>
							<div data-testid="upgrade-vat">
								{{ formatCurrency(calculateReverseVat(product.price), currency) }}
							</div>
						</div>
						<div class="flex justify-between mt-1">
							<div>Currency:</div>
							<div data-testid="upgrade-currency">{{ currency }}</div>
						</div>
					</div>
				</div>
				<div class="mb-5">
					<label class="flex items-center gap-2 justify-end">
						I have read and accept the
						<a href="https://mimiri.io/terms" target="_blank">Terms & Conditions</a
						><input v-model="termsAccepted" name="accept-terms" class="mt-1" type="checkbox" data-testid="accept-terms"
					/></label>
					<label class="flex items-center mt-1.5 gap-2 justify-end"
						>I have read and accept the <a href="https://mimiri.io/privacy" target="_blank">Privacy Policy</a
						><input
							v-model="privacyAccepted"
							name="accept-privacy"
							class="mt-1"
							type="checkbox"
							data-testid="accept-privacy"
					/></label>
				</div>
				<div class="text-right mb-20">
					<button type="submit" :disabled="!valid || !termsAccepted || !privacyAccepted" data-testid="pay-button">
						Pay now
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CustomerData from './CustomerData.vue'
import PaymentMethodSelector from './PaymentMethodSelector.vue'
import ItemHeader from './ItemHeader.vue'
import Subscription from './SubscriptionItem.vue'
import { Currency, RenewalType, type SubscriptionProduct } from '../../services/types/subscription'
import { formatCurrency, calculateReverseVat } from '../../services/helpers'
import { noteManager } from '../../global'
import { assertGuid } from '../../services/types/guid'

const props = defineProps<{
	product: SubscriptionProduct
	currency: Currency
}>()

const emit = defineEmits(['pay-in-progress'])

const changed = ref()
const valid = ref()
const termsAccepted = ref(false)
const privacyAccepted = ref(false)
const customerElement = ref<typeof CustomerData>()

const method = ref('')

const changePlan = () => {}

const populate = async () => {}

onMounted(async () => {
	await populate()
})

const submit = async () => {
	if (customerElement.value && valid && termsAccepted.value && privacyAccepted.value && props.product) {
		await customerElement.value.save(termsAccepted.value, privacyAccepted.value)
		await customerElement.value.verifyEmail()
		const newSubResult = await noteManager.paymentClient.newSubscription({
			productId: props.product.id!,
			renewalType: RenewalType.Automatic,
			currency: props.currency,
		})

		if (method.value === 'NEW') {
			const createPayResult = await noteManager.paymentClient.createPaymentLink({
				invoiceId: newSubResult.invoiceId,
				save: true,
				clientRef: 'upgrade',
			})
			window.open(createPayResult.link, '_blank')
			emit('pay-in-progress', newSubResult.invoiceId, true)
		} else {
			const methodId = method.value
			assertGuid(methodId)
			const payResult = await noteManager.paymentClient.chargeExistingMethod({
				invoiceId: newSubResult.invoiceId,
				methodId,
				purpose: 'Online order',
			})
			console.log('payResult', payResult)

			if (payResult.success) {
				emit('pay-in-progress', newSubResult.invoiceId, false)
			}
		}
	}
}
</script>
