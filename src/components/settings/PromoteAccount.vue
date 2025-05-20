<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-username">Create Account</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="max-w-[30rem]" data-testid="promote-account-view">
		<NewAccount ref="newAccount" @create="createAccount"></NewAccount>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NewAccount from '../elements/NewAccount.vue'
import { noteManager } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import { persistedState } from '../../services/persisted-state'
import { deObfuscate } from '../../services/helpers'

const newAccount = ref()

const createAccount = async (username: string, password: string, iterations: number) => {
	try {
		try {
			await noteManager.changeUserNameAndPassword(
				username,
				await deObfuscate(settingsManager.anonymousPassword),
				password,
				iterations,
			)
			persistedState.storeSelectedNote(noteManager.getNoteById(noteManager.controlPanelId))
			settingsManager.anonymousUsername = undefined
			settingsManager.anonymousPassword = undefined
			settingsManager.autoLoginData = undefined
			settingsManager.autoLogin = false
			await settingsManager.save()
			location.reload()
		} catch (ex) {
			newAccount.value.error(ex.message)
			return
		}
	} finally {
		newAccount.value.complete()
	}
	if (!noteManager.isLoggedIn) {
		newAccount.value.error('Unknown Error')
	} else {
		await noteManager.root.ensureChildren()
	}
	console.log('createAccount', username, password, iterations)
}
</script>
