<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
	<div class="m-auto p-1">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Delete Account</h1>
		</div>
		<form v-on:submit.prevent="deleteAccount">
			<div class="flex flex-col">
				<div class="py-1">I understand that</div>
				<div class="py-1">
					<label>
						<input
							type="checkbox"
							v-model="understandDeleteAccount"
							class="mr-1 relative top-0.5"
							data-testid="delete-account-checkbox"
						/>
						this will <b>permanently</b> delete my account
					</label>
				</div>
				<div class="py-1">
					<label>
						<input
							type="checkbox"
							v-model="understandDeleteData"
							class="mr-1 relative top-0.5"
							data-testid="delete-data-checkbox"
						/>
						this will <b>permanently</b> delete all my data
					</label>
				</div>
				<div class="py-1">
					<label>
						<input
							type="checkbox"
							v-model="understandRoRecovery"
							class="mr-1 relative top-0.5"
							data-testid="no-recovery-checkbox"
						/>
						that there is <b>no way</b> to recover my data
					</label>
				</div>
				<hr class="my-5" />
				<div class="flex justify-end items-baseline">
					<div class="mr-2">Password:</div>
					<div class="text-right">
						<input
							v-model="password"
							tabindex="2"
							type="password"
							class="bg-input text-input-text"
							data-testid="password-input"
						/>
					</div>
				</div>
				<div class="pt-2 pb-6 text-right">
					<label>
						Also delete local data from this device
						<input type="checkbox" v-model="deleteLocal" class="ml-1 relative top-0.5" />
					</label>
				</div>

				<div class="flex justify-end" v-if="error">
					<div class="text-error pb-4 text-right">{{ error }}</div>
				</div>
				<div class="flex justify-end">
					<div v-if="loading" class="flex items-center justify-end">
						<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						Please wait
					</div>
					<button
						v-else
						tabindex="3"
						class="bg-button-primary text-button-primary-text hover:opacity-80 w-36 mr-2"
						:disabled="loading || !understandDeleteAccount || !understandDeleteData || !understandRoRecovery"
						:class="{
							'text-menu-disabled':
								loading || !understandDeleteAccount || !understandDeleteData || !understandRoRecovery,
						}"
						data-testid="submit-button"
						type="submit"
					>
						Delete Account
					</button>
					<button
						class="bg-button-secondary text-button-secondary-text mb-2 hover:opacity-80"
						:class="{
							'text-menu-disabled': loading,
						}"
						:disabled="loading"
						@click="close"
					>
						Cancel
					</button>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { noteManager, showDeleteAccount } from '../global'
import LoadingIcon from '../icons/loading.vue'
const understandDeleteAccount = ref(false)
const understandDeleteData = ref(false)
const understandRoRecovery = ref(false)
const deleteLocal = ref(false)
const error = ref('')

const loading = ref(false)
const password = ref('')

watch(showDeleteAccount, newValue => {
	if (newValue) {
		understandDeleteAccount.value = false
		understandDeleteData.value = false
		understandRoRecovery.value = false
		deleteLocal.value = false
	}
})

const deleteAccount = async () => {
	loading.value = true
	error.value = ''
	if (password.value) {
		const valid = await noteManager.validatePassword(password.value)
		if (valid) {
			await noteManager.deleteAccount(deleteLocal.value)
			loading.value = false
			showDeleteAccount.value = false
			if (deleteLocal.value) {
				noteManager.logout()
			}
		} else {
			loading.value = false
			error.value = 'Invalid password'
		}
	} else {
		loading.value = false
		error.value = 'Password required'
	}
}

const show = (limit: string) => {}

const close = () => {
	showDeleteAccount.value = false
}

defineExpose({
	show,
})
</script>
