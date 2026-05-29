<template>
	<div data-testid="customer-data" class="flex flex-col">
		<div class="grid grid-cols-[9em_18em] gap-3 items-baseline">
			<div class="text-right" :class="{ 'text-red-500': changed && !givenNameValid }">
				{{ $t('subCustomerData.firstName') }}
			</div>
			<input
				v-model="givenName"
				:disabled="disabled"
				name="givenName"
				autocomplete="given-name"
				:readonly="readonly"
				type="text"
				class="basic-input"
				data-testid="given-name"
			/>
			<div class="text-right" :class="{ 'text-red-500': changed && !familyNameValid }">
				{{ $t('subCustomerData.lastName') }}
			</div>
			<input
				v-model="familyName"
				:disabled="disabled"
				name="familyName"
				autocomplete="family-name"
				:readonly="readonly"
				type="text"
				class="basic-input"
				data-testid="family-name"
			/>
			<div class="text-right">{{ $t('subCustomerData.company') }} <sup>1)</sup></div>
			<input
				v-model="company"
				:disabled="disabled"
				name="company"
				autocomplete="company"
				:readonly="readonly"
				type="text"
				class="basic-input"
				data-testid="company"
			/>
			<div class="text-right" :class="{ 'text-red-500': changed && !emailValid }">
				{{ $t('subCustomerData.email') }}
			</div>
			<div class="flex flex-col items-end">
				<input
					v-model="email"
					:disabled="disabled"
					name="email"
					autocomplete="email"
					:readonly="readonly"
					type="text"
					class="basic-input w-full!"
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
					class="mt-1 mb-[-0.5em] primary"
					@click="verifyEmail"
					data-testid="verify-email"
					:disabled="disabled"
				>
					Send verification email
				</button>
			</div>
			<div class="text-right" :class="{ 'text-red-500': changed && !countryValid }">
				{{ $t('subCustomerData.country') }}
			</div>
			<CountrySelector v-model:code="countryCode" v-model:name="countryName" :disabled="disabled" />
			<div class="text-right" :class="{ 'text-red-500': changed && !stateValid }">
				{{ $t('subCustomerData.stateProvince') }} <span v-if="stateRequired">*</span><sup v-if="!stateRequired">1)</sup>
			</div>
			<StateSelector
				:country-code="countryCode"
				v-model:code="stateCode"
				v-model:name="stateName"
				v-model:mode="stateMode"
				:disabled="disabled"
			/>
			<div class="text-right">{{ $t('subCustomerData.city') }} <sup>1)</sup></div>
			<input
				v-model="city"
				name="city"
				:disabled="disabled"
				autocomplete="address-level2"
				:readonly="readonly"
				type="text"
				class="basic-input"
				data-testid="city"
			/>
			<div class="text-right">{{ $t('subCustomerData.postalCode') }} <sup>1)</sup></div>
			<input
				v-model="postalCode"
				name="postalCode"
				:disabled="disabled"
				autocomplete="postal-code"
				:readonly="readonly"
				type="text"
				class="basic-input"
				data-testid="postal-code"
			/>
			<div class="text-right">{{ $t('subCustomerData.address') }} <sup>1)</sup></div>
			<textarea
				v-model="address"
				name="street-address"
				class="p-1 h-20"
				autocomplete="street-address"
				:readonly="readonly"
				data-testid="address"
				:disabled="disabled"
			/>
			<div />
			<div>{{ $t('subCustomerData.required') }}</div>
			<div />
			<div><sup>1)</sup> {{ $t('subCustomerData.recommendFillOut') }}</div>
			<div />
			<div>
				<button class="underline cursor-pointer" @click="toggleInfo">{{ $t('subCustomerData.whyAsk') }}</button>
			</div>
			<div />
		</div>

		<div v-if="showInfoText" class="max-w-120 mt-2 info">
			<div class="mt-2" v-html="$t('subCustomerData.whyAskInfo')" />
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

const model = defineModel<Partial<Customer>>()
const readonly = ref(true)
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
const showInfoText = ref(false)

const valid = defineModel<boolean>('valid')
const changed = defineModel<boolean>('changed')
const countryCodeOut = defineModel<string>('countryCode')

const givenNameValid = computed(() => givenName.value?.length > 0)
const familyNameValid = computed(() => familyName.value?.length > 0)
const emailValid = computed(() => email.value?.length > 0)
const countryValid = computed(() => countryName.value?.length > 0)
const stateValid = computed(() => stateMode.value === 'text' || stateName.value?.length > 0)

const toggleInfo = () => {
	showInfoText.value = !showInfoText.value
}

watch(countryCode, () => {
	countryCodeOut.value = countryCode.value
})

watch([givenNameValid, familyNameValid, emailValid, countryValid, stateValid], () => {
	valid.value =
		givenNameValid.value && familyNameValid.value && emailValid.value && countryValid.value && stateValid.value
})

watch([customer, givenName, familyName, company, email, countryCode, stateCode, city, postalCode, address], () => {
	changed.value =
		givenName.value !== (customer.value?.givenName ?? '') ||
		familyName.value !== (customer.value?.familyName ?? '') ||
		company.value !== (customer.value?.company ?? '') ||
		email.value !== (customer.value?.email ?? '') ||
		countryCode.value !== (customer.value?.countryCode ?? '') ||
		stateCode.value !== (customer.value?.stateCode ?? '') ||
		city.value !== (customer.value?.city ?? '') ||
		postalCode.value !== (customer.value?.postalCode ?? '') ||
		address.value !== (customer.value?.address ?? '')
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
		await noteManager.payment.verifyEmail()
		emailVerificationEmailSent.value = true
	}
}

const save = async (termsAccepted?: boolean, privacyPolicyAccepted?: boolean) => {
	if (valid.value && changed.value) {
		await noteManager.payment.saveCustomerData({
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
	customer.value = await noteManager.payment.getCustomerData()
	if (customer.value?.id) {
		readonly.value = true
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
	} else {
		customer.value = undefined
	}
	readonly.value = false
}

onMounted(async () => {
	await loadCustomer()
	if (!customer.value && model.value) {
		const draft = model.value
		givenName.value = draft.givenName ?? ''
		familyName.value = draft.familyName ?? ''
		company.value = draft.company ?? ''
		email.value = draft.email ?? ''
		countryCode.value = draft.countryCode ?? ''
		countryName.value = draft.country ?? ''
		stateCode.value = draft.stateCode ?? ''
		city.value = draft.city ?? ''
		postalCode.value = draft.postalCode ?? ''
		address.value = draft.address ?? ''
	}
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
	const countries = await noteManager.payment.getCountries()
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
