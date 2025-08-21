<template>
	<dialog
		class="modal bg-dialog text-text desktop:border border-solid border-dialog-border backdrop-grayscale"
		ref="dialog"
		data-testid="login-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-3 content-between">
			<DialogTitle @close="cancel" :disabled="loading"
				>Login <span v-if="neededForServer" data-testid="server-indicator">&nbsp;(Server)</span></DialogTitle
			>
			<form @submit.prevent="login" class="mx-2 mobile:mx-8">
				<div v-if="neededForServer" class="mx-1 mb-2 max-w-72">
					Please enter your username and password to reauthenticate with the server.
				</div>
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
					<div v-if="capsLockOn" />
					<div v-if="capsLockOn" class="ml-2">Caps Lock is on!</div>
				</div>
				<div class="text-right pr-1" v-if="error" data-testid="login-error">
					<div class="text-error text-right">Incorrect username or password</div>
				</div>
				<div v-if="loading" class="flex items-center justify-end m-1 pr-1 mt-2">
					<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block" />
					<div class="flex flex-col items-center">
						<div>Please wait</div>
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
						Login
					</button>
					<button :disabled="loading" class="secondary" type="button" data-testid="cancel-button" @click="cancel">
						Cancel
					</button>
				</div>
				<div v-if="neededForServer" class="mx-1 mt-4 mb-1 max-w-72 font-bold">Why are you seeing this?</div>
				<div v-if="neededForServer" class="mx-1 mt-1 mb-2 max-w-72">
					<li>You changed password on another device</li>
					<li>You updated from a version prior to 2.5.0</li>
					<li>Something unexpected went wrong</li>
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
import { loginRequiredToGoOnline, noteManager, updateManager } from '../../global'

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

const canLogin = computed(() => !!username.value?.trim() && !!password.value)

const show = (neededForServerOnly: boolean = false) => {
	neededForServer.value = neededForServerOnly
	if (neededForServerOnly) {
		username.value = noteManager.state.username
	}
	isOpen.value = true
	dialog.value.showModal()
	showVersion.value = true
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

	if (await noteManager.session.login(username.value?.trim(), password.value)) {
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
	loading.value = false
}

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}

defineExpose({
	show,
})
</script>
