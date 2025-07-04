<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Username']"></TabBar>
		<div class="overflow-y-auto pb-10">
			<div class="grid grid-cols-[5rem_14rem] gap-3 items-baseline m-1 mt-5">
				<div class="flex items-center">Username:</div>
				<UsernameInput
					ref="usernameInput"
					:display-current="true"
					:check-username="true"
					@changed="usernameChanged"
				></UsernameInput>
			</div>
			<div class="mt-10 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-end mt-2 gap-2">
					<button :disabled="!canSave" @click="save" class="primary">Save</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UsernameInput from '../elements/UsernameInput.vue'
import { debug, noteManager, passwordDialog } from '../../global'
import TabBar from '../elements/TabBar.vue'

const emit = defineEmits(['close'])

const usernameInput = ref(null)
const canSave = ref(false)
let newUsername = noteManager.state.username

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
				await noteManager.auth.changeUserNameAndPassword(newUsername, pwd)
				usernameInput.value.refresh()
				return true
			} catch (ex) {
				debug.logError('Error changing username', ex)
			}
			return false
		})
	}
}
</script>
