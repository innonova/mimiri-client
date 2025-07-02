<template>
	<div
		class="grid grid-cols-[9rem_9rem] gap-1 border shadow-sm p-3"
		:data-testid="`payment-method-${method.name}-container`"
		:disabled="disabled"
	>
		<img class="h-10" :src="noteManager.payment.getIconPath(method.brand)" />
		<div class="text-right">{{ method.name }}</div>
		<div></div>
		<div class="text-right">
			<span v-if="method.expiry">Expires: {{ method.expiry }}</span>
		</div>
		<div v-if="!isDefault && showActions" class="pt-3">
			<button
				@click="emit('make-default')"
				:disabled="disabled"
				:data-testid="`payment-method-${method.name}-make-default`"
				class="primary"
			>
				Make default
			</button>
		</div>
		<div v-if="isDefault && showActions" class="pt-3" :data-testid="`payment-method-${method.name}-is-default`">
			Default
		</div>
		<div v-if="showActions" class="text-right pt-3">
			<button
				class="primary"
				@click="emit('delete')"
				:disabled="disabled"
				:data-testid="`payment-method-${method.name}-delete`"
			>
				Delete
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { PaymentMethod } from '../../services/types/subscription'
import { noteManager } from '../../global'

const props = defineProps<{
	method: PaymentMethod
	isDefault: boolean
	showActions: boolean
	disabled?: boolean
}>()

const emit = defineEmits(['make-default', 'delete'])
</script>
