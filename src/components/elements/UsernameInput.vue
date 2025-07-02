<template>
	<div class="relative desktop:flex">
		<input v-model="username" tabindex="1" type="text" class="basic-input" autofocus data-testid="username-input" />
		<div v-if="username" class="desktop:w-0 desktop:h-0 pt-0.5 overflow-visible">
			<div v-if="usernameCurrent" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<AvailableIcon class="w-5 h-5 mr-1 inline-block"></AvailableIcon> Current
			</div>
			<div v-if="usernameInProgress" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0">
				<LoadingIcon class="animate-spin w-5 h-5 mr-1 inline-block"></LoadingIcon> Checking
			</div>
			<div v-if="usernameAvailable" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<AvailableIcon class="w-5 h-5 mr-1 inline-block"></AvailableIcon> Available
			</div>
			<div v-if="usernameUnavailable" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<UnavailableIcon class="w-5 h-5 mr-1 inline-block"></UnavailableIcon> Unavailable
			</div>
			<div v-if="usernameInvalid" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<UnavailableIcon class="w-5 h-5 mr-1 inline-block"></UnavailableIcon> Invalid
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

const disallowString = '!"#$:%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$:%&@'()*/=?[\]{}~\^\\`\s]/

const props = defineProps<{
	displayCurrent: boolean
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

const checkUsernameDebounce = new Debounce(async () => {
	try {
		if (noteManager.state.isOnline && username.value === noteManager.state.username && !noteManager.state.isLocalOnly) {
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
		const available = await noteManager.auth.checkUsername(value)
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

watch(username, () => {
	checkUsernameDebounce.activate()
})

onMounted(() => {
	if (noteManager.state.isOnline && !noteManager.state.isLocalOnly) {
		usernameCurrent.value = true
		usernameInvalid.value = false
		usernameInProgress.value = false
		usernameAvailable.value = false
		usernameUnavailable.value = false
		if (props.displayCurrent) {
			username.value = noteManager.state.username
		}
		canSave.value = false
		emit('changed', canSave.value)
	}
})

const refresh = () => {
	checkUsernameDebounce.activate()
}

defineExpose({
	refresh,
})
</script>
