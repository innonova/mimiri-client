<template>
	<dialog class="modal bg-dialog text-text border border-solid border-dialog-border backdrop-grayscale" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="cancel" :disabled="loading || showCreate">Login</DialogTitle>
			<form v-on:submit.prevent="login">
				<main class="pl-6 pr-2">
					<div class="flex w-[21rem] items-center justify-between m-1 pr-5">
						<div>Username:</div>
						<input
							v-model="username"
							tabindex="1"
							type="text"
							class="bg-input text-input-text"
							data-testid="username-input"
							autofocus
						/>
					</div>
					<div class="flex w-[21rem] items-center justify-between m-1 pr-5 pb-2">
						<div>Password:</div>
						<input
							v-model="password"
							tabindex="2"
							type="password"
							data-testid="password-input"
							class="bg-input text-input-text"
						/>
					</div>
					<div class="w-[21rem] m-1 pr-5" v-if="error" data-testid="login-error">
						<div class="text-error text-right">Incorrect username or password</div>
					</div>
					<div v-if="loading" class="flex items-center justify-end w-[21rem] m-1 pr-5">
						<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						<div class="flex flex-col items-center">
							<div>Please wait</div>
							<div v-if="longTime" class="mt-1">{{ timeElapsed }}</div>
						</div>
					</div>
				</main>
				<footer class="pl-6 pr-2 pt-2">
					<div
						class="flex items-center gap-2 w-[21rem] m-1 pr-5"
						:class="{
							'justify-end': !showCreate,
							'justify-between': showCreate,
						}"
					>
						<button v-if="showCreate" :disabled="loading" class="secondary w-28" type="button" @click="cancel">
							Create New
						</button>
						<button tabindex="3" :disabled="loading || !canLogin" data-testid="login-button" type="submit">
							Login
						</button>
						<button v-if="showCancel" :disabled="loading" class="secondary" type="button" @click="cancel">
							Cancel
						</button>
					</div>
				</footer>
			</form>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
import LoadingIcon from '../../icons/loading.vue'
import { env, noteManager } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import { mimiriPlatform } from '../../services/mimiri-platform'
import type { Guid } from '../../services/types/guid'
const dialog = ref(null)
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(false)
const timeElapsed = ref('')
const longTime = ref(false)
const isInitial = ref(false)

const showCreate = computed(
	() => isInitial.value && settingsManager.showCreateOverCancel && (!mimiriPlatform.isWeb || env.DEV),
)
const showCancel = computed(
	() => (!isInitial.value || !settingsManager.showCreateOverCancel) && (!mimiriPlatform.isWeb || env.DEV),
)

const canLogin = computed(() => !!username.value && !!password.value)

const show = (initial: boolean = false) => {
	isInitial.value = initial
	dialog.value.showModal()
}

const cancel = async () => {
	if (!noteManager.isLoggedIn) {
		await noteManager.loginAnonymousAccount()
		if (settingsManager.showCreateOverCancel) {
			noteManager.controlPanel.expand()
			noteManager.getNoteById('settings-create-account' as Guid)?.select()
		}
	}
	dialog.value.close()
}

const login = async () => {
	loading.value = true
	error.value = false
	const isAnonymous = noteManager.isAnonymous
	const isPristine = await noteManager.isAccountPristine()
	noteManager.logout()
	if (await noteManager.login({ username: username.value, password: password.value })) {
		if (isAnonymous) {
			settingsManager.showCreateOverCancel = isPristine
		}
		loading.value = false
		await noteManager.loadState()
		dialog.value.close()
	} else {
		error.value = true
	}
	loading.value = false
}

defineExpose({
	show,
})
</script>
