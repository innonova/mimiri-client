<template>
	<div v-if="noteManager.state.isLoggedIn" class="flex flex-col h-full">
		<div class="flex items-center py-px px-1 bg-toolbar border-b border-solid border-toolbar min-h-9 select-none">
			<ToolbarIcon icon="back" :hoverEffect="true" title="Back" class="desktop:hidden" @click="onBack" />
		</div>
		<div class="flex overflow-hidden pl-2 pt-2 h-full">
			<div class="w-full">
				<General v-if="type === 'settings-general'" />
				<FontsColors v-if="type === 'settings-fonts-colors'" />
				<PinCode v-if="type === 'settings-pin'" />
				<PromoteAccount v-if="type === 'settings-create-password'" />
				<CreateAccount v-if="type === 'settings-create-account'" />
				<Upgrade v-if="type === 'settings-upgrade'" />
				<Username v-if="type === 'settings-username'" />
				<Password v-if="type === 'settings-password'" />
				<DeleteAccount v-if="type === 'settings-delete'" />
				<SubscriptionFlow v-if="type === 'settings-plan'" />
				<ExplainPlan v-if="type === 'settings-explain-plan'" />
				<Account v-if="type === 'settings-billing-address'" />
				<DevBlog v-if="type === 'settings-blog'" />
				<Debug v-if="type === 'settings-debug'" />
				<PaymentMethodsFlow v-if="type === 'settings-payment-methods'" />
				<InvoiceFlow v-if="type === 'settings-invoices'" />
				<About v-if="type === 'settings-about'" />
				<Update v-if="type === 'settings-update'" />
				<RecycleBin v-if="type === 'recycle-bin'" />
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
	import CreateAccount from './settings/CreateAccount2.vue'
	import Upgrade from './settings/Upgrade.vue'
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
		return noteManager.tree.selectedNote()?.type ?? ''
	})

	const onBack = () => {
		window.history.back()
		noteManager.ui.closeEditorIfMobile()
	}
</script>
