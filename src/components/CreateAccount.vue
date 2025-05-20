<template>
	<div
		v-if="showCreateAccount && (!mimiriPlatform.isWeb || env.DEV)"
		id="title-bar"
		class="w-full h-[36px] pl-px select-none drag"
	></div>
	<div
		v-if="showCreateAccount && (!mimiriPlatform.isWeb || env.DEV)"
		class="mx-auto px-10 pt-1 md:pt-10 md:my-auto"
		data-testid="create-account-view"
	>
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Create Mimiri Account</h1>
		</div>
		<NewAccount ref="newAccount" @create="createAccount"></NewAccount>
		<div v-if="!loading" class="m-auto">
			<div class="inline-block w-24"></div>
			<div class="inline-block w-52 mt-4 text-right cursor-pointer hover:underline" @click="login">Login</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, noteManager, showCreateAccount } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'
import NewAccount from './elements/NewAccount.vue'

const loading = ref(false)
const newAccount = ref()

const createAccount = async (username: string, password: string, iterations: number) => {
	try {
		try {
			await noteManager.createAccount(username, password, iterations)
			showCreateAccount.value = false
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
}
const login = () => {
	showCreateAccount.value = false
}

const show = () => {
	showCreateAccount.value = true
}

defineExpose({
	show,
})
</script>
