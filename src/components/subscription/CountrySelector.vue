<template>
	<select
		v-model="code"
		ref="selectElement"
		autocomplete="country"
		id="country"
		name="country"
		:disabled="disabled"
		data-testid="country-selector"
	>
		<option value="" />
		<template v-for="country of countries" :key="country.code">
			<option :value="country.code">{{ country.name }}</option>
		</template>
	</select>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Country } from '../../services/types/subscription'
import { noteManager } from '../../global'
const selectElement = ref<HTMLSelectElement>(undefined!)
defineProps<{
	disabled?: boolean
}>()
const code = defineModel<string>('code')
const name = defineModel<string>('name')

const countries = ref<Country[]>([])

void noteManager.payment.getCountries().then(items => {
	countries.value = items
})

void noteManager.payment.getCountries().then(c => (countries.value = c))

watch(code, async () => {
	const country = countries.value.find(c => c.code === code.value)
	code.value = country?.code
	name.value = country?.name
})
</script>
