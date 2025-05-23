<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default">Billing Address</div>
		</div>
		<div class="bg-info h-2 mb-2 mr-2"></div>
		<div class="p-1 pt-2 text-left overflow-y-auto" data-testid="account-view">
			<CustomerData ref="customerElement" mode="edit" v-model:changed="changed" v-model:valid="valid"></CustomerData>
			<div class="flex gap-2 justify-end mt-10 max-w-120">
				<button :disabled="!valid || !changed" @click="save" data-testid="account-save">Save</button>
				<!-- <button :disabled="!changed" @click="cancel">Cancel</button> -->
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CustomerData from './CustomerData.vue'
import { noteManager } from '../../global'
import type { Guid } from '../../services/types/guid'

const changed = ref()
const valid = ref()
const customerElement = ref<typeof CustomerData>(undefined!)

onMounted(() => {
	noteManager.registerActionListener({
		select: (id: Guid) => {
			if (id === 'settings-billing-address') {
				customerElement.value?.loadCustomer()
			}
		},
	})
})

const save = async () => {
	await customerElement.value.save()
}
const cancel = async () => {
	await customerElement.value.cancel()
}
</script>
