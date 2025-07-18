<template>
	<div class="text-right relative desktop:flex">
		<input
			v-model="password"
			tabindex="2"
			:type="passwordFieldType"
			class="basic-input"
			data-testid="password-input"
			@keydown="pwKeyDown"
		>
		<div class="desktop:w-0 desktop:h-0 overflow-visible">
			<div class="absolute right-2 invisible desktop:visible" @mousedown="showPassword" @mouseup="hidePassword">
				<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-5 h-5 mt-1" />
				<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-5 h-5 mt-1" />
			</div>
		</div>
		<div v-if="passwordQuality" class="desktop:w-0 desktop:h-0 overflow-visible">
			<div
				v-if="passwordQuality === 'free-access'"
				class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
			>
				<FreeAccessIcon class="w-5 h-5 mr-1 inline-block" /> Not really a password
			</div>
			<div
				v-if="passwordQuality === 'casual-use-only'"
				class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
			>
				<CasualOnlyIcon class="w-5 h-5 mr-1 inline-block" /> Very limited security
			</div>
			<div
				v-if="passwordQuality === 'acceptable-security'"
				class="flex items-center w-52 h-7 desktop:ml-2 mt-1.5 desktop:mt-0 text-left"
			>
				<LightSecurityIcon class="w-5 h-5 mr-1 inline-block" /> Acceptable
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import zxcvbn from 'zxcvbn'
import ShowPasswordIcon from '../../icons/show-password.vue'
import ShowingPasswordIcon from '../../icons/showing-password.vue'
import FreeAccessIcon from '../../icons/free-access.vue'
import CasualOnlyIcon from '../../icons/casual-only.vue'
import LightSecurityIcon from '../../icons/light-security.vue'

const password = defineModel<string>('value')
const passwordFieldType = ref('password')
const capsLockOn = ref(false)
const passwordQuality = ref('')
const newUsername = ref('')

watch(password, value => {
	if (value) {
		const result = zxcvbn(value, [newUsername.value])
		const days = result.crack_times_seconds.offline_slow_hashing_1e4_per_second / 60 / 60 / 24
		if (days < 0.0001) {
			passwordQuality.value = 'free-access'
		} else if (days < 0.1) {
			passwordQuality.value = 'casual-use-only'
		} else {
			passwordQuality.value = 'acceptable-security'
		}
		// checkPasswordMatch()
	} else {
		passwordQuality.value = ''
	}
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
</script>
