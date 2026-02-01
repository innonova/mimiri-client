<template>
	<div class="w-full max-w-sm mx-auto">
		<div class="flex gap-2 justify-center items-center" role="group" :aria-label="ariaLabel">
			<input
				v-for="(digit, index) in digits"
				:key="index"
				ref="inputRefs"
				v-model="digits[index]"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				maxlength="1"
				:data-testid="'pin-input-digit-' + index"
				:class="[
					'w-9 h-12 text-center text-lg font-semibold border-2 rounded-lg transition-all duration-200 ease-in-out focus:outline-none caret-transparent',
					'bg-input text-input-text border-info',
					'hover:border-text-secondary',
					'focus:ring-2 focus:ring-button-primary focus:border-button-primary',
					'disabled:opacity-60 disabled:cursor-not-allowed',
					{
						'bg-info border-text-secondary': digit !== '',
						'!border-button-primary ring-2 ring-button-primary ring-opacity-30': focusedIndex === index,
						'!border-error focus:!ring-error focus:!border-error': hasError,
					},
				]"
				:aria-label="`Digit ${index + 1} of ${length}`"
				@input="handleInput(index, $event)"
				@keydown="handleKeydown(index, $event)"
				@focus="handleFocus(index)"
				@blur="handleBlur"
				@paste="handlePaste"
			/>
		</div>
		<div v-if="hasError && errorMessage" class="mt-2 text-sm text-error text-center" role="alert">
			{{ errorMessage }}
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

interface Props {
	length?: number
	disabled?: boolean
	hasError?: boolean
	errorMessage?: string
	ariaLabel?: string
	autoFocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	length: 4,
	disabled: false,
	hasError: false,
	errorMessage: '',
	ariaLabel: 'Enter PIN code',
	autoFocus: false,
})

interface Emits {
	(e: 'complete', value: string): void
	(e: 'change', value: string): void
}

const emit = defineEmits<Emits>()

const modelValue = defineModel<string>({ default: '' })

const inputRefs = ref<HTMLInputElement[]>([])
const focusedIndex = ref<number>(-1)
const digits = ref<string[]>(Array(props.length).fill(''))

watch(
	() => modelValue.value,
	newValue => {
		const chars = newValue.split('').slice(0, props.length)
		digits.value = [...chars, ...Array(props.length - chars.length).fill('')]
	},
	{ immediate: true },
)

const pinValue = computed(() => digits.value.join(''))

watch(pinValue, newValue => {
	modelValue.value = newValue
	emit('change', newValue)

	if (newValue.length === props.length) {
		emit('complete', newValue)
	}
})

const focusFirstEmpty = async () => {
	await nextTick()
	const firstEmptyIndex = digits.value.findIndex(digit => digit === '')
	const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex
	inputRefs.value[targetIndex]?.focus()
}

const handleInput = async (index: number, event: Event) => {
	if (props.disabled) {
		return
	}

	const target = event.target as HTMLInputElement
	const value = target.value.replace(/[^0-9]/g, '')

	if (value.length > 1) {
		const chars = value.split('').slice(0, props.length - index)
		chars.forEach((char, i) => {
			if (index + i < props.length) {
				digits.value[index + i] = char
			}
		})

		const nextIndex = Math.min(index + chars.length, props.length - 1)
		await nextTick()
		inputRefs.value[nextIndex]?.focus()
	} else {
		digits.value[index] = value

		if (value && index < props.length - 1) {
			await nextTick()
			inputRefs.value[index + 1]?.focus()
		}
	}
}

const handleKeydown = async (index: number, event: KeyboardEvent) => {
	if (props.disabled) {
		return
	}

	switch (event.key) {
		case 'Backspace':
			event.preventDefault()
			if (digits.value[index]) {
				digits.value[index] = ''
			} else if (index > 0) {
				digits.value[index - 1] = ''
				await nextTick()
				inputRefs.value[index - 1]?.focus()
			}
			break

		case 'Delete':
			event.preventDefault()
			digits.value[index] = ''
			break

		case 'ArrowLeft':
			event.preventDefault()
			if (index > 0) {
				inputRefs.value[index - 1]?.focus()
			}
			break

		case 'ArrowRight':
			event.preventDefault()
			if (index < props.length - 1) {
				inputRefs.value[index + 1]?.focus()
			}
			break

		case 'Home':
			event.preventDefault()
			inputRefs.value[0]?.focus()
			break

		case 'End':
			event.preventDefault()
			inputRefs.value[props.length - 1]?.focus()
			break
	}
}

const handleFocus = (index: number) => {
	focusedIndex.value = index
	const input = inputRefs.value[index]
	if (input) {
		input.select()
	}
}

const handleBlur = () => {
	focusedIndex.value = -1
}

const handlePaste = async (event: ClipboardEvent) => {
	if (props.disabled) {
		return
	}

	event.preventDefault()
	const pastedData = event.clipboardData?.getData('text') || ''
	const digits_only = pastedData.replace(/[^0-9]/g, '').slice(0, props.length)

	if (digits_only) {
		const chars = digits_only.split('')
		chars.forEach((char, i) => {
			if (i < props.length) {
				digits.value[i] = char
			}
		})

		const nextIndex = Math.min(chars.length, props.length - 1)
		await nextTick()
		inputRefs.value[nextIndex]?.focus()
		inputRefs.value[nextIndex]?.setSelectionRange(1, 1)
	}
}

if (props.autoFocus) {
	void nextTick(async () => {
		await focusFirstEmpty()
	})
}

defineExpose({
	focus: focusFirstEmpty,
	clear: async () => {
		digits.value = Array(props.length).fill('')
		await focusFirstEmpty()
	},
})
</script>
