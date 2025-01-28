<template>
	<div class="flex select-none">
		<div
			class="py-2 px-4"
			:class="{
				'bg-info cursor-default': passwordMode === 'generate',
				'cursor-pointer': passwordMode !== 'generate',
			}"
			@click="tabGenerateClick"
		>
			Generate
		</div>
		<div
			class="py-2 px-4"
			:class="{
				'bg-info cursor-default': passwordMode === 'create',
				'cursor-pointer': passwordMode !== 'create',
			}"
			@click="tabCreateClick"
		>
			Create
		</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<div v-if="passwordMode === 'generate'">
		<PasswordGenerator ref="passwordGenerator" mode="mimiri" @password="onPasswordGenerated"></PasswordGenerator>
		<div class="p-1 mt-8 m-aut0 flex">
			<div class="w-24 flex items-center">Generated:</div>
			<div class="w-52 text-right relative flex">
				<input v-model="generatedPassword" tabindex="2" type="text" class="bg-input text-input-text" />
				<div class="w-0 h-0 pt-1 overflow-visible">
					<RefreshIcon class="w-6 h-6 ml-2" @click="regeneratePassword"></RefreshIcon>
				</div>
			</div>
		</div>
		<div class="p-1 m-auto flex">
			<div class="w-24 flex items-center">Repeat:</div>
			<div class="w-52 text-right relative md:flex">
				<input v-model="generatedPasswordRepeat" tabindex="3" type="password" class="bg-input text-input-text" />
				<div v-if="generatedPassword" class="md:w-0 md:h-0 pt-1 overflow-visible">
					<div v-if="generatedPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
						<AvailableIcon class="w-6 h-6 mr-1 inline-block"></AvailableIcon> Matching
					</div>
					<div v-if="!generatedPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
						<UnavailableIcon class="w-6 h-6 mr-1 inline-block"></UnavailableIcon> Not matching
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-if="passwordMode === 'create'">
		<div class="p-1 m-aut0 flex">
			<div class="w-24 flex items-center">New:</div>
			<div class="w-52 text-right relative md:flex">
				<input
					v-model="createdPassword"
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
					v-model="createdPasswordRepeat"
					tabindex="3"
					type="password"
					class="bg-input text-input-text"
					data-testid="repeat-input"
				/>
				<div v-if="createdPassword" class="md:w-0 md:h-0 pt-1 overflow-visible">
					<div v-if="createdPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
						<AvailableIcon class="w-6 h-6 mr-1 inline-block"></AvailableIcon> Matching
					</div>
					<div v-if="!createdPasswordMatch" class="flex items-center w-52 md:ml-2 mt-1.5 md:mt-0">
						<UnavailableIcon class="w-6 h-6 mr-1 inline-block"></UnavailableIcon> Not matching
					</div>
				</div>
			</div>
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
	<div class="mt-10 w-full">
		<hr />
		<div class="w-full flex justify-end mt-2">
			<button :disabled="!canSave" @click="save">Save</button>
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
