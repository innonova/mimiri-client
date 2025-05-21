<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-username">Create Password</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="px-1 pt-3 pb-5 max-w-[20rem] leading-5">
		Choose a username and password to allow you to access your data from anywhere
	</div>
	<div class="max-w-[30rem]" data-testid="promote-account-view">
		<form class="w-96" v-on:submit.prevent="createAccount">
			<div class="p-1 m-auto flex">
				<div class="w-24 flex items-center">Username:</div>
				<div class="w-52 text-right relative md:flex">
					<input
						v-model="username"
						tabindex="1"
						type="text"
						class="bg-input text-input-text"
						autofocus
						data-testid="username-input"
					/>
					<div v-if="username" class="md:w-0 md:h-0 pt-1 overflow-visible">
						<div v-if="usernameCurrent" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<AvailableIcon class="w-6 h-6 mr-1 inline-block"></AvailableIcon> Current
						</div>
						<div v-if="usernameInProgress" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<LoadingIcon class="animate-spin w-6 h-6 mr-1 inline-block"></LoadingIcon> Checking
						</div>
						<div v-if="usernameAvailable" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<AvailableIcon class="w-6 h-6 mr-1 inline-block"></AvailableIcon> Available
						</div>
						<div v-if="usernameUnavailable" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<UnavailableIcon class="w-6 h-6 mr-1 inline-block"></UnavailableIcon> Unavailable
						</div>
						<div v-if="usernameInvalid" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<UnavailableIcon class="w-6 h-6 mr-1 inline-block"></UnavailableIcon> Invalid
						</div>
					</div>
				</div>
			</div>
			<div class="p-1 m-aut0 flex">
				<div class="w-24 flex items-center">Password:</div>
				<div class="w-52 text-right relative md:flex">
					<input
						v-model="password"
						tabindex="2"
						:type="passwordFieldType"
						class="bg-input text-input-text"
						data-testid="password-input"
					/>
					<div class="md:w-0 md:h-0 overflow-visible">
						<div class="absolute right-1 invisible md:visible" @mousedown="showPassword" @mouseup="hidePassword">
							<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-6 h-6 mt-0.5"></ShowPasswordIcon>
							<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-6 h-6 mt-0.5"></ShowingPasswordIcon>
						</div>
					</div>
					<div v-if="passwordQuality" class="md:w-0 md:h-0 overflow-visible">
						<div
							v-if="passwordQuality === 'free-access'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<FreeAccessIcon class="w-6 h-6 mr-1 inline-block"></FreeAccessIcon> Not really a password
						</div>
						<div
							v-if="passwordQuality === 'casual-use-only'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<CasualOnlyIcon class="w-6 h-6 mr-1 inline-block"></CasualOnlyIcon> Very limited security
						</div>
						<div
							v-if="passwordQuality === 'acceptable-security'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<LightSecurityIcon class="w-6 h-6 mr-1 inline-block"></LightSecurityIcon> Acceptable
						</div>
					</div>
				</div>
			</div>
			<div class="p-1 m-auto flex">
				<div class="w-24 flex items-center">Repeat:</div>
				<div class="w-52 text-right relative md:flex">
					<input
						v-model="passwordRepeat"
						tabindex="3"
						type="password"
						class="bg-input text-input-text"
						data-testid="repeat-input"
					/>
					<div v-if="password" class="md:w-0 md:h-0 pt-1 overflow-visible">
						<div v-if="passwordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<AvailableIcon class="w-6 h-6 mr-1 inline-block"></AvailableIcon> Matching
						</div>
						<div v-if="!passwordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
							<UnavailableIcon class="w-6 h-6 mr-1 inline-block"></UnavailableIcon> Not matching
						</div>
					</div>
				</div>
			</div>
			<div v-if="advancedSettingsVisible" class="p-1 m-auto flex">
				<div class="w-24 flex items-center">Iterations:</div>
				<select v-model="iterations">
					<option value="1000000">1M ({{ time1M }}) (default)</option>
					<option value="2000000">2M ({{ time2M }})</option>
					<option value="10000000">10M ({{ time10M }})</option>
					<option value="20000000">20M ({{ time20M }})</option>
				</select>
			</div>
			<div class="p-1 pt-3 pb-5 m-auto text-left">
				<div class="max-w-[20rem] leading-5">
					<label>
						<input
							type="checkbox"
							v-model="understandNoRecover"
							class="mr-1 relative top-0.5"
							data-testid="no-recover-checkbox"
						/>
						I understand that I am solely responsible for remembering my password and innonova GmbH has <b>no way</b> to
						recover my data or account if I lose my password
					</label>
				</div>
			</div>

			<div class="p-1 m-auto" v-if="errorText">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-error py-2.5 pr-1 text-right">{{ errorText }}</div>
			</div>
			<div class="p-1 m-auto" v-if="successText">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 py-2.5 pr-1 text-right">{{ successText }}</div>
			</div>

			<div class="p-1 m-auto">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-right create-account-submit">
					<div v-if="loading" class="flex items-center justify-end">
						<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						Please wait
					</div>
					<button
						v-if="!loading"
						tabindex="3"
						:disabled="loading || !canCreate"
						type="submit"
						data-testid="create-button"
					>
						Create
					</button>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { noteManager } from '../../global'
import zxcvbn from 'zxcvbn'
import { Debounce } from '../../services/helpers'
import LoadingIcon from '../../icons/loading.vue'
import AvailableIcon from '../../icons/available.vue'
import UnavailableIcon from '../../icons/unavailable.vue'
import ShowPasswordIcon from '../../icons/show-password.vue'
import ShowingPasswordIcon from '../../icons/showing-password.vue'
import FreeAccessIcon from '../../icons/free-access.vue'
import CasualOnlyIcon from '../../icons/casual-only.vue'
import LightSecurityIcon from '../../icons/light-security.vue'
import { passwordTimeFactor } from '../../services/password-generator'
import { MimerClient } from '../../services/mimer-client'
import { useEventListener } from '@vueuse/core'
import { settingsManager } from '../../services/settings-manager'
import { persistedState } from '../../services/persisted-state'
import { deObfuscate } from '../../services/helpers'

const disallowString = '!"#$:%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$:%&@'()*/=?[\]{}~\^\\`\s]/

const username = ref('')
const password = ref('')
const passwordRepeat = ref('')
const passwordCurrent = ref('')
const loading = ref(false)
const errorText = ref('')
const successText = ref('')
const usernameCurrent = ref(false)
const usernameInvalid = ref(false)
const usernameAvailable = ref(false)
const usernameUnavailable = ref(false)
const usernameInProgress = ref(false)
const passwordQuality = ref('')
const passwordMatch = ref(true)
const understandNoRecover = ref(false)
const passwordFieldType = ref('password')
const advancedSettingsVisible = ref(false)
const iterations = ref(1000000)
const time1M = computed(() => `~${passwordTimeFactor.time1M}s`)
const time2M = computed(() => `~${passwordTimeFactor.time2M}s`)
const time10M = computed(() => `~${passwordTimeFactor.time10M}s`)
const time20M = computed(() => `~${passwordTimeFactor.time20M}s`)

const emit = defineEmits(['create'])

const canSave = computed(
	() =>
		passwordMatch.value &&
		!usernameInvalid.value &&
		(usernameAvailable.value || usernameCurrent.value) &&
		!usernameUnavailable.value &&
		!usernameInProgress.value &&
		!!passwordCurrent.value,
)
const canCreate = computed(
	() =>
		understandNoRecover.value &&
		passwordMatch.value &&
		!usernameInvalid.value &&
		usernameAvailable.value &&
		!usernameUnavailable.value &&
		!usernameInProgress.value,
)

const checkUsernameDebounce = new Debounce(async () => {
	usernameCurrent.value = false
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
	if (username.value?.toLowerCase().startsWith('mimiri')) {
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
}, 500)

useEventListener(window, 'resize', async () => {})

watch(username, () => {
	checkUsernameDebounce.activate()
})

watch(password, value => {
	if (value) {
		const result = zxcvbn(value, [username.value])
		const days = result.crack_times_seconds.offline_slow_hashing_1e4_per_second / 60 / 60 / 24
		if (days < 0.0001) {
			passwordQuality.value = 'free-access'
		} else if (days < 0.1) {
			passwordQuality.value = 'casual-use-only'
		} else {
			passwordQuality.value = 'acceptable-security'
		}
		checkPasswordMatch()
	} else {
		passwordQuality.value = ''
	}
})

watch(passwordRepeat, value => {
	checkPasswordMatch()
})

const checkPasswordMatch = () => {
	passwordMatch.value = password.value === passwordRepeat.value
}

const showPassword = () => {
	passwordFieldType.value = 'text'
}

const hidePassword = () => {
	passwordFieldType.value = 'password'
}

const createAccount = async () => {
	const start = performance.now()
	if (!canCreate.value) {
		return
	}
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
			await noteManager.changeUserNameAndPassword(
				username.value,
				await deObfuscate(settingsManager.anonymousPassword),
				password.value,
				MimerClient.DEFAULT_ITERATIONS,
			)
			persistedState.storeSelectedNote(noteManager.getNoteById(noteManager.controlPanelId))
			settingsManager.anonymousUsername = undefined
			settingsManager.anonymousPassword = undefined
			settingsManager.autoLoginData = undefined
			settingsManager.autoLogin = false
			await settingsManager.save()
			location.reload()
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
	console.log('createAccount', username, password, iterations)
}
</script>
