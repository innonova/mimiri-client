<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
	<div class="mx-auto p-1 mt-20 md:my-auto" data-testid="login-view">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Mimiri Login</h1>
		</div>
		<form v-on:submit.prevent="login">
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Username:</div>
				<div class="inline-block w-52 text-right">
					<input
						v-model="username"
						tabindex="1"
						type="text"
						class="bg-input text-input-text"
						data-testid="username-input"
						autofocus
					/>
				</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24">Password:</div>
				<div class="inline-block w-52 text-right">
					<input
						v-model="password"
						tabindex="2"
						type="password"
						data-testid="password-input"
						class="bg-input text-input-text"
					/>
				</div>
			</div>
			<div class="p-1 m-auto" v-if="error">
				<div class="text-error w-64 py-2.5 text-right">Incorrect username or password</div>
			</div>
			<div class="p-1 m-auto">
				<div class="inline-block w-24"></div>
				<div class="inline-block w-52 text-right">
					<div v-if="loading" class="flex items-center justify-end">
						<LoadingIcon class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						<div class="flex flex-col items-center">
							<div>Please wait</div>
							<div v-if="longTime" class="mt-1">{{ timeElapsed }}</div>
						</div>
					</div>
					<button v-else tabindex="3" :disabled="loading" type="submit" data-testid="login-button">Login</button>
				</div>
				<div class="flex mt-5 w-full justify-between items-center">
					<a class="invisible md:visible hover:underline" href="https://mimiri.io" target="_blank">What is Mimiri?</a>
					<div
						v-if="(!loading && !mimiriPlatform.isWeb) || env.DEV"
						class="mr-1 cursor-pointer hover:underline"
						data-testid="create-account-link"
						@click="createAccount"
					>
						Create Account
					</div>
				</div>
			</div>
		</form>
	</div>
	<div class="absolute bottom-5 w-full pr-5 text-right">v {{ updateManager.currentVersion }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, noteManager, showConvertAccount, showCreateAccount, conversionData, updateManager } from '../global'
import { PossibleConversionError } from '../services/mimer-client'
import LoadingIcon from '../icons/loading.vue'
import { mimiriPlatform } from '../services/mimiri-platform'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(false)
const changelogToggled = ref(false)
const timeElapsed = ref('')
const longTime = ref(false)

const login = async () => {
	loading.value = true
	const start = performance.now()
	const interval = setInterval(() => {
		const value = Math.round((performance.now() - start) / 100) / 10
		longTime.value = value > 2
		if (Math.floor(value) === value) {
			timeElapsed.value = `${value}.0 s`
		} else {
			timeElapsed.value = `${value} s`
		}
	}, 100)
	try {
		await noteManager.login({ username: username.value, password: password.value })
	} catch (ex) {
		if (ex instanceof PossibleConversionError) {
			conversionData.value = {
				username: username.value,
				password: password.value,
			}
			showConvertAccount.value = true
			return
		}
		console.log(ex)
	}
	clearInterval(interval)
	loading.value = false
	if (!noteManager.isLoggedIn) {
		error.value = true
	} else {
		await noteManager.loadState()
	}
}

const createAccount = () => {
	showCreateAccount.value = true
}
</script>
