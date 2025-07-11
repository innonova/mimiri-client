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
				<!-- TODO consider placement -->
				<div class="w-120 mt-5">
					<ItemHeader class="col-span-2">Why do we ask for this information?</ItemHeader>
					<div class="mt-2">
						The EU requires us to pay Taxes (VAT) based on your country of residence (<a
							href="https://mimiri.com/eu-vat"
							target="_blank"
							>more information</a
						>).<br />
						<br />
						We will use your email address solely to send you receipts, notifications of failed payments and reminders
						prior to renewal. Your email address also serves as a last resort for canceling your subscription in case
						you lose access to your account.<br />
						<br />
						We will never use your email address for marketing purposes, news letters or any other kind of unsolicited
						communication.<br />
						<br />
						The above data is shared with our payment provider to process your payment (primarily for fraud prevention).
						<br />
						<br />
						We will, however, never share your data with any other parties see
						<a href="https://mimiri.com/privacy" target="_blank">Privacy Policy</a> for details.
						<br />
						<br />
						All data is handled in compliance with the GDPR and Swiss data protection laws.
					</div>
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
			const createPayResult = await noteManager.payment.createPaymentLink({
				invoiceId: props.invoice.id,
				save: true,
				clientRef: 'pay-invoice',
			})
			window.open(createPayResult.link, '_blank')
			emit('pay-in-progress', props.invoice.id, true, createPayResult.link)
		} else {
			const methodId = method.value
			assertGuid(methodId)
			const payResult = await noteManager.payment.chargeExistingMethod({
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
