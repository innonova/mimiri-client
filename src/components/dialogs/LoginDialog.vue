<template>
	<dialog
		class="modal bg-dialog text-text desktop:border border-solid border-dialog-border backdrop-grayscale"
		ref="dialog"
	>
		<div class="grid grid-rows-[auto_1fr_auto] gap-3 content-between" data-testid="login-view">
			<DialogTitle @close="cancel" :disabled="loading || showCreate || !showCancel">Login</DialogTitle>
			<form v-on:submit.prevent="login" class="mx-2 mobile:mx-8">
				<div class="grid grid-cols-[4rem_10rem] mobile:grid-cols-[4rem_auto] items-center gap-2 mx-2 mb-2">
					<div>Username:</div>
					<input
						v-model="username"
						tabindex="1"
						type="text"
						class="basic-input ml-2"
						data-testid="username-input"
						autofocus
					/>
					<div>Password:</div>
					<input
						v-model="password"
						tabindex="2"
						type="password"
						data-testid="password-input"
						class="basic-input ml-2"
						@keydown="pwKeyDown"
					/>
					<div v-if="capsLockOn"></div>
					<div v-if="capsLockOn" class="ml-2">Caps Lock is on!</div>
				</div>
				<div class="text-right pr-1" v-if="error" data-testid="login-error">
					<div class="text-error text-right">Incorrect username or password</div>
				</div>
				<div v-if="loading" class="flex items-center justify-end m-1 pr-1 mt-2">
					<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
					<div class="flex flex-col items-center">
						<div>Please wait</div>
						<div v-if="longTime" class="mt-1">{{ timeElapsed }}</div>
					</div>
				</div>
				<div
					class="flex items-center gap-2 mt-3 mobile:mt-8"
					:class="{
						'justify-end mobile:justify-center': !showCreate,
						'justify-between': showCreate,
					}"
				>
					<a
						v-if="showCreate"
						:disabled="loading"
						@click="cancel"
						class="text-link hover:underline ml-2 cursor-pointer"
					>
						Create New
					</a>
					<button
						tabindex="3"
						:disabled="loading || !canLogin"
						data-testid="login-button"
						class="primary"
						type="submit"
					>
						Login
					</button>
					<button v-if="showCancel" :disabled="loading" class="secondary" type="button" @click="cancel">Cancel</button>
				</div>
			</form>
		</div>
	</dialog>
	<div v-if="showVersion" class="fixed bottom-4 right-4">v {{ updateManager.currentVersion }}</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
import LoadingIcon from '../../icons/loading.vue'
import { env, noteManager, updateManager } from '../../global'
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
const showVersion = ref(false)
const capsLockOn = ref(false)

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
	showVersion.value = true
}

const cancel = async () => {
	if (!noteManager.isLoggedIn) {
		// await noteManager.loginAnonymousAccount()
		if (settingsManager.showCreateOverCancel) {
			noteManager.controlPanel.expand()
			noteManager.getNoteById('settings-account' as Guid)?.select()
		}
	}
	showVersion.value = false
	dialog.value.close()
}

const login = async () => {
	loading.value = true
	error.value = false
	const isAnonymous = noteManager.isAnonymous
	const isPristine = await noteManager.isAccountPristine()
	await noteManager.logout()

	if (await noteManager.login({ username: username.value, password: password.value })) {
		if (isAnonymous) {
			settingsManager.showCreateOverCancel = isPristine
		}
		loading.value = false
		await noteManager.loadState()
		showVersion.value = false
		dialog.value.close()
	} else {
		error.value = true
	}
	loading.value = false
}

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}

defineExpose({
	show,
})
</script>
