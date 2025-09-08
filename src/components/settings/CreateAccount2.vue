<template>
	<div class="flex flex-col h-full" data-testid="create-account-view">
		<TabBar ref="tabBar" @selected="tabSelected" :items="tabBarItems" />

		<form @submit.prevent="createAccount" class="overflow-y-auto pb-20">
			<div v-if="stage === 'create-account'" class="pl-2 mt-1">
				<div class="grid grid-cols-[5rem_15rem] gap-2">
					<ItemHeader v-if="createMode === 'cloud'" class="col-span-2">Cloud Account</ItemHeader>
					<div v-if="createMode === 'cloud'" class="col-span-2">
						<div class="pl-6">
							<ul class="list-disc">
								<li class="py-0.5">Access notes from anywhere</li>
								<li class="py-0.5">Notes backed up in cloud</li>
								<li class="py-0.5">End-to-end encryption</li>
								<li class="py-0.5">On-device encryption</li>
								<li class="py-0.5">End-to-end encrypted sharing with other users</li>
								<li class="py-0.5">Unlimited note hierarchy</li>
								<li class="py-0.5">Unlimited device sync on Windows, Linux, macOS, Android, iOS and web</li>
								<li class="py-0.5">Offline read/write access</li>
								<li class="py-0.5">Automatic conflict resolution</li>
								<li class="py-0.5">Unlimited version history</li>
								<li class="py-0.5">100 MB & 2000 notes for free</li>
							</ul>
							<div class="mt-4">
								<a href="https://mimiri.io/pricing" target="_blank">See pricing for additional space</a>
							</div>
						</div>
					</div>
					<ItemHeader v-if="createMode !== 'cloud'" class="col-span-2">Local Account</ItemHeader>
					<div v-if="createMode !== 'cloud'" class="col-span-2">
						<div class="pl-6">
							<ul class="list-disc">
								<li class="py-0.5">On-device encryption</li>
								<li class="py-0.5">Unlimited note hierarchy</li>
								<li class="py-0.5">Offline read/write access</li>
								<li class="py-0.5">Unlimited storage (locally)</li>
								<li class="py-0.5">Notes stored exclusively on this device</li>
							</ul>
						</div>
					</div>
					<ItemHeader class="col-span-2">Choose your credentials</ItemHeader>
					<div class="flex items-center">Username:</div>
					<UsernameInput
						:display-current="false"
						:check-username="createMode === 'cloud'"
						v-model:value="username"
						v-model:valid="usernameValid"
					/>
					<div v-if="showPasswordGenerator" class="col-span-2 text-right mb-[-0.5rem] mt-0.5">
						<button type="button" class="underline cursor-pointer" @click="helpChoosePassword">Hide generator</button>
					</div>
					<PasswordGenerator
						v-if="showPasswordGenerator"
						ref="passwordGenerator"
						:mode="'mimiri'"
						class="col-span-2"
						@password="passwordGenerated"
					/>
					<div class="flex items-center">Password:</div>
					<PasswordInput v-if="!showPasswordGenerator" :display-current="false" v-model:value="password" />
					<PasswordGenInput v-if="showPasswordGenerator" v-model:value="password" @refresh="refreshPassword" />
					<div v-if="!showPasswordGenerator" class="col-span-2 text-right">
						<button type="button" class="underline cursor-pointer" @click="helpChoosePassword">Help me choose</button>
					</div>
					<div class="flex items-center">Repeat:</div>
					<PasswordRepeatInput :display-current="false" :value="password" v-model:match="passwordMatch" />
					<div />
					<PrimaryButton :enabled="canCreate" :loading="loading" data-testid="create-button">Create</PrimaryButton>
					<Faq :items="faqItems" class="mt-6 col-span-2" />
					<div class="col-span-2 text-text-secondary text-size-small mt-4 flex flex-col gap-1">
						<a href="https://mimiri.io/userguide-security" target="_blank"
							>Read more about how we keep your data secure</a
						>
						<a href="https://mimiri.io/userguide-passwords" target="_blank">Read more about password selection</a>
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { blockUserInput, noteManager } from '../../global'
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
const tabBarItems = ref(['Cloud Account', 'Local Account'])
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

const faqItems = ref([
	{
		question: 'Is the Cloud Account free?',
		answer: `Yes up to 2000 notes and 10MB which is equivalent to thousands of pages of notes.`,
	},
	{
		question: 'Do I need a Cloud Account?',
		answer: `If you want to access your notes from multiple devices or you wish to share notes with other users you yes.

		If you want to keep your notes only on this device and not sync them anywhere then no`,
	},
	{
		question: 'Is my data safe in the Cloud?',
		answer: `Your data is encrypted before it leaves your device and even we cannot access your data.`,
	},
	{
		question: 'Can you help me recover my password?',
		answer: `No, unfortunately we cannot help you recover your password.

		Making this possible would substantially weaken your data security.`,
	},
	{
		question: 'Is my data safer with a Local Account?',
		answer: `Technically a Local Account offers stronger privacy guarantees. However, with a well chosen password the difference is academic.

		And a Local Account does not help ensure your own access to the data in case of device loss or in an emergency situation.

		Ultimately it depends on what you are trying to achieve.`,
	},
])

const populate = async () => {
	products.value = (await noteManager.payment.getSubscriptionProducts()).filter(
		prod => prod.data.period === Period.Month || prod.sku === 'free',
	)
}

onMounted(async () => {
	await populate()
})

const createAccount = async () => {
	loading.value = true
	blockUserInput.value = true
	try {
		if (createMode.value === 'cloud') {
			await noteManager.session.promoteToCloudAccount(username.value, '', password.value, DEFAULT_ITERATIONS)
			noteManager.tree.openNote('settings-plan' as Guid)
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

const tabSelected = item => {
	if (item === 'Cloud Account') {
		createMode.value = 'cloud'
	} else {
		createMode.value = 'local'
	}
}
</script>
