<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
	<div v-if="!mimiriPlatform.isWeb || env.DEV" class="mx-auto p-10 mt-20 md:my-auto">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Create Mimiri Account</h1>
		</div>
		<form v-on:submit.prevent="createAccount">
			<div class="p-1 m-auto flex">
				<div class="w-24">Username:</div>
				<div class="w-52 text-right relative md:flex">
					<input v-model="username" tabindex="1" type="text" class="bg-input text-input-text" autofocus />
					<div v-if="username" class="md:w-0 md:h-0 overflow-visible">
						<div v-if="usernameInProgress" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<LoadingIcon class="animate-spin w-8 h-8 mr-1 inline-block"></LoadingIcon> Checking
						</div>
						<div v-if="usernameAvailable" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<AvailableIcon class="w-8 h-8 mr-1 inline-block"></AvailableIcon> Available
						</div>
						<div v-if="usernameUnavailable" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<UnavailableIcon class="w-8 h-8 mr-1 inline-block"></UnavailableIcon> Unavailable
						</div>
						<div v-if="usernameInvalid" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<UnavailableIcon class="w-8 h-8 mr-1 inline-block"></UnavailableIcon> Invalid
						</div>
					</div>
				</div>
			</div>
			<div class="p-1 m-aut0 flex">
				<div class="w-24">Password:</div>
				<div class="w-52 text-right relative md:flex">
					<input v-model="password" tabindex="2" type="password" class="bg-input text-input-text" />
					<div v-if="passwordQuality" class="md:w-0 md:h-0 overflow-visible">
						<div class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left">{{ passwordQuality }}</div>
					</div>
				</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Repeat:</div>
				<div class="inline-block w-52 text-right">
					<input v-model="passwordRepeat" tabindex="3" type="password" class="bg-input text-input-text" />
				</div>
			</div>
			<div class="p-1 m-auto" v-if="errorText">
				<div class="text-error w-64 py-2.5 text-right">{{ errorText }}</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-right create-account-submit">
					<div v-if="loading">Please wait</div>
					<button
						v-else
						tabindex="3"
						class="bg-button-primary text-button-primary-text hover:opacity-80"
						:disabled="loading || usernameUnavailable || usernameInvalid"
						type="submit"
					>
						Create
					</button>
					<div v-if="!loading" class="mt-5 mr-1 cursor-pointer hover:underline" @click="login">Login</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { env, noteManager, showCreateAccount } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'
import zxcvbn from 'zxcvbn'
import { Debounce } from '../services/helpers'
import LoadingIcon from '../icons/system/loading_3.vue'
import AvailableIcon from '../icons/system/check.vue'
import UnavailableIcon from '../icons/system/close.vue'

const disallowString = '!"#$:%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$:%&@'()*/=?[\]{}~\^\\`]/

const username = ref('')
const password = ref('')
const passwordRepeat = ref('')
const loading = ref(false)
const errorText = ref('')
const usernameInvalid = ref(false)
const usernameAvailable = ref(false)
const usernameUnavailable = ref(false)
const usernameInProgress = ref(false)
const passwordQuality = ref('')

const checkUsernameDebounce = new Debounce(async () => {
	if (username.value.trim().length === 0) {
		usernameInvalid.value = false
		usernameInProgress.value = false
		usernameAvailable.value = false
		usernameUnavailable.value = false
		return
	}
	if (disallowRegex.test(username.value)) {
		usernameInvalid.value = true
		usernameInProgress.value = false
		usernameAvailable.value = false
		usernameUnavailable.value = false
		return
	}
	usernameInvalid.value = false
	usernameInProgress.value = true
	usernameAvailable.value = false
	usernameUnavailable.value = false
	const value = username.value
	const available = await noteManager.checkUsername(value)
	if (value === username.value) {
		usernameAvailable.value = available
		usernameUnavailable.value = !available
		usernameInProgress.value = false
	}
	console.log('username available', available)
}, 500)

window.addEventListener('resize', async () => {})

watch(username, () => {
	checkUsernameDebounce.activate()
})

watch(password, value => {
	if (value) {
		const result = zxcvbn(value, [username.value])
		const days = result.crack_times_seconds.offline_slow_hashing_1e4_per_second / 60 / 60 / 24
		if (days < 0.0001) {
			passwordQuality.value = 'Free access'
		} else if (days < 0.1) {
			passwordQuality.value = 'Casual use only'
		} else if (days < 10) {
			passwordQuality.value = 'Light security'
		} else if (days < 365 * 100) {
			passwordQuality.value = 'Decent security'
		} else {
			passwordQuality.value = 'Strong security'
		}
	} else {
		passwordQuality.value = ''
	}
})

const createAccount = async () => {
	if (disallowRegex.test(username.value)) {
		errorText.value = 'Invalid username'
		return
	}
	if (!username.value) {
		errorText.value = 'Must enter a username'
		return
	}
	if (password.value !== passwordRepeat.value) {
		errorText.value = 'Passwords do not match'
		return
	}
	if (!password.value) {
		errorText.value = 'Must enter a password'
		return
	}
	errorText.value = ''
	loading.value = true
	try {
		try {
			await noteManager.createAccount(username.value, password.value)
		} catch (ex) {
			errorText.value = ex.message
			return
		}
	} finally {
		loading.value = false
	}
	if (!noteManager.isLoggedIn) {
		errorText.value = 'Unknown Error'
	} else {
		await noteManager.root.ensureChildren()
	}
}

const login = () => {
	showCreateAccount.value = false
}
</script>
