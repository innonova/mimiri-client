<template>
	<select
		v-if="states.length > 0"
		v-model="code"
		ref="selectElement"
		autocomplete="state"
		id="state"
		name="state"
		:disabled="disabled"
		data-testid="state-selector"
	>
		<option value=""></option>
		<template v-for="state of states" :key="state.code">
			<option :value="state.code">{{ state.name }}</option>
		</template>
	</select>
	<input
		v-if="states.length === 0"
		v-model="name"
		:disabled="disabled"
		type="text"
		class="basic-input"
		data-testid="state-text"
	/>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { noteManager } from '../../global'
import type { State } from '../../services/types/subscription'

const props = defineProps<{
	countryCode: string
	disabled?: boolean
}>()

const selectElement = ref<HTMLSelectElement>(undefined!)
const code = defineModel('code')
const name = defineModel('name')
const mode = defineModel('mode')

const states = ref<State[]>([])

const updateStates = async () => {
	const countries = await noteManager.getCountries()
	const country = countries.find(c => c.code === props.countryCode)
	states.value = country?.states ?? []
	mode.value = states.value.length > 0 ? 'selector' : 'text'
	const state = states.value.find(s => s.code === code.value)
	if (state) {
		name.value = state?.name
	} else {
		code.value = ''
	}
}

void updateStates()

watch(props, async () => {
	await updateStates()
})

watch(code, () => {
	const state = states.value.find(s => s.code === code.value)
	if (state) {
		name.value = state?.name
	} else {
		name.value = ''
	}
})
</script>
