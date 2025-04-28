<template>
	<ItemHeader v-if="methods?.length > 0">Choose payment method</ItemHeader>
	<div v-if="methods?.length > 0" class="flex flex-col gap-2 mb-4" data-testid="payment-method-selector">
		<label class="shadow p-2 flex gap-1 cursor-pointer"
			><input
				v-model="model"
				type="radio"
				name="method"
				value="NEW"
				class="mr-1"
				data-testid="payment-method-NEW"
			/>New</label
		>
		<template v-for="method of methods" :key="method.id">
			<label class="shadow p-2 flex gap-1 cursor-pointer items-start"
				><input
					v-model="model"
					type="radio"
					name="method"
					:value="method.id"
					class="mt-1.5 mr-1"
					:data-testid="`payment-method-${method.name}`"
				/>
				<div class="flex flex-col">
					<div>
						<img class="h-8" :src="`https://mimiri.payrexx.com/Frontend/Images/CardIcons/card_${method.brand}.svg`" />
					</div>
					<div>{{ method.name }}</div>
					<div>{{ method.expiry }}</div>
				</div>
			</label>
		</template>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PaymentMethod } from '../../services/types/subscription'
import { noteManager } from '../../global'
import ItemHeader from './ItemHeader.vue'

const model = defineModel()
const methods = ref<PaymentMethod[]>()

onMounted(async () => {
	const items = await noteManager.paymentClient.getPaymentMethods()
	methods.value = items
	if (methods.value.length > 0) {
		let def = items[0]
		if (items.length > 1) {
			def = items.reduce((p, n) => (p.priority > n.priority ? p : n), def)
		}
		model.value = def.id
	} else {
		model.value = 'NEW'
	}
})
</script>
