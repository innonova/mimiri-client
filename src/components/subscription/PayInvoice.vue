<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">Pay Invoice</div>
		</div>
		<div class="bg-info w-full h-2 mb-4"></div>
		<div class="flex flex-col overflow-y-auto pr-2" data-testid="pay-invoice-view">
			<form v-on:submit.prevent="submit" class="max-w-110">
				<ItemHeader>Billing address</ItemHeader>
				<CustomerData
					ref="customerElement"
					mode="create"
					v-model:changed="changed"
					v-model:valid="valid"
					v-model:country-code="countryCode"
				></CustomerData>
				<PaymentMethodSelector v-model="method"></PaymentMethodSelector>
				<PaymentSummary
					:items="invoice.data.items"
					:currency="invoice.currency"
					v-model:terms="termsAccepted"
					v-model:privacy="privacyAccepted"
					:country-code="countryCode"
				></PaymentSummary>
				<div class="text-right mb-20">
					<button
						type="submit"
						:disabled="!valid || !termsAccepted || !privacyAccepted || !method"
						class="primary"
						data-testid="pay-button"
					>
						Pay now
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CustomerData from './CustomerData.vue'
import PaymentMethodSelector from './PaymentMethodSelector.vue'
import { type Invoice } from '../../services/types/subscription'
import { noteManager } from '../../global'
import { assertGuid } from '../../services/types/guid'
import ItemHeader from './ItemHeader.vue'
import PaymentSummary from './PaymentSummary.vue'

const props = defineProps<{
	invoice: Invoice
}>()

const emit = defineEmits(['pay-in-progress'])

const changed = ref()
const valid = ref()
const termsAccepted = ref(false)
const privacyAccepted = ref(false)
const customerElement = ref<typeof CustomerData>()
const countryCode = ref()

const method = ref('')

const submit = async () => {
	if (customerElement.value && valid && termsAccepted.value && privacyAccepted.value && props.invoice) {
		await customerElement.value.save(termsAccepted.value, privacyAccepted.value)
		await customerElement.value.verifyEmail()

		if (method.value === 'NEW') {
			const createPayResult = await noteManager.paymentClient.createPaymentLink({
				invoiceId: props.invoice.id,
				save: true,
				clientRef: 'pay-invoice',
			})
			window.open(createPayResult.link, '_blank')
			emit('pay-in-progress', props.invoice.id, true, createPayResult.link)
		} else {
			const methodId = method.value
			assertGuid(methodId)
			const payResult = await noteManager.paymentClient.chargeExistingMethod({
				invoiceId: props.invoice.id,
				methodId,
				purpose: 'Online order',
			})
			if (payResult.success) {
				emit('pay-in-progress', props.invoice.id, false)
			}
		}
	}
}
</script>
