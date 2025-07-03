<template>
	<div class="flex flex-col h-full" data-testid="connect-cloud-view">
		<TabBar ref="tabBar" :items="['Connect Cloud']"></TabBar>
		<div class="pl-2 mt-1">
			<div class="grid grid-cols-[7rem_12rem] gap-2">
				<ItemHeader class="col-span-2">Choose your credentials</ItemHeader>
				<div class="col-span-2 mb-2">
					You current local user is: &nbsp; <b>{{ noteManager.state.username }}</b>
				</div>
				<div class="flex items-center">Username:</div>
				<UsernameInput :display-current="false" v-model:value="username" v-model:valid="usernameValid"></UsernameInput>
				<div class="flex items-center">Current Password:</div>
				<input class="basic-input" type="password" v-model="currentPassword" data-testid="current-password-input" />
				<div></div>
				<label class="flex items-center gap-2">
					<input class="basic-input" v-model="chooseNewPassword" type="checkbox" /> Choose a new password
				</label>

				<template v-if="chooseNewPassword">
					<div class="flex items-center">New Password:</div>
					<PasswordInput :display-current="false" v-model:value="password"></PasswordInput>
					<div class="flex items-center">Repeat:</div>
					<PasswordRepeatInput
						:display-current="false"
						:value="password"
						v-model:match="passwordMatch"
					></PasswordRepeatInput>
				</template>
				<div></div>
				<PrimaryButton :enabled="canCreate" :loading="loading" @click="createAccount" data-testid="create-button">
					Create
				</PrimaryButton>
			</div>
		</div>

		<div class="overflow-y-auto pb-10"></div>
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
import { noteManager } from '../../global'
import { DEFAULT_ITERATIONS } from '../../services/storage/mimiri-store'

const username = ref('')
const usernameValid = ref(false)
const currentPassword = ref('')
const password = ref('')
const passwordMatch = ref(false)
const loading = ref(false)
const chooseNewPassword = ref(false)

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
	await noteManager.session.promoteToCloudAccount(
		username.value,
		password.value || currentPassword.value,
		DEFAULT_ITERATIONS,
	)
}
</script>
