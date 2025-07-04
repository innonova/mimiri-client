<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Create Account']"></TabBar>
		<div class="overflow-y-auto pb-10">
			<div class="px-1 pt-3 pb-5 max-w-[20rem] leading-5">
				Choose a username and password to allow you to access your data from anywhere
			</div>
			<div class="max-w-110" data-testid="promote-account-view">
				<form class="w-96" v-on:submit.prevent="createAccount">
					<div class="grid grid-cols-[5rem_12rem] gap-3 items-baseline">
						<div class="flex items-center">Username:</div>
						<UsernameInput :display-current="false" :check-username="true" @changed="usernameChanged"></UsernameInput>
						<div class="flex items-center">Password:</div>
						<div class="text-right relative desktop:flex">
							<input
								v-model="password"
								tabindex="2"
								:type="passwordFieldType"
								class="basic-input"
								data-testid="password-input"
								@keydown="pwKeyDown"
							/>
							<div class="desktop:w-0 desktop:h-0 overflow-visible">
								<div
									class="absolute right-2 invisible desktop:visible"
									@mousedown="showPassword"
									@mouseup="hidePassword"
								>
									<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-5 h-5 mt-1"></ShowPasswordIcon>
									<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-5 h-5 mt-1"></ShowingPasswordIcon>
								</div>
							</div>
							<div v-if="passwordQuality" class="desktop:w-0 desktop:h-0 overflow-visible">
								<div
									v-if="passwordQuality === 'free-access'"
									class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
								>
									<FreeAccessIcon class="w-5 h-5 mr-1 inline-block"></FreeAccessIcon> Not really a password
								</div>
								<div
									v-if="passwordQuality === 'casual-use-only'"
									class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
								>
									<CasualOnlyIcon class="w-5 h-5 mr-1 inline-block"></CasualOnlyIcon> Very limited security
								</div>
								<div
									v-if="passwordQuality === 'acceptable-security'"
									class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
								>
									<LightSecurityIcon class="w-5 h-5 mr-1 inline-block"></LightSecurityIcon> Acceptable
								</div>
							</div>
						</div>
						<div class="flex items-center">Repeat:</div>
						<div class="text-right relative desktop:flex">
							<input
								v-model="passwordRepeat"
								tabindex="3"
								type="password"
								class="basic-input"
								data-testid="repeat-input"
								@keydown="pwKeyDown"
							/>
							<div v-if="password" class="desktop:w-0 desktop:h-0 pt-0.5 overflow-visible">
								<div v-if="passwordMatch" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
									<AvailableIcon class="w-5 h-5 mr-1 inline-block"></AvailableIcon> Matching
								</div>
								<div v-if="!passwordMatch" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
									<UnavailableIcon class="w-5 h-5 mr-1 inline-block"></UnavailableIcon> Not matching
								</div>
							</div>
						</div>
						<div v-if="capsLockOn"></div>
						<div v-if="capsLockOn">Caps Lock is on!</div>
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
								I understand that I am solely responsible for remembering my password and innonova GmbH has
								<b>no way</b> to recover my data or account if I lose my password
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
								class="primary"
								type="submit"
								data-testid="create-button"
							>
								Create
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { noteManager } from '../../global'
import zxcvbn from 'zxcvbn'
import LoadingIcon from '../../icons/loading.vue'
import AvailableIcon from '../../icons/available.vue'
import UnavailableIcon from '../../icons/unavailable.vue'
import ShowPasswordIcon from '../../icons/show-password.vue'
import ShowingPasswordIcon from '../../icons/showing-password.vue'
import FreeAccessIcon from '../../icons/free-access.vue'
import CasualOnlyIcon from '../../icons/casual-only.vue'
import LightSecurityIcon from '../../icons/light-security.vue'
import { passwordTimeFactor } from '../../services/password-generator'
import { settingsManager } from '../../services/settings-manager'
import { persistedState } from '../../services/persisted-state'
import { deObfuscate } from '../../services/helpers'
import UsernameInput from '../elements/UsernameInput.vue'
import type { Guid } from '../../services/types/guid'
import TabBar from '../elements/TabBar.vue'
import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'

const disallowString = '!"#$:%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$:%&@'()*/=?[\]{}~\^\\`\s]/

const password = ref('')
const passwordRepeat = ref('')
const loading = ref(false)
const errorText = ref('')
const successText = ref('')
const passwordQuality = ref('')
const passwordMatch = ref(true)
const understandNoRecover = ref(false)
const passwordFieldType = ref('password')
const advancedSettingsVisible = ref(false)
const capsLockOn = ref(false)
const iterations = ref(1000000)
const time1M = computed(() => `~${passwordTimeFactor.time1M}s`)
const time2M = computed(() => `~${passwordTimeFactor.time2M}s`)
const time10M = computed(() => `~${passwordTimeFactor.time10M}s`)
const time20M = computed(() => `~${passwordTimeFactor.time20M}s`)

const emit = defineEmits(['create'])

const usernameValid = ref(false)
let newUsername = ''

const usernameChanged = (valid: boolean, username: string) => {
	usernameValid.value = valid
	newUsername = username
}

const canCreate = computed(() => understandNoRecover.value && passwordMatch.value && usernameValid.value)

watch(password, value => {
	if (value) {
		const result = zxcvbn(value, [newUsername])
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

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}

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
	if (!canCreate.value) {
		return
	}
	if (disallowRegex.test(newUsername)) {
		errorText.value = 'Invalid username'
		return
	}
	if (!newUsername) {
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
			await noteManager.auth.changeUserNameAndPassword(
				newUsername,
				await deObfuscate(settingsManager.anonymousPassword),
				password.value,
				DEFAULT_ITERATIONS,
			)
			persistedState.storeSelectedNote(noteManager.tree.getNoteById('settings-account' as Guid))
			settingsManager.anonymousUsername = undefined
			settingsManager.anonymousPassword = undefined
			settingsManager.autoLoginData = undefined
			settingsManager.autoLogin = false
			await settingsManager.waitForSaveComplete()
			location.reload()
		} catch (ex) {
			errorText.value = ex.message
			return
		}
	} finally {
		loading.value = false
	}
	if (!noteManager.state.isLoggedIn) {
		errorText.value = 'Unknown Error'
	} else {
		await noteManager.tree.root().ensureChildren()
	}
}
</script>
