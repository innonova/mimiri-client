<template>
	<div class="grid grid-cols-[9em_9em_9em] gap-4 border shadow p-2 w-[30em]" :data-testid="`invoice-${invoice.no}`">
		<div>Invoice No: {{ invoice.no }}</div>
		<div>Issued: {{ formatInvoiceDate(invoice.issued) }}</div>
		<div v-if="invoice.status === 'paid'" class="text-right" :data-testid="`invoice-${invoice.no}-status-paid`">
			Status: <span class="text-good font-bold">PAID</span>
		</div>
		<div
			v-if="invoice.status === 'issued' && !overdue"
			class="text-right"
			:data-testid="`invoice-${invoice.no}-status-open`"
		>
			Status: <span class="text-good font-bold">OPEN</span>
		</div>
		<div v-if="overdue" class="text-right" :data-testid="`invoice-${invoice.no}-status-overdue`">
			Status: <span class="text-bad font-bold">OVERDUE</span>
		</div>
		<div v-if="invoice.status === 'credited'" class="text-right" :data-testid="`invoice-${invoice.no}-status-credited`">
			Status: <span class="text-good font-bold">CREDITED</span>
		</div>
		<div
			v-if="invoice.status === 'credit-note'"
			class="text-right"
			:data-testid="`invoice-${invoice.no}-status-credit-note`"
		>
			Status: <span class="text-good font-bold">CREDIT NOTE</span>
		</div>
		<div v-if="invoice.status === 'issued'"></div>
		<div v-if="invoice.status === 'issued'">Due: {{ formatInvoiceDate(invoice.due) }}</div>
		<div v-if="invoice.status === 'issued'" class="text-right">
			<button @click="payNow" :data-testid="`invoice-${invoice.no}-pay-now`">Pay Now</button>
		</div>
		<div v-if="invoice.status === 'issued' && autoPay && !overdue" class="col-span-full text-right italic">
			Will be paid automatically on {{ formatInvoiceDate(invoice.due) }}
		</div>

		<div class="flex gap-2">
			<button @click="showInvoice">View</button>
			<button @click="showInvoicePdf">PDF</button>
		</div>
		<div></div>
		<div class="text-right" :data-testid="`invoice-${invoice.no}-total`">
			{{ invoice.currency }} {{ formatCurrency(invoice.data.total) }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { currentTime, formatCurrency, formatInvoiceDate } from '../../services/helpers'
import { InvoiceStatus, RenewalType, type Invoice } from '../../services/types/subscription'
import { add, isAfter } from 'date-fns'
import { noteManager } from '../../global'

const props = defineProps<{
	invoice: Invoice
}>()

const emit = defineEmits(['pay-invoice'])

const now = ref<Date>(currentTime())
const autoPay = ref(false)
const overdue = computed(
	() => props.invoice.status === InvoiceStatus.Issued && isAfter(now.value, props.invoice.due ?? now.value),
)

onMounted(async () => {
	if (props.invoice.status === InvoiceStatus.Issued && props.invoice.subscriptionId) {
		const subscription = await noteManager.paymentClient.getCurrentSubscription()
		if (subscription?.id === props.invoice.subscriptionId) {
			autoPay.value = subscription.renewalType === RenewalType.Automatic
		}
	}
})

const showInvoice = async () => {
	const auth = await noteManager.paymentClient.createAuthQuery({
		request: 'invoice',
		timestamp: new Date(),
		validUntil: add(new Date(), { hours: 12 }),
	})
	window.open(`http://localhost:5174/invoice/${props.invoice.id}?auth=${auth}`, '_blank')
}

const showInvoicePdf = async () => {
	const auth = await noteManager.paymentClient.createAuthQuery({
		request: 'invoice',
		timestamp: new Date(),
		validUntil: add(new Date(), { hours: 12 }),
	})
	window.open(
		`http://localhost:3000/invoice/${props.invoice.id}/pdf/mimri_${props.invoice.no}.pdf?auth=${auth}`,
		'_blank',
	)
}

const payNow = async () => {
	emit('pay-invoice', props.invoice)
}
</script>
