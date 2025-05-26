<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Payment Methods']"></TabBar>
		<div v-if="!methods?.length" class="m-5" data-testid="payment-methods-none">No Payments Methods Yet</div>
		<div class="flex flex-col gap-3 items-start overflow-y-auto">
			<template v-for="method of methods" :key="method.id">
				<PaymentMethodItem
					:method="method"
					:is-default="method.id === defaultMethod?.id"
					:show-actions="true"
					@make-default="makeDefault(method)"
					@delete="deleteMethod(method)"
				></PaymentMethodItem>
			</template>
			<div v-if="showCreate" class="py-8 px-2 text-right w-[18rem]">
				<button @click="createNew">Create New</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PaymentMethod } from '../../services/types/subscription'
import PaymentMethodItem from './PaymentMethodItem.vue'
import { deletePaymentMethodDialog, noteManager } from '../../global'
import { emptyGuid } from '../../services/types/guid'
import TabBar from '../elements/TabBar.vue'

const emit = defineEmits(['pay-in-progress'])

const methods = ref<PaymentMethod[]>()
const defaultMethod = ref<PaymentMethod>()
const showCreate = ref(false)

const populate = async () => {
	try {
		const customer = await noteManager.paymentClient.getCustomerData()
		showCreate.value = !!customer
	} catch {
		showCreate.value = false
	}

	const items = await noteManager.paymentClient.getPaymentMethods()
	methods.value = items
	let def = items[0]
	if (items.length > 1) {
		def = items.reduce((p, n) => (p.priority > n.priority ? p : n), def)
	}
	defaultMethod.value = def
}

onMounted(async () => {
	await populate()
})

const makeDefault = async (method: PaymentMethod) => {
	await noteManager.paymentClient.makePaymentMethodDefault(method.id)
	await populate()
}
const deleteMethod = async (method: PaymentMethod) => {
	deletePaymentMethodDialog.value.show(`${method.brand}, ${method.name}`, async confirmed => {
		if (confirmed) {
			await noteManager.paymentClient.deletePaymentMethodDefault(method.id)
			await populate()
		}
	})
}

const createNew = async () => {
	const result = await noteManager.paymentClient.createNewPaymentMethod({ clientReference: 'create-method' })
	emit('pay-in-progress', emptyGuid(), true, result.link, methods.value.length + 1)
	window.open(result.link, '_blank')
}
</script>
