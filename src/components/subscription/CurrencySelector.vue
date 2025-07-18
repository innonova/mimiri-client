<template>
	<div class="flex gap-2 items-center">
		<div class="pb-0.5">Currency:</div>
		<select v-model="model" ref="selectElement" id="currency" name="currency" data-testid="currency-selector">
			<template v-for="currency of currencies" :key="currency">
				<option :value="currency">{{ currency }}</option>
			</template>
		</select>
	</div>
</template>
<script setup lang="ts">
	import { ref } from 'vue'
	import { Currency } from '../../services/types/subscription'
	const selectElement = ref<HTMLSelectElement>(undefined!)
	const model = defineModel<Currency>()

	const currencies = ref<Currency[]>([Currency.CHF, Currency.EUR, Currency.USD])
</script>
