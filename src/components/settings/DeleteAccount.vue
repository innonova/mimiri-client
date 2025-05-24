<template>
	<div class="flex flex-col h-full">
		<div class="flex select-none">
			<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-delete-account">Delete Account</div>
		</div>
		<div class="bg-info h-2 mb-2 mr-2"></div>
		<form v-on:submit.prevent="deleteAccount" class="mr-2">
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
				<div class="max-w-110">
					<hr class="my-5" />
					<div v-if="!noteManager.isAnonymous" class="flex justify-end items-baseline">
						<div class="mr-2">Password:</div>
						<div class="text-right">
							<input
								v-model="password"
								tabindex="2"
								type="password"
								class="bg-input text-input-text w-48"
								data-testid="password-input"
							/>
						</div>
					</div>
					<div v-if="(!mimiriPlatform.isWeb || env.DEV) && !noteManager.isAnonymous" class="pt-2 pb-6 text-right">
						<label>
							Also delete local data from this device
							<input
								type="checkbox"
								v-model="deleteLocal"
								class="ml-1 relative top-0.5"
								data-testid="delete-local-checkbox"
							/>
						</label>
					</div>

					<div class="flex justify-end" v-if="error">
						<div class="text-error pb-4 text-right">{{ error }}</div>
					</div>
					<div class="flex justify-end gap-2">
						<div v-if="loading" class="flex items-center justify-end">
							<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
							Please wait
						</div>
						<button
							v-else
							tabindex="3"
							class="min-w-32"
							:disabled="loading || !understandDeleteAccount || !understandDeleteData || !understandRoRecovery"
							data-testid="submit-button"
							type="submit"
						>
							Delete Account
						</button>
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, noteManager } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
import { mimiriPlatform } from '../../services/mimiri-platform'
import { settingsManager } from '../../services/settings-manager'
import { deObfuscate } from '../../services/helpers'
const understandDeleteAccount = ref(false)
const understandDeleteData = ref(false)
const understandRoRecovery = ref(false)
const deleteLocal = ref(false)
const error = ref('')

const loading = ref(false)
const password = ref('')

const deleteAccount = async () => {
	loading.value = true
	error.value = ''
	if (password.value || noteManager.isAnonymous) {
		try {
			if (noteManager.isAnonymous) {
				await noteManager.deleteAccount(await deObfuscate(settingsManager.anonymousPassword), true)
				settingsManager.anonymousUsername = undefined
				settingsManager.anonymousPassword = undefined
				settingsManager.showCreateOverCancel = true
			} else {
				await noteManager.deleteAccount(password.value, deleteLocal.value)
			}
			loading.value = false
			if (deleteLocal.value || noteManager.isAnonymous) {
				noteManager.logout()
				location.reload()
			}
		} catch {
			loading.value = false
			error.value = 'Invalid password'
		}
	} else {
		loading.value = false
		error.value = 'Password required'
	}
}
</script>
