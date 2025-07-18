<template>
	<div class="flex gap-3 items-center">
		<div>Payment period:</div>
		<label class="flex items-center gap-1">
			<input
				v-model="model"
				type="radio"
				class="mt-0.5"
				name="period"
				:value="Period.Month"
				data-testid="period-month"
			>
			Month
		</label>
		<label class="flex items-center gap-1">
			<input v-model="model" type="radio" class="mt-0.5" name="period" :value="Period.Year" data-testid="period-year">
			Year
		</label>
	</div>
</template>
<script setup lang="ts">
import { Period } from '../../services/types/subscription'
const model = defineModel<Period>()
</script>
