<template>
	<dialog
		class="modal bg-dialog text-text desktop:border border-solid border-dialog-border backdrop-grayscale"
		ref="dialog"
		data-testid="login-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-3 content-between">
			<DialogTitle @close="cancel" :disabled="loading"
				>{{ $t('loginDialog.title') }}
				<span v-if="neededForServer" data-testid="server-indicator"
					>&nbsp;{{ $t('loginDialog.serverIndicator') }}</span
				></DialogTitle
			>
			<form @submit.prevent="login" class="mx-2 mobile:mx-8">
				<div v-if="neededForServer" class="mx-1 mb-2 max-w-72">
					{{ $t('loginDialog.serverReauth') }}
				</div>
				<div class="grid grid-cols-[5.5rem_10rem] mobile:grid-cols-[5.5rem_auto] items-center gap-2 mx-2 mb-2">
					<div>{{ $t('loginDialog.username') }}</div>
					<input
						ref="usernameInput"
						v-model="username"
						tabindex="1"
						type="text"
						class="basic-input ml-2"
						data-testid="username-input"
						autofocus
					/>
					<div>{{ $t('loginDialog.password') }}</div>
					<input
						v-model="password"
						tabindex="2"
						type="password"
						data-testid="password-input"
						class="basic-input ml-2"
						@keydown="pwKeyDown"
					/>
					<div v-if="capsLockOn" />
					<div v-if="capsLockOn" class="ml-2">{{ $t('loginDialog.capsLock') }}</div>
				</div>
				<div class="text-right pr-1" v-if="error" data-testid="login-error">
					<div class="text-error text-right">{{ $t('loginDialog.incorrectCredentials') }}</div>
				</div>
				<div v-if="loading" class="flex items-center justify-end m-1 pr-1 mt-2">
					<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block" />
					<div class="flex flex-col items-center">
						<div>{{ $t('loginDialog.pleaseWait') }}</div>
						<div v-if="longTime" class="mt-1">{{ timeElapsed }}</div>
					</div>
				</div>
				<div class="flex items-center gap-2 mt-3 mobile:mt-8 justify-end mobile:justify-center">
					<button
						tabindex="3"
						:disabled="loading || !canLogin"
						data-testid="login-button"
						class="primary"
						type="submit"
					>
						{{ $t('loginDialog.login') }}
					</button>
					<button :disabled="loading" class="secondary" type="button" data-testid="cancel-button" @click="cancel">
						{{ $t('loginDialog.cancel') }}
					</button>
				</div>
				<div
					v-if="!neededForServer && ipcClient.isAvailable"
					class="mx-1 mt-4 mb-1 max-w-72 text-text-secondary text-sm"
					data-testid="quit-hint"
				>
					{{ $t('loginDialog.quitHint') }}
				</div>
				<div v-if="neededForServer" class="mx-1 mt-4 mb-1 max-w-72 font-bold">
					{{ $t('loginDialog.whySeeingThis') }}
				</div>
				<div v-if="neededForServer" class="mx-1 mt-1 mb-2 max-w-72">
					<li>{{ $t('loginDialog.reason1') }}</li>
					<li>{{ $t('loginDialog.reason2') }}</li>
					<li>{{ $t('loginDialog.reason3') }}</li>
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
import { ipcClient, loginRequiredToGoOnline, noteManager, updateManager } from '../../global'

const dialog = ref(null)
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(false)
const timeElapsed = ref('')
const longTime = ref(false)
const showVersion = ref(false)
const capsLockOn = ref(false)
const neededForServer = ref(false)
const isOpen = ref(false)
const usernameInput = ref(null)

const canLogin = computed(() => !!username.value?.trim() && !!password.value)

const show = (neededForServerOnly: boolean = false) => {
	neededForServer.value = neededForServerOnly
	if (neededForServerOnly) {
		username.value = noteManager.state.username
	}
	isOpen.value = true
	dialog.value.showModal()
	showVersion.value = true
	setTimeout(() => {
		usernameInput.value?.focus()
	}, 0)
}

const cancel = async () => {
	loading.value = true
	if (!noteManager.state.isLoggedIn) {
		await noteManager.session.openLocal()
	}
	showVersion.value = false
	loading.value = false
	dialog.value.close()
}

const login = async () => {
	loading.value = true
	error.value = false
	await noteManager.session.logout()
	try {
		let loginUsername = username.value?.trim()
		// Allow users to enter username@mimiri.io and strip the suffix
		if (loginUsername?.toLowerCase().endsWith('@mimiri.io')) {
			loginUsername = loginUsername.slice(0, -10)
		}
		if (await noteManager.session.login(loginUsername, password.value)) {
			loading.value = false
			await noteManager.tree.loadState()
			showVersion.value = false
			if (loginRequiredToGoOnline.value) {
				loginRequiredToGoOnline.value = false
				neededForServer.value = true
				password.value = ''
			} else {
				dialog.value.close()
			}
		} else {
			error.value = true
		}
	} catch (e) {
		console.error(e)
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
