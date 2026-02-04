<template>
	<div class="relative desktop:flex">
		<input
			v-model="username"
			@input="filterUsername"
			tabindex="1"
			type="text"
			class="basic-input"
			autofocus
			data-testid="username-input"
		/>
		<span v-if="suffix" class="text-text-secondary ml-1 flex items-center">{{ suffix }}</span>
		<div v-if="username" class="desktop:w-0 desktop:h-0 pt-0.5 overflow-visible" data-testid="username-status">
			<div v-if="usernameCurrent && checkUsername" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<AvailableIcon class="w-5 h-5 mr-1 inline-block" data-testid="username-current" /> Current
			</div>
			<div v-if="usernameInProgress && checkUsername" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0">
				<LoadingIcon class="animate-spin w-5 h-5 mr-1 inline-block" data-testid="username-checking" />
				Checking
			</div>
			<div v-if="usernameAvailable && checkUsername" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<AvailableIcon class="w-5 h-5 mr-1 inline-block" data-testid="username-available" /> Available
			</div>
			<div
				v-if="usernameUnavailable && checkUsername"
				class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5"
			>
				<UnavailableIcon class="w-5 h-5 mr-1 inline-block" data-testid="username-unavailable" />
				Unavailable
			</div>
			<div v-if="usernameInvalid" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<UnavailableIcon class="w-5 h-5 mr-1 inline-block" data-testid="username-invalid" /> Invalid
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { noteManager } from '../../global'
import { Debounce } from '../../services/helpers'
import LoadingIcon from '../../icons/loading.vue'
import AvailableIcon from '../../icons/available.vue'
import UnavailableIcon from '../../icons/unavailable.vue'
import { AccountType } from '../../services/storage/type'

// Only allow alphanumeric, underscore, dot, and hyphen
const filterRegex = /[^a-zA-Z0-9_.\\-]/g

const props = defineProps<{
	displayCurrent: boolean
	checkUsername: boolean
	suffix?: string
}>()

const username = defineModel<string>('value')
const valid = defineModel<boolean>('valid')

const emit = defineEmits(['changed'])

const canSave = ref(false)
const usernameCurrent = ref(false)
const usernameInvalid = ref(false)
const usernameAvailable = ref(false)
const usernameUnavailable = ref(false)
const usernameInProgress = ref(false)

let lastUsernameChecked = ''

const filterUsername = () => {
	if (username.value) {
		username.value = username.value.replace(filterRegex, '')
	}
}

const checkUsernameDebounce = new Debounce(async () => {
	if (lastUsernameChecked === username.value) {
		return
	}
	lastUsernameChecked = username.value
	try {
		if (noteManager.state.isOnline && username.value === noteManager.state.username) {
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
		if (username.value === 'local' || username.value?.toLowerCase().startsWith('mimiri')) {
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

		let available = true
		if (props.checkUsername === undefined || props.checkUsername === true) {
			available = await noteManager.auth.checkUsername(value)
		}
		if (value === username.value) {
			usernameAvailable.value = available
			usernameUnavailable.value = !available
			usernameInProgress.value = false
		}
	} finally {
		canSave.value =
			usernameAvailable.value && !usernameInvalid.value && !usernameCurrent.value && !usernameUnavailable.value

		valid.value = canSave.value
		emit('changed', canSave.value, username.value)
	}
}, 500)

watch([username, props], () => {
	checkUsernameDebounce.activate()
})

onMounted(() => {
	const shouldCheck = props.checkUsername === undefined || props.checkUsername === true
	usernameCurrent.value = true
	usernameInvalid.value = false
	usernameInProgress.value = false
	usernameAvailable.value = false
	usernameUnavailable.value = false
	if (props.displayCurrent) {
		username.value = noteManager.state.username
	}
	if (noteManager.state.accountType === AccountType.Local && shouldCheck) {
		usernameCurrent.value = false
		usernameInProgress.value = true
	}
	canSave.value = !shouldCheck
	emit('changed', canSave.value)
})

const refresh = () => {
	checkUsernameDebounce.activate()
}

defineExpose({
	refresh,
})
</script>
