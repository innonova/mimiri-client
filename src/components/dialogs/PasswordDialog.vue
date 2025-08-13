<template>
	<dialog
		class="bg-dialog desktop:border border-solid border-dialog-border text-text"
		ref="dialog"
		data-testid="password-dialog"
	>
		<form @submit.prevent="submitDialog">
			<div class="grid grid-rows-[auto_1fr_auto] gap-6">
				<DialogTitle @close="close">Verify that it is you</DialogTitle>
				<main class="px-2">
					<div>
						<div class="inline-block w-24">Password:</div>
						<div class="inline-block w-52 text-right mr-1.5">
							<input
								ref="input"
								v-model="password"
								tabindex="3"
								:disabled="busy"
								autofocus
								type="password"
								class="basic-input"
								data-testid="password-dialog-input"
								@keydown="pwKeyDown"
							/>
						</div>
					</div>
					<div>
						<div v-if="capsLockOn" class="inline-block w-24 items-center" />
						<div v-if="capsLockOn" class="inline-block py-1">Caps Lock is on!</div>
					</div>
					<div v-if="error" class="mt-4 text-right mr-1 text-error" data-testid="password-dialog-error">
						Incorrect Password
					</div>
				</main>
				<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
					<LoadingIcon v-if="busy" class="animate-spin w-8 h-8 mr-8 inline-block" />
					<button class="primary" v-if="!busy" type="submit" data-testid="password-dialog-ok">OK</button>
					<button class="secondary" @click="close" :disabled="busy" type="button" data-testid="password-dialog-cancel">
						Cancel
					</button>
				</footer>
			</div>
		</form>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
import { noteManager } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
const input = ref(null)
const dialog = ref(null)
const password = ref('')
const busy = ref(false)
const error = ref(false)
const capsLockOn = ref(false)

let actionCallback: (value: string) => Promise<boolean>
let okCallback: () => void
let cancelCallback: () => void

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}

const show = (ok: () => void, cancel: () => void) => {
	error.value = false
	busy.value = false
	password.value = ''
	actionCallback = undefined
	okCallback = ok
	cancelCallback = cancel
	dialog.value.showModal()
}

const showAction = (action: (value: string) => Promise<boolean>) => {
	error.value = false
	busy.value = false
	password.value = ''
	actionCallback = action
	okCallback = undefined
	cancelCallback = undefined
	dialog.value.showModal()
}

const close = () => {
	password.value = ''
	cancelCallback?.()
	dialog.value.close()
}

const submitDialog = async () => {
	error.value = false
	busy.value = true
	if (actionCallback) {
		if (await actionCallback(password.value)) {
			password.value = ''
			dialog.value.close()
		} else {
			password.value = ''
			error.value = true
			busy.value = false
		}
		return
	}
	if (await noteManager.auth.verifyPassword(password.value)) {
		busy.value = false
		password.value = ''
		okCallback()
		dialog.value.close()
	} else {
		error.value = true
		busy.value = false
		password.value = ''
		setTimeout(() => {
			input.value.focus()
		})
	}
}

defineExpose({
	show,
	showAction,
})
</script>
