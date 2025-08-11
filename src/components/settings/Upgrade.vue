<template>
	<div class="flex flex-col h-full" data-testid="connect-cloud-view">
		<TabBar ref="tabBar" :items="['Connect Cloud']" />
		<form @submit.prevent="createAccount" class="pl-2 mt-1">
			<div class="grid grid-cols-[7rem_12rem] gap-2">
				<ItemHeader class="col-span-2">Choose your credentials</ItemHeader>
				<div class="col-span-2 mb-2">
					You current local user is: &nbsp; <b>{{ noteManager.state.username }}</b>
				</div>
				<div class="flex items-center">Username:</div>
				<UsernameInput
					:display-current="false"
					:check-username="true"
					v-model:value="username"
					v-model:valid="usernameValid"
				/>
				<div class="flex items-center">Current Password:</div>
				<input class="basic-input" type="password" v-model="currentPassword" data-testid="current-password-input" />
				<div />
				<label class="flex items-center gap-2">
					<input
						class="basic-input"
						v-model="chooseNewPassword"
						type="checkbox"
						data-testid="choose-new-password-checkbox"
					/>
					Choose a new password
				</label>

				<template v-if="chooseNewPassword">
					<div class="flex items-center">New Password:</div>
					<PasswordInput :display-current="false" v-model:value="password" />
					<div class="flex items-center">Repeat:</div>
					<PasswordRepeatInput :display-current="false" :value="password" v-model:match="passwordMatch" />
				</template>
				<div v-if="errorMessage" class="col-span-2 text-right text-error my-1">{{ errorMessage }}</div>
				<div />
				<PrimaryButton :enabled="canCreate" :loading="loading" data-testid="create-button"> Create </PrimaryButton>
			</div>
		</form>

		<div class="overflow-y-auto pb-10" />
	</div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TabBar from '../elements/TabBar.vue'
import ItemHeader from '../subscription/ItemHeader.vue'
import UsernameInput from '../elements/UsernameInput.vue'
import PasswordInput from '../elements/PasswordInput.vue'
import PasswordRepeatInput from '../elements/PasswordRepeatInput.vue'
import PrimaryButton from '../elements/PrimaryButton.vue'
import { blockUserInput, noteManager } from '../../global'
import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'

const username = ref('')
const usernameValid = ref(false)
const currentPassword = ref('')
const password = ref('')
const passwordMatch = ref(false)
const loading = ref(false)
const chooseNewPassword = ref(false)
const errorMessage = ref('')

const canCreate = computed(() => {
	let result = !!password.value
	result &&= passwordMatch.value
	result ||= !chooseNewPassword.value
	result &&= !!currentPassword.value
	result &&= !!username.value
	result &&= usernameValid.value
	return result
})

onMounted(() => {
	username.value = noteManager.state.username
})

const createAccount = async () => {
	loading.value = true
	blockUserInput.value = true
	try {
		await noteManager.session.promoteToCloudAccount(
			username.value,
			currentPassword.value,
			password.value || currentPassword.value,
			DEFAULT_ITERATIONS,
		)
	} catch (error) {
		if (error instanceof Error && error.message === 'Incorrect password') {
			errorMessage.value = 'Incorrect current password'
		} else {
			errorMessage.value = 'Error upgrading account. Please try again later.'
			console.error('Error upgrading account:', error)
		}
	} finally {
		loading.value = false
		blockUserInput.value = false
	}
}
</script>
