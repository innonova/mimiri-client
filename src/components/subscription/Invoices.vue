<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">Invoices</div>
		</div>
		<div class="bg-info h-2 mb-2 mr-2"></div>
		<div v-if="!invoices?.length" class="m-5" data-testid="invoices-none">No Invoices Yet</div>
		<div class="p-1 pt-2 text-left overflow-y-auto" data-testid="invoices-view">
			<div class="flex flex-col gap-2">
				<template v-for="invoice of invoices" :key="invoice.id">
					<InvoiceItem :invoice="invoice" @pay-invoice="payInvoice"></InvoiceItem>
				</template>
			</div>
		</div>
		<input type="hidden" data-testid="invoice-numbers" :value="invoices.map(inv => inv.no)" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Invoice } from '../../services/types/subscription'
import { noteManager } from '../../global'
import InvoiceItem from './InvoiceItem.vue'

const emit = defineEmits(['pay-invoice'])

const invoices = ref<Invoice[]>([])

const populate = async () => {
	invoices.value = await noteManager.paymentClient.getInvoices()
}

const payInvoice = (invoice: Invoice) => {
	emit('pay-invoice', invoice)
}

onMounted(async () => {
	await populate()
})
</script>
