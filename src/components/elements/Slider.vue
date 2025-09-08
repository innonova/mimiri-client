<template>
	<div
		class="inline-flex bg-info rounded-md p-1 gap-0.5 transition-all duration-200"
		:class="{ 'opacity-50': disabled }"
	>
		<button
			v-for="option in options"
			:key="option.value"
			type="button"
			class="px-3 py-1.5 rounded text-size-menu font-display bg-transparent text-text transition-all duration-200 hover:bg-menu-hover cursor-pointer select-none whitespace-nowrap"
			:class="{
				'bg-button-primary! text-button-primary-text! shadow-sm': modelValue === option.value,
				'cursor-not-allowed hover:bg-transparent': disabled,
			}"
			:disabled="disabled"
			@click="selectOption(option.value)"
			:data-testid="`selector-${option.value}`"
		>
			{{ option.label }}
		</button>
	</div>
</template>

<script setup lang="ts">
interface SelectorOption {
	value: string
	label: string
}

interface Props {
	options: SelectorOption[]
	disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
})

const modelValue = defineModel<string>()

const selectOption = (value: string) => {
	if (!props.disabled) {
		modelValue.value = value
	}
}
</script>
