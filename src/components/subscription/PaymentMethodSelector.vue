<template>
	<ItemHeader v-if="methods?.length > 0">Choose payment method</ItemHeader>
	<div
		v-if="methods?.length > 0"
		class="flex flex-col gap-2 mb-4 items-end w-[26rem] pr-[0.85rem]"
		:class="{ 'opacity-60': disabled }"
		data-testid="payment-method-selector"
	>
		<label class="p-2 flex gap-1 cursor-pointer items-start"
			><input
				v-model="model"
				type="radio"
				name="method"
				value="NEW"
				class="mt-1.5 mr-1"
				:disabled="disabled"
				data-testid="payment-method-NEW"
			/>
			<div class="border shadow-sm px-3 pt-3 pb-4 w-80">Create new payment method</div></label
		>
		<template v-for="method of methods" :key="method.id">
			<label class="p-2 flex gap-1 cursor-pointer items-start"
				><input
					v-model="model"
					type="radio"
					name="method"
					:value="method.id"
					class="mt-1.5 mr-1"
					:disabled="disabled"
					:data-testid="`payment-method-${method.name}`"
				/>
				<PaymentMethodItem :method="method" :is-default="false" :show-actions="false" :disabled="disabled" />
				<!-- <div class="flex flex-col">
					<div>
						<img class="h-8" :src="`https://mimiri.payrexx.com/Frontend/Images/CardIcons/card_${method.brand}.svg`" />
					</div>
					<div>{{ method.name }}</div>
					<div>{{ method.expiry }}</div>
				</div> -->
			</label>
		</template>
	</div>
	<input type="hidden" data-testid="payment-methods-loaded" :value="loaded" />
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { PaymentMethod } from '../../services/types/subscription'
import { noteManager } from '../../global'
import ItemHeader from './ItemHeader.vue'
import PaymentMethodItem from './PaymentMethodItem.vue'

defineProps<{
	disabled?: boolean
}>()

const model = defineModel()
const methods = ref<PaymentMethod[]>()
const loaded = ref(false)

onMounted(async () => {
	const items = await noteManager.payment.getPaymentMethods()
	methods.value = items
	if (methods.value.length > 0) {
		model.value = undefined
	} else {
		model.value = 'NEW'
	}
	loaded.value = true
})
</script>
