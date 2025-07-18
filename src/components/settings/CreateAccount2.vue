<template>
	<div class="flex flex-col h-full" data-testid="create-account-view">
		<TabBar ref="tabBar" @selected="tabSelected" :items="tabBarItems" />

		<form @submit.prevent="createAccount" class="overflow-y-auto pb-10">
			<div v-if="stage === 'create-account'" class="pl-2 mt-1">
				<div class="grid grid-cols-[5rem_12rem] gap-2">
					<ItemHeader class="col-span-2">Choose your credentials</ItemHeader>
					<div class="flex items-center">Username:</div>
					<UsernameInput
						:display-current="false"
						:check-username="createMode === 'cloud'"
						v-model:value="username"
						v-model:valid="usernameValid"
					/>
					<div class="flex items-center">Password:</div>
					<PasswordInput :display-current="false" v-model:value="password" />
					<div class="flex items-center">Repeat:</div>
					<PasswordRepeatInput :display-current="false" :value="password" v-model:match="passwordMatch" />
					<div />
					<PrimaryButton :enabled="canCreate" :loading="loading" data-testid="create-button">Create</PrimaryButton>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'
	import { Currency, Period, type Invoice, type SubscriptionProduct } from '../../services/types/subscription'
	import { blockUserInput, noteManager } from '../../global'
	import UsernameInput from '../elements/UsernameInput.vue'
	import PasswordInput from '../elements/PasswordInput.vue'
	import PasswordRepeatInput from '../elements/PasswordRepeatInput.vue'
	import PrimaryButton from '../elements/PrimaryButton.vue'
	import TabBar from '../elements/TabBar.vue'
	import ItemHeader from '../subscription/ItemHeader.vue'
	import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'

	const period = ref(Period.Year)
	const products = ref<SubscriptionProduct[]>([])
	const loading = ref(false)
	const createMode = ref('cloud')
	const stage = ref('create-account')
	const tabBarItems = ref(['Cloud Account', 'Local Account'])
	const username = ref('')
	const usernameValid = ref(false)
	const password = ref('')
	const passwordMatch = ref(false)

	const invoice = ref<Invoice>({
		data: {
			items: [],
		},
		currency: Currency.CHF,
	} as any)

	const canCreate = computed(() => {
		const mode = createMode.value
		let result = !!password.value
		result &&= passwordMatch.value
		result &&= !!username.value
		result &&= usernameValid.value || mode === 'local'
		return result
	})

	const emit = defineEmits(['choose'])

	const createAccount = async () => {
		loading.value = true
		blockUserInput.value = true
		try {
			if (createMode.value === 'cloud') {
				await noteManager.session.promoteToCloudAccount(username.value, '', password.value, DEFAULT_ITERATIONS)
			} else {
				await noteManager.session.promoteToLocalAccount(username.value, password.value, DEFAULT_ITERATIONS)
			}
		} catch (error) {
			console.error('Error creating account:', error)
		} finally {
			blockUserInput.value = false
			loading.value = false
		}
	}

	const populate = async () => {
		products.value = (await noteManager.payment.getSubscriptionProducts()).filter(
			prod => prod.data.period === period.value || prod.sku === 'free',
		)
	}

	const tabSelected = item => {
		if (item === 'Cloud Account') {
			createMode.value = 'cloud'
		} else {
			createMode.value = 'local'
		}
	}

	onMounted(async () => {
		await populate()
	})
</script>
