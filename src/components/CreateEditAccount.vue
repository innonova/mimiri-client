<template>
	<div
		v-if="showCreateEditAccount && (!mimiriPlatform.isWeb || env.DEV)"
		id="title-bar"
		class="w-full h-[36px] pl-px select-none drag"
	></div>
	<div v-if="showCreateEditAccount && (!mimiriPlatform.isWeb || env.DEV)" class="mx-auto p-10 mt-20 md:my-auto">
		<div class="mb-14">
			<h1 v-if="!authenticated" class="text-center font-bold text-size-header">Create Mimiri Account</h1>
			<h1 v-if="authenticated" class="text-center font-bold text-size-header">Edit Account</h1>
		</div>
		<form v-on:submit.prevent="createAccount">
			<div v-if="authenticated" class="p-1 pt-7 pb-3 m-aut0">
				<div>Change username:</div>
			</div>
			<div class="p-1 m-auto flex">
				<div class="w-24 flex items-center">Username:</div>
				<div class="w-52 text-right relative md:flex">
					<input v-model="username" tabindex="1" type="text" class="bg-input text-input-text" autofocus />
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
			<div v-if="authenticated" class="p-1 pt-7 pb-3 m-aut0 leading-6">
				<div>Change password:</div>
				<div>(Leave empty for no change)</div>
			</div>
			<div class="p-1 m-aut0 flex">
				<div class="w-24 flex items-center">New:</div>
				<div class="w-52 text-right relative md:flex">
					<input v-model="password" tabindex="2" :type="passwordFieldType" class="bg-input text-input-text" />
					<div class="md:w-0 md:h-0 overflow-visible">
						<div class="absolute right-1" @mousedown="showPassword" @mouseup="hidePassword">
							<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-6 h-6 mt-1"></ShowPasswordIcon>
							<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-6 h-6 mt-1"></ShowingPasswordIcon>
						</div>
					</div>
					<div v-if="passwordQuality" class="md:w-0 md:h-0 overflow-visible">
						<div
							v-if="passwordQuality === 'free-access'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<FreeAccessIcon class="w-6 h-6 mr-1 inline-block"></FreeAccessIcon> Free access
						</div>
						<div
							v-if="passwordQuality === 'casual-use-only'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<CasualOnlyIcon class="w-6 h-6 mr-1 inline-block"></CasualOnlyIcon> Casual use only
						</div>
						<div
							v-if="passwordQuality === 'light-security'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<LightSecurityIcon class="w-6 h-6 mr-1 inline-block"></LightSecurityIcon> Light security
						</div>
						<div
							v-if="passwordQuality === 'decent-security'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<DecentSecurityIcon class="w-6 h-6 mr-1 inline-block"></DecentSecurityIcon> Decent security
						</div>
						<div
							v-if="passwordQuality === 'strong-security'"
							class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
						>
							<StrongSecurityIcon class="w-6 h-6 mr-1 inline-block"></StrongSecurityIcon> Strong security
						</div>
					</div>
				</div>
			</div>
			<div class="p-1 m-auto flex">
				<div class="w-24 flex items-center">Repeat:</div>
				<div class="w-52 text-right relative md:flex">
					<input v-model="passwordRepeat" tabindex="3" type="password" class="bg-input text-input-text" />
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
			<div v-if="authenticated" class="p-1 pt-12 pb-3 m-aut0">
				<div>Verify that it's you:</div>
			</div>
			<div v-if="authenticated" class="p-1 pb-2 m-auto">
				<div class="inline-block w-24">Password:</div>
				<div class="inline-block w-52 text-right">
					<input v-model="passwordCurrent" tabindex="3" type="password" class="bg-input text-input-text" />
				</div>
			</div>

			<div v-if="!authenticated" class="p-1 pt-5 m-auto text-left">
				<label>
					<input type="checkbox" v-model="acceptTerms" class="mr-1 relative top-0.5" />
					I have read the
				</label>
				<a href="https://mimiri.io/terms" target="_blank">Terms & Conditions</a>
			</div>
			<div v-if="!authenticated" class="p-1 m-auto text-left">
				<label>
					<input type="checkbox" v-model="readPrivacy" class="mr-1 relative top-0.5" />
					I have read the
				</label>
				<a href="https://mimiri.io/privacy" target="_blank">Privacy Policy</a>
			</div>
			<div v-if="!authenticated" class="p-1 pb-5 m-auto text-left">
				<div class="max-w-96 leading-5">
					<label>
						<input type="checkbox" v-model="understandNoRecover" class="mr-1 relative top-0.5" />
						I understand that I am solely responsible for remembering my password and innonova GmbH has <b>no way</b> to
						recover my data or account if I lose my password
					</label>
				</div>
			</div>

			<div class="p-1 m-auto" v-if="errorText">
				<div class="text-error py-2.5 pr-1 text-right">{{ errorText }}</div>
			</div>
			<div class="p-1 m-auto" v-if="successText">
				<div class="py-2.5 pr-1 text-right">{{ successText }}</div>
			</div>

			<div class="p-1 m-auto">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-right create-account-submit">
					<div v-if="loading" class="flex items-center justify-end">
						<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						Please wait
					</div>
					<button
						v-if="!loading && !authenticated"
						tabindex="3"
						class="bg-button-primary hover:opacity-80"
						:disabled="loading || !canCreate"
						:class="{
							'text-button-disabled-text': loading || !canCreate,
							'text-button-primary-text': !loading && canCreate,
						}"
						type="submit"
					>
						Create
					</button>
					<button
						v-if="!loading && authenticated"
						tabindex="3"
						class="bg-button-primary hover:opacity-80"
						:disabled="loading || !canSave"
						:class="{
							'text-button-disabled-text': loading || !canSave,
							'text-button-primary-text': !loading && canSave,
						}"
						@click="save"
					>
						Save
					</button>
					<button
						v-if="!loading && authenticated"
						tabindex="3"
						class="bg-button-primary text-button-primary-text hover:opacity-80 ml-2"
						:disabled="loading"
						@click="cancel"
					>
						Close
					</button>
					<div v-if="!loading && !authenticated" class="mt-5 mr-1 cursor-pointer hover:underline" @click="login">
						Login
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { env, noteManager, showCreateEditAccount } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'
import zxcvbn from 'zxcvbn'
import { Debounce } from '../services/helpers'
import LoadingIcon from '../icons/system/loading_3.vue'
import AvailableIcon from '../icons/system/check.vue'
import UnavailableIcon from '../icons/system/close.vue'
import ShowPasswordIcon from '../icons/system/eye_close.vue'
import ShowingPasswordIcon from '../icons/system/eye.vue'
import FreeAccessIcon from '../icons/emoji/sad.vue'
import CasualOnlyIcon from '../icons/emoji/confused.vue'
import LightSecurityIcon from '../icons/emoji/emoji.vue'
import DecentSecurityIcon from '../icons/emoji/happy.vue'
import StrongSecurityIcon from '../icons/emoji/angel.vue'

const disallowString = '!"#$:%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$:%&@'()*/=?[\]{}~\^\\`]/

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
const acceptTerms = ref(false)
const readPrivacy = ref(false)
const understandNoRecover = ref(false)
const passwordFieldType = ref('password')

const authenticated = computed(() => noteManager.state.authenticated)

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
		acceptTerms.value &&
		readPrivacy.value &&
		understandNoRecover.value &&
		passwordMatch.value &&
		!usernameInvalid.value &&
		usernameAvailable.value &&
		!usernameUnavailable.value &&
		!usernameInProgress.value,
)

const checkUsernameDebounce = new Debounce(async () => {
	if (noteManager.state.authenticated && username.value === noteManager.username) {
		usernameCurrent.value = true
		usernameInvalid.value = false
		usernameInProgress.value = false
		usernameAvailable.value = false
		usernameUnavailable.value = false
		return
	}
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
			passwordQuality.value = 'free-access'
		} else if (days < 0.1) {
			passwordQuality.value = 'casual-use-only'
		} else if (days < 10) {
			passwordQuality.value = 'light-security'
		} else if (days < 365 * 100) {
			passwordQuality.value = 'decent-security'
		} else {
			passwordQuality.value = 'strong-security'
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

const save = async () => {
	if (!canSave.value) {
		return
	}
	if (!password.value && username.value === noteManager.username) {
		successText.value = 'No Changes'
		return false
	}
	successText.value = ''
	errorText.value = ''
	loading.value = true
	try {
		try {
			await noteManager.changeUserNameAndPassword(username.value, passwordCurrent.value, password.value)
			successText.value = 'Changes Saved'
		} catch (ex) {
			errorText.value = ex.message
			return
		}
	} finally {
		loading.value = false
	}
}

const cancel = async () => {
	password.value = ''
	passwordRepeat.value = ''
	passwordCurrent.value = ''
	showCreateEditAccount.value = false
}

const createAccount = async () => {
	if (noteManager.state.authenticated) {
		return
	}
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
			await noteManager.createAccount(username.value, password.value)
			showCreateEditAccount.value = false
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
	showCreateEditAccount.value = false
}

const show = () => {
	if (noteManager.state.authenticated) {
		username.value = noteManager.username
		usernameCurrent.value = true
		password.value = ''
		passwordRepeat.value = ''
		passwordCurrent.value = ''
	}
	showCreateEditAccount.value = true
}

defineExpose({
	show,
})
</script>
