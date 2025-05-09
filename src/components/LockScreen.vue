<template>
	<div v-if="localAuth.pinEnabled && localAuth.elapsed" class="flex flex-col items-center select-none">
		<h2 class="mb-4">Enter PIN to unlock</h2>
		<div class="flex">
			<div class="border-2 w-10 h-16 rounded-lg flex items-center justify-center mr-2">
				<h1 v-if="pin.length > 0">*</h1>
			</div>
			<div class="border-2 w-10 h-16 rounded-lg flex items-center justify-center mr-2">
				<h1 v-if="pin.length > 1">*</h1>
			</div>
			<div class="border-2 w-10 h-16 rounded-lg flex items-center justify-center mr-2">
				<h1 v-if="pin.length > 2">*</h1>
			</div>
			<div class="border-2 w-10 h-16 rounded-lg flex items-center justify-center"><h1 v-if="pin.length > 3">*</h1></div>
		</div>
		<div class="mt-5">Attempts remaining: 1</div>
	</div>
	<div v-if="!localAuth.elapsed" class="bg-input h-full w-full"></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { localAuth } from '../services/local-auth'
import { useEventListener } from '@vueuse/core'

const pin = ref('')

useEventListener(document, 'keydown', e => {
	if (localAuth.locked) {
		if (e.key === 'Backspace') {
			if (pin.value.length > 1) {
				pin.value = pin.value.substring(0, pin.value.length - 1)
			} else {
				pin.value = ''
			}
		}
	} else {
		pin.value = ''
	}
})

useEventListener(document, 'keypress', e => {
	if (localAuth.locked) {
		if (e.key.charCodeAt(0) >= '0'.charCodeAt(0) && e.key.charCodeAt(0) <= '9'.charCodeAt(0)) {
			pin.value += e.key
			if (pin.value.length === 4) {
				const pinCode = pin.value
				pin.value = ''
				localAuth.unlockWithPin(pinCode)
			}
		}
	}
})
</script>
