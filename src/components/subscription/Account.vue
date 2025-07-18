<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Billing Address']" />
		<div class="p-1 pt-2 flex-col overflow-y-auto" data-testid="account-view">
			<CustomerData ref="customerElement" mode="edit" v-model:changed="changed" v-model:valid="valid" />
			<div class="mt-4 grid grid-cols-[9em_18em] gap-4">
				<div />
				<div class="text-right">
					<button class="primary" :disabled="!valid || !changed" @click="save" data-testid="account-save">Save</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { onMounted, ref } from 'vue'
	import CustomerData from './CustomerData.vue'
	import { noteManager } from '../../global'
	import type { Guid } from '../../services/types/guid'
	import TabBar from '../elements/TabBar.vue'

	const changed = ref()
	const valid = ref()
	const customerElement = ref<typeof CustomerData>(undefined!)

	onMounted(() => {
		noteManager.tree.registerActionListener({
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
