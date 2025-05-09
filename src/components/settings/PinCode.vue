<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-pin-code">PIN Code</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="flex flex-col items-center mt-10 max-w-[30rem]">
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
		<div class="p-1 pt-2 mt-5 m-auto text-left">
			<label>
				<input type="checkbox" v-model="enabled" class="mr-1 relative top-0.5" />
				Enable PIN
			</label>
		</div>
	</div>
	<div class="mt-10 max-w-[30rem] mr-2">
		<hr />
		<div class="w-full flex justify-end mt-2 gap-2">
			<button :disabled="!canSave" @click="save">Save</button>
			<!-- <button class="secondary" @click="close">Close</button> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { localAuth } from '../../services/local-auth'
import { passwordDialog } from '../../global'

let inputEnabled = false

const pin = ref('')
const enabled = ref(false)
const changed = ref(false)
const canSave = computed(() => {
	if (pin.value.length === 4) {
		return changed.value
	} else if (pin.value.length === 0 && !enabled.value) {
		return enabled.value !== localAuth.pinEnabled
	}
	return false
})

onMounted(() => {
	pin.value = localAuth.pin ?? ''
	enabled.value = localAuth.pinEnabled
	changed.value = false
	inputEnabled = true
})

watch(pin, () => {
	if (pin.value !== localAuth.pin) {
		// latch to prevent using this screen from being used for figuring out the pin
		changed.value = true
	}
	if (pin.value.length < 4) {
		enabled.value = false
	} else if (pin.value.length === 4) {
		enabled.value = true
	}
})

useEventListener(document, 'keydown', e => {
	if (inputEnabled) {
		if (e.key === 'Backspace') {
			if (pin.value.length > 1) {
				pin.value = pin.value.substring(0, pin.value.length - 1)
			} else {
				pin.value = ''
			}
		}
	}
})

useEventListener(document, 'keypress', e => {
	if (inputEnabled) {
		if (e.key.charCodeAt(0) >= '0'.charCodeAt(0) && e.key.charCodeAt(0) <= '9'.charCodeAt(0)) {
			if (pin.value.length < 4) {
				pin.value += e.key
			}
		}
	}
})

const save = () => {
	inputEnabled = false
	passwordDialog.value.show(
		() => {
			localAuth.setPin(pin.value)
			inputEnabled = true
			changed.value = false
		},
		() => {
			inputEnabled = true
		},
	)
}
</script>
