<template>
	<div class="flex flex-col items-center justify-center select-none h-full">
		<h2 class="mb-4">Set PIN</h2>
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
		<div class="mt-6">
			<button
				class="bg-button-primary"
				:disabled="!canSet"
				:class="{
					'text-button-disabled-text': !canSet,
					'text-button-primary-text hover:opacity-80': canSet,
				}"
				@click="setPin"
			>
				Set PIN
			</button>
			<button
				class="bg-button-primary ml-2"
				@click="disablePin"
				:disabled="!localAuth.pinEnabled"
				:class="{
					'text-button-disabled-text': !localAuth.pinEnabled,
					'text-button-primary-text hover:opacity-80': localAuth.pinEnabled,
				}"
			>
				Disable PIN
			</button>
			<button class="bg-button-primary text-button-primary-text hover:opacity-80 ml-2" @click="close">Cancel</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { localAuth } from '../services/local-auth'
import { useEventListener } from '@vueuse/core'
import { showSetPin } from '../global'

const pin = ref('')
const canSet = ref(false)

const close = () => {
	showSetPin.value = false
}

const setPin = () => {
	localAuth.setPin(pin.value)
	pin.value = ''
	setTimeout(() => close(), 500)
}

const disablePin = () => {
	localAuth.disablePin()
}

useEventListener(document, 'keydown', e => {
	if (e.key === 'Backspace') {
		if (pin.value.length > 1) {
			pin.value = pin.value.substring(0, pin.value.length - 1)
		} else {
			pin.value = ''
		}
		canSet.value = pin.value.length === 4
	}
})

useEventListener(document, 'keypress', e => {
	if (e.key.charCodeAt(0) >= '0'.charCodeAt(0) && e.key.charCodeAt(0) <= '9'.charCodeAt(0)) {
		if (pin.value.length < 4) {
			pin.value += e.key
		}
		canSet.value = pin.value.length === 4
	}
})
</script>
