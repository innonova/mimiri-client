<template>
	<TabBar @selected="tabSelected" :items="['Generate', 'Create']"></TabBar>
	<div v-if="passwordMode === 'generate'" class="max-w-110 mr-2" data-testid="settings-view-password">
		<PasswordGenerator ref="passwordGenerator" mode="mimiri" @password="onPasswordGenerated"></PasswordGenerator>
		<div class="p-1 mt-8 m-aut0 flex">
			<div class="w-24 flex items-center">Generated:</div>
			<div class="w-52 text-right relative flex">
				<input v-model="generatedPassword" tabindex="2" type="text" class="basic-input" />
				<div class="w-0 h-0 pt-1 overflow-visible select-none">
					<RefreshIcon class="w-5 h-5 ml-2" @click="regeneratePassword"></RefreshIcon>
				</div>
			</div>
		</div>
		<div class="p-1 m-auto flex">
			<div class="w-24 flex items-center">Repeat:</div>
			<div class="w-52 relative md:flex">
				<input
					v-model="generatedPasswordRepeat"
					tabindex="3"
					type="password"
					class="basic-input"
					@keydown="pwKeyDown"
				/>
				<div v-if="generatedPassword" class="md:w-0 md:h-0 pt-0.5 overflow-visible">
					<div v-if="generatedPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0.5">
						<AvailableIcon class="w-5 h-5 mr-1 inline-block"></AvailableIcon> Matching
					</div>
					<div v-if="!generatedPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0.5">
						<UnavailableIcon class="w-5 h-5 mr-1 inline-block"></UnavailableIcon> Not matching
					</div>
				</div>
			</div>
		</div>
		<div class="px-1 m-auto flex">
			<div v-if="capsLockOn" class="w-24 flex items-center"></div>
			<div v-if="capsLockOn" class="py-1">Caps Lock is on!</div>
		</div>
	</div>
	<div v-if="passwordMode === 'create'">
		<div class="p-1 m-aut0 flex">
			<div class="w-24 flex items-center">New:</div>
			<div class="w-52 relative md:flex">
				<input
					v-model="createdPassword"
					tabindex="2"
					:type="passwordFieldType"
					class="basic-input"
					data-testid="password-input"
					@keydown="pwKeyDown"
				/>
				<div class="md:w-0 md:h-0 overflow-visible">
					<div class="absolute right-2 invisible md:visible" @mousedown="showPassword" @mouseup="hidePassword">
						<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-5 h-5 mt-1"></ShowPasswordIcon>
						<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-5 h-5 mt-1"></ShowingPasswordIcon>
					</div>
				</div>
				<div v-if="passwordQuality" class="md:w-0 md:h-0 overflow-visible">
					<div
						v-if="passwordQuality === 'free-access'"
						class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
					>
						<FreeAccessIcon class="w-5 h-5 mr-1 inline-block"></FreeAccessIcon> Not really a password
					</div>
					<div
						v-if="passwordQuality === 'casual-use-only'"
						class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
					>
						<CasualOnlyIcon class="w-5 h-5 mr-1 inline-block"></CasualOnlyIcon> Very limited security
					</div>
					<div
						v-if="passwordQuality === 'acceptable-security'"
						class="flex items-center w-52 h-7 md:ml-2 mt-1.5 md:mt-0 text-left"
					>
						<LightSecurityIcon class="w-5 h-5 mr-1 inline-block"></LightSecurityIcon> Acceptable
					</div>
				</div>
			</div>
		</div>
		<div class="p-1 m-auto flex">
			<div class="w-24 flex items-center">Repeat:</div>
			<div class="w-52 relative md:flex">
				<input
					v-model="createdPasswordRepeat"
					tabindex="3"
					type="password"
					class="basic-input"
					data-testid="repeat-input"
					@keydown="pwKeyDown"
				/>
				<div v-if="createdPassword" class="md:w-0 md:h-0 pt-1 overflow-visible">
					<div v-if="createdPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0.5">
						<AvailableIcon class="w-5 h-5 mr-1 inline-block"></AvailableIcon> Matching
					</div>
					<div v-if="!createdPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0.5">
						<UnavailableIcon class="w-5 h-5 mr-1 inline-block"></UnavailableIcon> Not matching
					</div>
				</div>
			</div>
		</div>
		<div class="px-1 m-auto flex">
			<div v-if="capsLockOn" class="w-24 flex items-center"></div>
			<div v-if="capsLockOn" class="py-1">Caps Lock is on!</div>
		</div>
		<div class="p-1 m-auto flex">
			<div class="w-24 flex items-center">Iterations:</div>
			<select v-model="iterations">
				<option value="1000000">1M ({{ time1M }}) (default)</option>
				<option value="2000000">2M ({{ time2M }})</option>
				<option value="10000000">10M ({{ time10M }})</option>
				<option value="20000000">20M ({{ time20M }})</option>
			</select>
		</div>
	</div>
	<div class="mt-10 max-w-110 mr-2">
		<hr />
		<div class="w-full flex justify-end mt-2 gap-2">
			<button class="primary" :disabled="!canSave" @click="save">Save</button>
			<button class="secondary" @click="close">Close</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import zxcvbn from 'zxcvbn'
import { computed, ref, watch } from 'vue'
import { noteManager, passwordDialog } from '../../global'
import ShowPasswordIcon from '../../icons/show-password.vue'
import ShowingPasswordIcon from '../../icons/showing-password.vue'
import PasswordGenerator from '../elements/PasswordGenerator.vue'
import { passwordTimeFactor } from '../../services/password-generator'
import RefreshIcon from '../../icons/refresh.vue'
import AvailableIcon from '../../icons/available.vue'
import UnavailableIcon from '../../icons/unavailable.vue'
import FreeAccessIcon from '../../icons/free-access.vue'
import CasualOnlyIcon from '../../icons/casual-only.vue'
import LightSecurityIcon from '../../icons/light-security.vue'
import TabBar from '../elements/TabBar.vue'

const emit = defineEmits(['close'])

const passwordGenerator = ref(null)
const generatedPassword = ref('')
const generatedIterations = ref(1000000)
const generatedPasswordRepeat = ref('')
const generatedPasswordMatch = ref(false)
const createdPassword = ref('')
const createdPasswordRepeat = ref('')
const createdPasswordMatch = ref(false)
const passwordFieldType = ref('password')
const passwordMode = ref('generate')
const passwordQuality = ref('')
const iterations = ref(1000000)
const passwordIsWeak = ref(false)
const capsLockOn = ref(false)
const canSave = computed(
	() =>
		(passwordMode.value === 'generate' && generatedPasswordMatch.value && generatedPassword.value) ||
		(passwordMode.value === 'create' && createdPasswordMatch.value && createdPassword.value),
)
const time1M = computed(() => `~${passwordTimeFactor.time1M}s`)
const time2M = computed(() => `~${passwordTimeFactor.time2M}s`)
const time10M = computed(() => `~${passwordTimeFactor.time10M}s`)
const time20M = computed(() => `~${passwordTimeFactor.time20M}s`)

watch(createdPassword, value => {
	if (value) {
		const result = zxcvbn(value, [noteManager.username])
		const days = result.crack_times_seconds.offline_slow_hashing_1e4_per_second / 60 / 60 / 24
		if (days < 0.0001) {
			passwordQuality.value = 'free-access'
			passwordIsWeak.value = true
		} else if (days < 0.1) {
			passwordQuality.value = 'casual-use-only'
			passwordIsWeak.value = true
		} else {
			passwordQuality.value = 'acceptable-security'
			passwordIsWeak.value = false
		}
		createdPasswordMatch.value = createdPassword.value === createdPasswordRepeat.value
	} else {
		passwordQuality.value = ''
	}
})
watch([createdPassword, createdPasswordRepeat], value => {
	createdPasswordMatch.value = createdPassword.value === createdPasswordRepeat.value
})

watch([generatedPassword, generatedPasswordRepeat], value => {
	generatedPasswordMatch.value = generatedPassword.value === generatedPasswordRepeat.value
})

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}

const showPassword = () => {
	passwordFieldType.value = 'text'
}

const hidePassword = () => {
	passwordFieldType.value = 'password'
}

const tabGenerateClick = () => {
	passwordMode.value = 'generate'
}

const tabCreateClick = () => {
	passwordMode.value = 'create'
}

const tabSelected = item => {
	if (item === 'Create') {
		passwordMode.value = 'create'
	} else {
		passwordMode.value = 'generate'
	}
}

const regeneratePassword = () => {
	passwordGenerator.value.regeneratePassword()
}

const onPasswordGenerated = (pwd: string, iterations: number) => {
	generatedPassword.value = pwd
	generatedIterations.value = iterations
}

const save = () => {
	if (canSave.value) {
		passwordDialog.value.showAction(async pwd => {
			try {
				if (passwordMode.value === 'generate') {
					await noteManager.changeUserNameAndPassword(
						noteManager.username,
						pwd,
						generatedPassword.value,
						generatedIterations.value,
					)
					generatedPasswordRepeat.value = ''
				} else {
					await noteManager.changeUserNameAndPassword(
						noteManager.username,
						pwd,
						createdPassword.value,
						iterations.value,
					)
					createdPassword.value = ''
					createdPasswordRepeat.value = ''
				}
				return true
			} catch {}
			return false
		})
	}
}

const close = () => {
	emit('close')
}
</script>
