<template>
	<div class="flex flex-col h-full" data-testid="create-account-view">
		<TabBar ref="tabBar" @selected="tabSelected" :items="tabBarItems" />

		<form @submit.prevent="createAccount" class="overflow-y-auto pb-20">
			<div v-if="stage === 'create-account'" class="pl-2 mt-1">
				<div class="grid grid-cols-[5rem_15rem] gap-2">
					<ItemHeader v-if="createMode === 'cloud'" class="col-span-2">{{
						$t('settingsCreateAccount2.cloudAccountHeader')
					}}</ItemHeader>
					<div v-if="createMode === 'cloud'" class="col-span-2">
						<div class="pl-6">
							<ul class="list-disc">
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature1') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature2') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature3') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature4') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature5') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature6') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature7') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature8') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature9') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature10') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.cloudFeature11') }}</li>
							</ul>
							<div v-if="!noteManager.state.isMobile" class="mt-4">
								<a href="https://mimiri.io/pricing" target="_blank">{{ $t('settingsCreateAccount2.seePricing') }}</a>
							</div>
						</div>
					</div>
					<ItemHeader v-if="createMode !== 'cloud'" class="col-span-2">{{
						$t('settingsCreateAccount2.localAccountHeader')
					}}</ItemHeader>
					<div v-if="createMode !== 'cloud'" class="col-span-2">
						<div class="pl-6">
							<ul class="list-disc">
								<li class="py-0.5">{{ $t('settingsCreateAccount2.localFeature1') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.localFeature2') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.localFeature3') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.localFeature4') }}</li>
								<li class="py-0.5">{{ $t('settingsCreateAccount2.localFeature5') }}</li>
							</ul>
						</div>
					</div>
					<ItemHeader class="col-span-2">{{ $t('settingsCreateAccount2.chooseCredentials') }}</ItemHeader>
					<div class="flex items-start">{{ $t('settingsCreateAccount2.username') }}</div>
					<UsernameInput
						:display-current="false"
						:check-username="createMode === 'cloud'"
						:suffix="createMode === 'cloud' ? '@mimiri.io' : undefined"
						v-model:value="username"
						v-model:valid="usernameValid"
					/>
					<div v-if="showPasswordGenerator" class="col-span-2 text-right mb-[-0.5rem] mt-0.5">
						<button type="button" class="underline cursor-pointer" @click="helpChoosePassword">
							{{ $t('settingsCreateAccount2.hideGenerator') }}
						</button>
					</div>
					<PasswordGenerator
						v-if="showPasswordGenerator"
						ref="passwordGenerator"
						:mode="'mimiri'"
						class="col-span-2"
						@password="passwordGenerated"
					/>
					<div class="flex items-center">{{ $t('settingsCreateAccount2.password') }}</div>
					<PasswordInput v-if="!showPasswordGenerator" :display-current="false" v-model:value="password" />
					<PasswordGenInput v-if="showPasswordGenerator" v-model:value="password" @refresh="refreshPassword" />
					<div v-if="!showPasswordGenerator" class="col-span-2 text-right">
						<button type="button" class="underline cursor-pointer" @click="helpChoosePassword">
							{{ $t('settingsCreateAccount2.helpMeChoose') }}
						</button>
					</div>
					<div class="flex items-center">{{ $t('settingsCreateAccount2.repeat') }}</div>
					<PasswordRepeatInput :display-current="false" :value="password" v-model:match="passwordMatch" />
					<div />
					<PrimaryButton :enabled="canCreate" :loading="loading" data-testid="create-button">{{
						$t('settingsCreateAccount2.create')
					}}</PrimaryButton>
					<Faq :items="faqItems" class="mt-6 col-span-2" />
					<div class="col-span-2 text-text-secondary text-size-small mt-4 flex flex-col gap-1">
						<a href="https://mimiri.io/userguide-security" target="_blank">{{
							$t('settingsCreateAccount2.readMoreSecurity')
						}}</a>
						<a href="https://mimiri.io/userguide-passwords" target="_blank">{{
							$t('settingsCreateAccount2.readMorePassword')
						}}</a>
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { blockUserInput, noteManager, $t } from '../../global'
import UsernameInput from '../elements/UsernameInput.vue'
import PasswordInput from '../elements/PasswordInput.vue'
import PasswordRepeatInput from '../elements/PasswordRepeatInput.vue'
import PrimaryButton from '../elements/PrimaryButton.vue'
import TabBar from '../elements/TabBar.vue'
import ItemHeader from '../subscription/ItemHeader.vue'
import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'
import { Period, type SubscriptionProduct } from '../../services/types/subscription'
import PasswordGenerator from '../elements/PasswordGenerator.vue'
import PasswordGenInput from '../elements/PasswordGenInput.vue'
import Faq from '../elements/Faq.vue'
import type { Guid } from '../../services/types/guid'

const loading = ref(false)
const createMode = ref('cloud')
const stage = ref('create-account')
const tabBarItems = computed(() => [$t('settingsCreateAccount2.cloudTab'), $t('settingsCreateAccount2.localTab')])
const username = ref('')
const usernameValid = ref(false)
const password = ref('')
const passwordMatch = ref(false)
const products = ref<SubscriptionProduct[]>([])
const showPasswordGenerator = ref(false)
const passwordGenerator = ref(null)

const canCreate = computed(() => {
	const mode = createMode.value
	let result = !!password.value
	result &&= passwordMatch.value
	result &&= !!username.value
	result &&= usernameValid.value || mode === 'local'
	return result
})

const helpChoosePassword = () => {
	showPasswordGenerator.value = !showPasswordGenerator.value
}
const passwordGenerated = newPassword => {
	password.value = newPassword
}

const refreshPassword = () => {
	passwordGenerator.value?.regeneratePassword()
}

const faqItems = computed(() => [
	{
		question: $t('settingsCreateAccount2.faq1Question'),
		answer: $t('settingsCreateAccount2.faq1Answer'),
	},
	{
		question: $t('settingsCreateAccount2.faq2Question'),
		answer: $t('settingsCreateAccount2.faq2Answer'),
	},
	{
		question: $t('settingsCreateAccount2.faq3Question'),
		answer: $t('settingsCreateAccount2.faq3Answer'),
	},
	{
		question: $t('settingsCreateAccount2.faq4Question'),
		answer: $t('settingsCreateAccount2.faq4Answer'),
	},
	{
		question: $t('settingsCreateAccount2.faq5Question'),
		answer: $t('settingsCreateAccount2.faq5Answer'),
	},
])

const populate = async () => {
	products.value = (await noteManager.payment.getSubscriptionProducts()).filter(
		prod => prod.data.period === Period.Month || prod.sku === 'free',
	)
}

onMounted(async () => {
	await populate()
	await noteManager.auth.setFlag('create-account-read', true)
})

const createAccount = async () => {
	loading.value = true
	blockUserInput.value = true
	try {
		if (createMode.value === 'cloud') {
			await noteManager.session.promoteToCloudAccount(username.value, '', password.value, DEFAULT_ITERATIONS)
			if (!noteManager.state.isMobile) {
				noteManager.tree.openNote('settings-plan' as Guid)
			} else {
				void noteManager.tree.controlPanel().expand()
			}
		} else {
			await noteManager.session.promoteToLocalAccount(username.value, password.value, DEFAULT_ITERATIONS)
			void noteManager.tree.controlPanel().expand()
		}
	} catch (error) {
		console.error('Error creating account:', error)
	} finally {
		blockUserInput.value = false
		loading.value = false
	}
}

const tabSelected = item => {
	if (item === $t('settingsCreateAccount2.cloudTab')) {
		createMode.value = 'cloud'
	} else {
		createMode.value = 'local'
	}
}
</script>
