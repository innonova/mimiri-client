<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">Payment Methods</div>
		</div>
		<div class="bg-info w-full h-2 mb-2"></div>
		<div class="flex flex-col gap-3 overflow-y-auto" data-testid="payment-methods-view">
			<template v-for="method of methods" :key="method.id">
				<PaymentMethodItem
					:method="method"
					:is-default="method.id === defaultMethod?.id"
					@make-default="makeDefault(method)"
					@delete="deleteMethod(method)"
				></PaymentMethodItem>
			</template>
			<div class="flex justify-end w-80 pt-10 pb-10">
				<button @click="createNew">Create New</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PaymentMethod } from '../../services/types/subscription'
import PaymentMethodItem from './PaymentMethodItem.vue'
import { noteManager } from '../../global'

const methods = ref<PaymentMethod[]>()
const defaultMethod = ref<PaymentMethod>()

const populate = async () => {
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
	await noteManager.paymentClient.deletePaymentMethodDefault(method.id)
	await populate()
}

const createNew = async () => {
	const result = await noteManager.paymentClient.createNewPaymentMethod({ clientReference: 'create-method' })
	window.open(result.link, '_blank')
}
</script>
