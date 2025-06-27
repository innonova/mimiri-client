<template>
	<div v-if="noteManager.authenticated" class="flex flex-col h-full">
		<div class="flex items-center py-px px-1 bg-toolbar border-b border-solid border-toolbar min-h-9 select-none">
			<ToolbarIcon icon="back" :hoverEffect="true" title="Back" class="desktop:hidden" @click="onBack"></ToolbarIcon>
		</div>
		<div class="flex overflow-hidden pl-2 pt-2 h-full">
			<div class="w-full">
				<General v-if="type === 'settings-general'"></General>
				<FontsColors v-if="type === 'settings-fonts-colors'"></FontsColors>
				<PinCode v-if="type === 'settings-pin'"></PinCode>
				<PromoteAccount v-if="type === 'settings-create-password'"></PromoteAccount>
				<CreateAccount v-if="type === 'settings-create-account'"></CreateAccount>
				<Username v-if="type === 'settings-username'"></Username>
				<Password v-if="type === 'settings-password'"></Password>
				<DeleteAccount v-if="type === 'settings-delete'"></DeleteAccount>
				<SubscriptionFlow v-if="type === 'settings-plan'"></SubscriptionFlow>
				<ExplainPlan v-if="type === 'settings-explain-plan'"></ExplainPlan>
				<Account v-if="type === 'settings-billing-address'"></Account>
				<DevBlog v-if="type === 'settings-blog'"></DevBlog>
				<Debug v-if="type === 'settings-debug'"></Debug>
				<PaymentMethodsFlow v-if="type === 'settings-payment-methods'"></PaymentMethodsFlow>
				<InvoiceFlow v-if="type === 'settings-invoices'"></InvoiceFlow>
				<About v-if="type === 'settings-about'"></About>
				<Update v-if="type === 'settings-update'"></Update>
				<RecycleBin v-if="type === 'recycle-bin'"></RecycleBin>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { noteManager } from '../global'
import General from './settings/General.vue'
import FontsColors from './settings/FontsColors.vue'
import PinCode from './settings/PinCode.vue'
import Username from './settings/Username.vue'
import Password from './settings/Password.vue'
import DeleteAccount from './settings/DeleteAccount.vue'
import Account from './subscription/Account.vue'
import PromoteAccount from './settings/PromoteAccount.vue'
import CreateAccount from './settings/CreateAccount.vue'
import About from './settings/About.vue'
import DevBlog from './settings/DevBlog.vue'
import Debug from './settings/Debug.vue'
import Update from './settings/Update.vue'
import SubscriptionFlow from './subscription/SubscriptionFlow.vue'
import ExplainPlan from './settings/ExplainPlan.vue'
import InvoiceFlow from './subscription/InvoiceFlow.vue'
import PaymentMethodsFlow from './subscription/PaymentMethodsFlow.vue'
import ToolbarIcon from './ToolbarIcon.vue'
import RecycleBin from './settings/RecycleBin.vue'

const type = computed(() => {
	return noteManager.selectedNote?.type ?? ''
})

const onBack = () => {
	window.history.back()
	noteManager.closeEditorIfMobile()
}
</script>
