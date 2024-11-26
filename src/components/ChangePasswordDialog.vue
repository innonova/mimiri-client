<template>
	<dialog class="w-72 bg-dialog border border-solid border-dialog-border text-text" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">Change Password</div>
				<button class="cursor-default w-8" :disabled="busy" @click="close">X</button>
			</header>
			<main class="px-2">
				<div class="my-1">
					<label class="flex justify-between items-center">
						<span :class="{ 'invalid-label': invalid }">Current:</span>
						<input
							ref="currentInput"
							class="w-48 bg-input text-input-text"
							type="password"
							autofocus
							:disabled="busy"
							v-model="currentPassword"
							:class="{ invalid: invalid }"
						/>
					</label>
				</div>
				<div class="my-1">
					<label class="flex justify-between items-center">
						<span :class="{ 'invalid-label': noMatch }">New:</span>
						<input
							ref="newInput"
							class="w-48 bg-input text-input-text"
							type="password"
							:disabled="busy"
							v-model="newPassword"
							:class="{ invalid: noMatch }"
						/>
					</label>
				</div>
				<div class="my-1">
					<label class="flex justify-between items-center">
						<span :class="{ 'outline-error': noMatch }">Repeat:</span>
						<input
							ref="newRepeatInput"
							class="w-48 bg-input text-input-text"
							type="password"
							:disabled="busy"
							v-model="newPasswordRepeat"
							:class="{ invalid: noMatch }"
						/>
					</label>
				</div>
				<div class="my-1">
					<span v-if="errorMessage" class="invalid-label">{{ errorMessage }}</span>
				</div>
			</main>
			<footer class="flex justify-end items-center gap-2">
				<LoadingIcon v-if="busy" class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
				<button
					v-if="!busy"
					class="bg-button-primary text-button-primary-text mr-2 mb-2 hover:opacity-80"
					@click="submitDialog"
				>
					OK
				</button>
				<button
					:disabled="busy"
					class="bg-button-secondary text-button-secondary-text mr-2 mb-2 hover:opacity-80"
					:class="{
						'text-menu-disabled': busy,
					}"
					@click="close"
				>
					Cancel
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../global'
import LoadingIcon from '../icons/system/loading_3.vue'
const dialog = ref(null)

const currentPassword = ref('')
const newPassword = ref('')
const newPasswordRepeat = ref('')
const invalid = ref(false)
const noMatch = ref(false)
const errorMessage = ref('')
const busy = ref(false)

const show = (createInRoot: boolean) => {
	invalid.value = false
	noMatch.value = false
	currentPassword.value = ''
	newPassword.value = ''
	newPasswordRepeat.value = ''
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	busy.value = true
	try {
		noMatch.value = newPassword.value !== newPasswordRepeat.value
		invalid.value = !currentPassword.value.trim()
		errorMessage.value = ''
		if (!newPassword.value.trim()) {
			noMatch.value = true
		}
		if (invalid.value) {
			errorMessage.value = 'Current password is empty'
			return
		}
		if (noMatch.value || invalid.value) {
			errorMessage.value = 'New passwords do not match'
			return
		}
		try {
			await noteManager.changePassword(currentPassword.value, newPassword.value)
			close()
		} catch (ex) {
			errorMessage.value = ex.message
		}
	} finally {
		busy.value = false
	}
}

defineExpose({
	show,
})
</script>
