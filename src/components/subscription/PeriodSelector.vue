<template>
	<div class="flex gap-3 items-center">
		<div>{{ $t('subPeriodSelector.paymentPeriod') }}</div>
		<label class="flex items-center gap-1">
			<input
				v-model="model"
				type="radio"
				class="mt-0.5"
				name="period"
				:value="Period.Month"
				data-testid="period-month"
			/>
			{{ $t('subPeriodSelector.month') }}
		</label>
		<label class="flex items-center gap-1">
			<input v-model="model" type="radio" class="mt-0.5" name="period" :value="Period.Year" data-testid="period-year" />
			{{ $t('subPeriodSelector.year') }}
		</label>
	</div>
</template>
<script setup lang="ts">
import { Period } from '../../services/types/subscription'
const model = defineModel<Period>()
</script>
