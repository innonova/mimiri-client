<template>
	<div class="flex">
		<div class="grid grid-cols-[8rem_8rem_6rem] gap-4 border shadow-sm p-2" :data-testid="`invoice-${invoice.no}`">
			<div>{{ $t('subInvoiceItem.invoiceNo') }} {{ invoice.no }}</div>
			<div>{{ $t('subInvoiceItem.issued') }} {{ formatInvoiceDate(invoice.issued) }}</div>
			<div v-if="invoice.status === 'paid'" class="text-right" :data-testid="`invoice-${invoice.no}-status-paid`">
				{{ $t('subInvoiceItem.status') }} <span class="text-good font-bold">{{ $t('subInvoiceItem.paid') }}</span>
			</div>
			<div
				v-if="invoice.status === 'issued' && !overdue"
				class="text-right"
				:data-testid="`invoice-${invoice.no}-status-open`"
			>
				{{ $t('subInvoiceItem.status') }} <span class="text-good font-bold">{{ $t('subInvoiceItem.open') }}</span>
			</div>
			<div v-if="overdue" class="text-right" :data-testid="`invoice-${invoice.no}-status-overdue`">
				{{ $t('subInvoiceItem.status') }} <span class="text-bad font-bold">{{ $t('subInvoiceItem.overdue') }}</span>
			</div>
			<div
				v-if="invoice.status === 'credited'"
				class="text-right"
				:data-testid="`invoice-${invoice.no}-status-credited`"
			>
				{{ $t('subInvoiceItem.status') }} <span class="text-good font-bold">{{ $t('subInvoiceItem.credited') }}</span>
			</div>
			<div
				v-if="invoice.status === 'credit-note'"
				class="text-right"
				:data-testid="`invoice-${invoice.no}-status-credit-note`"
			>
				{{ $t('subInvoiceItem.status') }} <span class="text-good font-bold">{{ $t('subInvoiceItem.creditNote') }}</span>
			</div>
			<div v-if="invoice.status === 'issued'" />
			<div v-if="invoice.status === 'issued'">{{ $t('subInvoiceItem.due') }} {{ formatInvoiceDate(invoice.due) }}</div>
			<div v-if="invoice.status === 'issued'" class="text-right">
				<button class="primary" @click="payNow" :data-testid="`invoice-${invoice.no}-pay-now`">
					{{ $t('subInvoiceItem.payNow') }}
				</button>
			</div>
			<div v-if="invoice.status === 'issued' && autoPay && !overdue" class="col-span-full text-right italic">
				{{ $t('subInvoiceItem.willBePaidAutomatically') }} {{ formatInvoiceDate(invoice.due) }}
			</div>

			<div class="flex gap-2 col-span-2">
				<button class="primary" @click="showInvoice" :data-testid="`invoice-${invoice.no}-view-link`">
					{{ $t('subInvoiceItem.view') }}
				</button>
				<button class="primary" @click="showInvoicePdf" :data-testid="`invoice-${invoice.no}-pdf-link`">
					{{ $t('subInvoiceItem.pdf') }}
				</button>
			</div>
			<div class="text-right" :data-testid="`invoice-${invoice.no}-total`">
				{{ invoice.currency }} {{ formatCurrency(invoice.data.total) }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { currentTime, formatCurrency, formatInvoiceDate } from '../../services/helpers'
import { InvoiceStatus, RenewalType, type Invoice } from '../../services/types/subscription'
import { add, isAfter } from 'date-fns'
import { accountHost, noteManager, pdfEnvironment } from '../../global'

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
		const subscription = await noteManager.payment.getCurrentSubscription()
		if (subscription?.id === props.invoice.subscriptionId) {
			autoPay.value = subscription.renewalType === RenewalType.Automatic
		}
	}
})

const showInvoice = async () => {
	const auth = await noteManager.payment.createAuthQuery({
		request: 'invoice',
		timestamp: new Date(),
		validUntil: add(new Date(), { hours: 12 }),
	})
	window.open(
		`${accountHost}/invoice/${props.invoice.id}?auth=${auth}&status=true&username=${noteManager.state.username}&environment=${pdfEnvironment}`,
		'_blank',
	)
}

const showInvoicePdf = async () => {
	window.open(await noteManager.payment.getPdfUrl(props.invoice), '_blank')
}

const payNow = async () => {
	emit('pay-invoice', props.invoice)
}
</script>
