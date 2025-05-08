<template>
	<div class="flex flex-col h-full">
		<div class="flex items-center py-px px-1 bg-toolbar border-b border-solid border-toolbar h-9 select-none"></div>
		<div class="flex overflow-hidden pl-2 pt-2">
			<div class="w-full">
				<General v-if="type === 'settings-general'"></General>
				<PinCode v-if="type === 'settings-pin'"></PinCode>
				<Username v-if="type === 'settings-username'"></Username>
				<Password v-if="type === 'settings-password'"></Password>
				<DeleteAccount v-if="type === 'settings-delete'"></DeleteAccount>
				<SubscriptionFlow v-if="type === 'settings-plan'"></SubscriptionFlow>
				<Account v-if="type === 'settings-billing-address'"></Account>
				<PaymentMethodsFlow v-if="type === 'settings-payment-methods'"></PaymentMethodsFlow>
				<InvoiceFlow v-if="type === 'settings-invoices'"></InvoiceFlow>
				<About v-if="type === 'settings-about'"></About>
				<Update v-if="type === 'settings-update'"></Update>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { noteManager } from '../global'
import General from './settings/General.vue'
import PinCode from './settings/PinCode.vue'
import Username from './settings/Username.vue'
import Password from './settings/Password.vue'
import DeleteAccount from './settings/DeleteAccount.vue'
import Account from './subscription/Account.vue'
import About from './settings/About.vue'
import Update from './settings/Update.vue'
import SubscriptionFlow from './subscription/SubscriptionFlow.vue'
import InvoiceFlow from './subscription/InvoiceFlow.vue'
import PaymentMethodsFlow from './subscription/PaymentMethodsFlow.vue'

const type = computed(() => {
	return noteManager.selectedNote?.type ?? ''
})
</script>
