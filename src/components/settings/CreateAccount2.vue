<template>
	<div class="flex flex-col h-full">
		<TabBar ref="tabBar" @selected="tabSelected" :items="tabBarItems"></TabBar>

		<div class="overflow-y-auto pb-10">
			<div v-if="stage === 'create-account'" class="pl-2 mt-1">
				<div class="grid grid-cols-[5rem_12rem] gap-2">
					<ItemHeader class="col-span-2">Choose your credentials</ItemHeader>
					<div class="flex items-center">Username:</div>
					<UsernameInput
						:display-current="false"
						v-model:value="username"
						v-model:valid="usernameValid"
					></UsernameInput>
					<div class="flex items-center">Password:</div>
					<PasswordInput :display-current="false" v-model:value="password"></PasswordInput>
					<div class="flex items-center">Repeat:</div>
					<PasswordRepeatInput
						:display-current="false"
						:value="password"
						v-model:match="passwordMatch"
					></PasswordRepeatInput>
					<div></div>
					<PrimaryButton :enabled="canCreate" :loading="loading" @click="createAccount"> Create </PrimaryButton>
				</div>
			</div>
			<div v-if="stage === 'choose-plan'" class="flex flex-col items-left gap-2 pl-2 mt-1">
				<ItemHeader class="col-span-2">Choose your plan</ItemHeader>
				<div class="pb-4 cursor-default flex gap-5 justify-start items-center">
					<PeriodSelector v-model="period"></PeriodSelector>
					<div class="inline-block"></div>
					<CurrencySelector v-model="currency"></CurrencySelector>
				</div>
				<div class="flex gap-2">
					<template v-for="product of products" :key="product.sku">
						<SubscriptionItem
							:product="product"
							:show-choose="true"
							:show-features="true"
							:currency="currency"
							@choose="choose"
						></SubscriptionItem>
					</template>
				</div>
			</div>
			<div v-if="stage === 'enter-customer-info'" class="flex flex-col items-left gap-2 pl-2 mt-1 w-100">
				<ItemHeader class="col-span-2">Your information</ItemHeader>
				<CustomerData
					ref="customerElement"
					mode="create"
					v-model:changed="changed"
					v-model:valid="valid"
					v-model:country-code="countryCode"
				></CustomerData>
				<PaymentSummary
					:items="invoice.data.items"
					:currency="invoice.currency"
					v-model:terms="termsAccepted"
					v-model:privacy="privacyAccepted"
					:country-code="countryCode"
				></PaymentSummary>
				<div class="grid grid-cols-[9em_18em] gap-3 items-baseline mt-5">
					<div></div>
					<div class="flex justify-between">
						<SecondaryButton :enabled="canCreate" :loading="loading" @click="cancelCustomerData"
							>Cancel</SecondaryButton
						>
						<PrimaryButton :enabled="canCreate" :loading="loading" @click="gotToPayment">Go to Payment</PrimaryButton>
					</div>
				</div>
				<div class="w-120 mt-5">
					<ItemHeader class="col-span-2">Why do we ask for this information?</ItemHeader>
					<div class="mt-2">
						The EU requires us to pay Taxes (VAT) based on your country of residence (<a
							href="https://mimiri.com/eu-vat"
							target="_blank"
							>more information</a
						>).<br />
						<br />
						We will use your email address solely to send you receipts, notifications of failed payments and reminders
						prior to renewal. Your email address also serves as a last resort for canceling your subscription in case
						you lose access to your account.<br />
						<br />
						We will never use your email address for marketing purposes, news letters or any other kind of unsolicited
						communication.<br />
						<br />
						The above data is shared with our payment provider to process your payment (primarily for fraud prevention).
						<br />
						<br />
						We will, however, never share your data with any other parties see
						<a href="https://mimiri.com/privacy" target="_blank">Privacy Policy</a> for details.
						<br />
						<br />
						All data is handled in compliance with the GDPR and Swiss data protection laws.
					</div>
				</div>
			</div>

			<div v-if="stage === 'wait-for-payment'" class="flex flex-col items-left gap-2 pl-2 mt-1">
				<div class="mt-2">Waiting for payment...</div>
			</div>

			<div v-if="stage === 'done'" class="flex flex-col items-left gap-2 pl-2 mt-1">
				<div class="mt-2">Done</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Currency, Period, type Invoice, type SubscriptionProduct } from '../../services/types/subscription'
import { noteManager } from '../../global'
import SubscriptionItem from '../subscription/SubscriptionItem.vue'
import UsernameInput from '../elements/UsernameInput.vue'
import PasswordInput from '../elements/PasswordInput.vue'
import PasswordRepeatInput from '../elements/PasswordRepeatInput.vue'
import PrimaryButton from '../elements/PrimaryButton.vue'
import SecondaryButton from '../elements/SecondaryButton.vue'
import TabBar from '../elements/TabBar.vue'
import CurrencySelector from '../subscription/CurrencySelector.vue'
import PeriodSelector from '../subscription/PeriodSelector.vue'
import CustomerData from '../subscription/CustomerData.vue'
import PaymentSummary from '../subscription/PaymentSummary.vue'
import ItemHeader from '../subscription/ItemHeader.vue'
import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'

const currentProduct = ref<SubscriptionProduct>()
const period = ref(Period.Year)
const products = ref<SubscriptionProduct[]>([])
const currency = ref(Currency.CHF)
const loading = ref(false)
const createMode = ref('cloud')
const stage = ref('create-account')
const changed = ref(false)
const valid = ref(false)
const countryCode = ref('CH')
const tabBarItems = ref(['Cloud Account', 'Local Account'])
const termsAccepted = ref(false)
const privacyAccepted = ref(false)
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
	let result = !!password.value
	result &&= passwordMatch.value
	result &&= !!username.value
	result &&= usernameValid.value
	return result
})

const emit = defineEmits(['choose'])

const createAccount = async () => {
	if (createMode.value === 'cloud') {
	} else {
		await noteManager.promoteToLocalAccount(username.value, password.value, DEFAULT_ITERATIONS)
	}

	tabBarItems.value = ['Cloud Account']
	loading.value = true
	setTimeout(() => {
		loading.value = false
		stage.value = 'choose-plan'
	}, 100)
}

const populate = async () => {
	products.value = (await noteManager.getSubscriptionProducts()).filter(
		prod => prod.data.period === period.value || prod.sku === 'free',
	)
}

const tabSelected = item => {
	console.log(item)

	if (item === 'Cloud Account') {
		createMode.value = 'cloud'
	} else {
		createMode.value = 'local'
	}
}

onMounted(async () => {
	await populate()
})

const choose = (sku: string) => {
	if (sku === 'free') {
		stage.value = 'done'
		return
	}
	console.log(`Choosing product with SKU: ${sku}`)
	stage.value = 'enter-customer-info'
}

const cancelCustomerData = () => {
	stage.value = 'choose-plan'
}

const gotToPayment = () => {
	stage.value = 'wait-for-payment'
}
</script>
