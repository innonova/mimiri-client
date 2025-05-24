<template>
	<div data-testid="customer-data" class="flex">
		<div class="grid grid-cols-[9em_18em] gap-4 items-baseline">
			<div class="text-right" :class="{ 'text-red-500': !givenNameValid }">First name *</div>
			<input
				v-model="givenName"
				:disabled="disabled"
				name="givenName"
				autocomplete="given-name"
				type="text"
				data-testid="given-name"
			/>
			<div class="text-right" :class="{ 'text-red-500': !familyNameValid }">Last name *</div>
			<input
				v-model="familyName"
				:disabled="disabled"
				name="familyName"
				autocomplete="family-name"
				type="text"
				data-testid="family-name"
			/>
			<div class="text-right">Company <sup>1)</sup></div>
			<input
				v-model="company"
				:disabled="disabled"
				name="company"
				autocomplete="company"
				type="text"
				data-testid="company"
			/>
			<div class="text-right" :class="{ 'text-red-500': !emailValid }">Email *</div>
			<div class="flex flex-col items-end">
				<input
					v-model="email"
					:disabled="disabled"
					name="email"
					autocomplete="email"
					type="text"
					class="w-full"
					data-testid="email"
				/>
				<div
					v-if="showEmailVerification && emailVerified"
					class="text-good mb-[-0.5em] mt-0.5"
					data-testid="email-verified"
				>
					Verified
				</div>
				<div
					v-if="showEmailVerification && emailVerificationEmailSent"
					class="mb-[-0.5em]"
					data-testid="email-verified"
				>
					Verification email sent
				</div>
				<button
					v-if="showEmailVerification && !emailVerified"
					class="mt-1 mb-[-0.5em] min-w-52"
					@click="verifyEmail"
					data-testid="verify-email"
					:disabled="disabled"
				>
					Send verification email
				</button>
			</div>
			<div class="text-right" :class="{ 'text-red-500': !countryValid }">Country *</div>
			<CountrySelector v-model:code="countryCode" v-model:name="countryName" :disabled="disabled"></CountrySelector>
			<div class="text-right" :class="{ 'text-red-500': !stateValid }">
				State/Province <span v-if="stateRequired">*</span><sup v-if="!stateRequired">1)</sup>
			</div>
			<StateSelector
				:country-code="countryCode"
				v-model:code="stateCode"
				v-model:name="stateName"
				v-model:mode="stateMode"
				:disabled="disabled"
			></StateSelector>
			<div class="text-right">City <sup>1)</sup></div>
			<input
				v-model="city"
				name="city"
				:disabled="disabled"
				autocomplete="address-level2"
				type="text"
				data-testid="city"
			/>
			<div class="text-right">Postal Code <sup>1)</sup></div>
			<input
				v-model="postalCode"
				name="postalCode"
				:disabled="disabled"
				autocomplete="postal-code"
				type="text"
				data-testid="postal-code"
			/>
			<div class="text-right">Address <sup>1)</sup></div>
			<textarea
				v-model="address"
				name="street-address"
				class="p-1 h-20"
				autocomplete="street-address"
				data-testid="address"
				:disabled="disabled"
			></textarea>
			<div></div>
			<div>* required</div>
			<div></div>
			<div><sup>1)</sup> We recommend filling out all relevant fields if you need a tax invoice</div>
			<div></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import CountrySelector from './CountrySelector.vue'
import StateSelector from './StateSelector.vue'
import { noteManager } from '../../global'
import type { Customer } from '../../services/types/subscription'

const props = defineProps<{
	mode: 'edit' | 'create'
	disabled?: boolean
}>()

const model = defineModel()
const givenName = ref('')
const familyName = ref('')
const company = ref('')
const email = ref('')
const countryCode = ref('')
const countryName = ref('')
const stateCode = ref('')
const stateName = ref('')
const stateMode = ref('')
const city = ref('')
const postalCode = ref('')
const address = ref('')
const stateRequired = ref(false)
const emailVerified = ref(false)
const emailVerificationEmailSent = ref(false)
const customer = ref<Customer>()

const valid = defineModel('valid')
const changed = defineModel('changed')
const countryCodeOut = defineModel('countryCode')

const givenNameValid = computed(() => givenName.value?.length > 0)
const familyNameValid = computed(() => familyName.value?.length > 0)
const emailValid = computed(() => email.value?.length > 0)
const countryValid = computed(() => countryName.value?.length > 0)
const stateValid = computed(() => stateMode.value === 'text' || stateName.value?.length > 0)

watch(countryCode, () => {
	countryCodeOut.value = countryCode.value
})

watch([givenNameValid, familyNameValid, emailValid, countryValid, stateValid], () => {
	valid.value =
		givenNameValid.value && familyNameValid.value && emailValid.value && countryValid.value && stateValid.value
})

watch([customer, givenName, familyName, company, email, countryCode, stateCode, city, postalCode, address], () => {
	changed.value =
		givenName.value !== customer.value?.givenName ||
		familyName.value !== customer.value?.familyName ||
		company.value !== customer.value?.company ||
		email.value !== customer.value?.email ||
		countryCode.value !== customer.value?.countryCode ||
		stateCode.value !== customer.value?.stateCode ||
		city.value !== customer.value?.city ||
		postalCode.value !== customer.value?.postalCode ||
		address.value !== customer.value?.address
})

const showEmailVerification = computed(
	() =>
		props.mode === 'edit' &&
		customer.value &&
		customer.value.email === email.value &&
		!emailVerificationEmailSent.value,
)

const verifyEmail = async () => {
	if (customer.value && customer.value.email.includes('@') && !customer.value.emailVerified) {
		await noteManager.paymentClient.verifyEmail()
		emailVerificationEmailSent.value = true
	}
}

const save = async (termsAccepted?: boolean, privacyPolicyAccepted?: boolean) => {
	if (valid.value && changed.value) {
		await noteManager.paymentClient.saveCustomerData({
			givenName: givenName.value,
			familyName: familyName.value,
			company: company.value,
			email: email.value,
			countryCode: countryCode.value,
			country: countryName.value,
			stateCode: stateCode.value,
			state: stateCode.value,
			city: city.value,
			postalCode: postalCode.value,
			address: address.value,
			termsAccepted,
			privacyPolicyAccepted,
		})
		await loadCustomer()
	}
}
const cancel = async () => {
	await loadCustomer()
}

const loadCustomer = async () => {
	customer.value = await noteManager.paymentClient.getCustomerData()
	if (customer.value) {
		givenName.value = customer.value.givenName
		familyName.value = customer.value.familyName
		company.value = customer.value.company
		email.value = customer.value.email
		countryCode.value = customer.value.countryCode
		stateCode.value = customer.value.stateCode
		city.value = customer.value.city
		postalCode.value = customer.value.postalCode
		address.value = customer.value.address
		emailVerified.value = customer.value.emailVerified
		emailVerificationEmailSent.value = false
	}
}

onMounted(async () => {
	await loadCustomer()
})

watch(
	[givenName, familyName, company, email, countryCode, countryName, stateCode, stateName, city, postalCode, address],
	() => {
		model.value = {
			givenName: givenName.value,
			familyName: familyName.value,
			company: company.value,
			email: email.value,
			countryCode: countryCode.value,
			country: countryName.value,
			stateCode: stateCode.value,
			state: stateCode.value,
			city: city.value,
			postalCode: postalCode.value,
			address: address.value,
		}
	},
)

watch(countryCode, async () => {
	const countries = await noteManager.paymentClient.getCountries()
	const country = countries.find(c => c.code === countryCode.value)
	stateRequired.value = !!country?.states?.length
})

defineExpose({
	save,
	cancel,
	verifyEmail,
	loadCustomer,
})
</script>
