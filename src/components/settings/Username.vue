<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">Username</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<UsernameInput ref="usernameInput" @changed="usernameChanged"></UsernameInput>
	<div class="mt-10 w-full">
		<hr />
		<div class="w-full flex justify-end mt-2">
			<button :disabled="!canSave" @click="save">Save</button>
			<button class="secondary" @click="close">Close</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UsernameInput from '../elements/UsernameInput.vue'
import { noteManager, passwordDialog } from '../../global'

const emit = defineEmits(['close'])

const usernameInput = ref(null)
const canSave = ref(false)
let newUsername = noteManager.username

const usernameChanged = (can: boolean, username: string) => {
	canSave.value = can
	newUsername = username
}

const close = () => {
	emit('close')
}
const save = () => {
	if (canSave.value) {
		passwordDialog.value.showAction(async pwd => {
			try {
				await noteManager.changeUserNameAndPassword(newUsername, pwd)
				usernameInput.value.refresh()
				return true
			} catch (ex) {
				console.log(ex)
			}
			return false
		})
	}
}
</script>
