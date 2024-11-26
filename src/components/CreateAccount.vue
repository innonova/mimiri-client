<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
	<div class="m-auto p-10">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Create Mimiri Account</h1>
		</div>
		<form v-on:submit.prevent="createAccount">
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Username:</div>
				<div class="inline-block w-52 text-right">
					<input v-model="username" tabindex="1" type="text" class="bg-input text-input-text" autofocus />
				</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Password:</div>
				<div class="inline-block w-52 text-right">
					<input v-model="password" tabindex="2" type="password" class="bg-input text-input-text" />
				</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Repeat:</div>
				<div class="inline-block w-52 text-right">
					<input v-model="passwordRepeat" tabindex="3" type="password" class="bg-input text-input-text" />
				</div>
			</div>
			<div class="p-1 m-auto" v-if="errorText">
				<div class="text-error w-64 py-2.5 text-right">{{ errorText }}</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-right create-account-submit">
					<div v-if="loading">Please wait</div>
					<button
						v-else
						tabindex="3"
						class="bg-button-primary text-button-primary-text hover:opacity-80"
						:disabled="loading"
						type="submit"
					>
						Create
					</button>
					<div v-if="!loading" class="mt-5 mr-1 cursor-pointer hover:underline" @click="login">Login</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, showCreateAccount } from '../global'

const disallowString = '!"#$%&@\'()*/=?[]{}~^`'
const disallowRegex = /[!"#$%&@'()*/=?[\]{}~\^\\`]/

const username = ref('')
const password = ref('')
const passwordRepeat = ref('')
const loading = ref(false)
const errorText = ref('')

async function createAccount() {
	if (disallowRegex.test(username.value)) {
		errorText.value = 'Invalid username'
		return
	}
	if (!username.value) {
		errorText.value = 'Must enter a username'
		return
	}
	if (password.value !== passwordRepeat.value) {
		errorText.value = 'Passwords do not match'
		return
	}
	if (!password.value) {
		errorText.value = 'Must enter a password'
		return
	}
	errorText.value = ''
	loading.value = true
	try {
		try {
			await noteManager.createAccount(username.value, password.value)
		} catch (ex) {
			errorText.value = ex.message
			return
		}
	} finally {
		loading.value = false
	}
	if (!noteManager.isLoggedIn) {
		errorText.value = 'Unknown Error'
	} else {
		await noteManager.root.ensureChildren()
	}
}

const login = () => {
	showCreateAccount.value = false
}
</script>
