<template>
	<div class="flex flex-col h-full" data-testid="change-username">
		<TabBar :items="['Username']" />
		<div class="overflow-y-auto pb-10">
			<div class="grid grid-cols-[5rem_14rem] gap-3 items-baseline m-1 mt-5">
				<div class="flex items-center">Username:</div>
				<UsernameInput
					:display-current="true"
					:check-username="noteManager.state.accountType === AccountType.Cloud"
					v-model:value="username"
					v-model:valid="canSave"
				/>
			</div>
			<div class="mt-10 max-w-110 mr-2">
				<hr>
				<div class="w-full flex justify-end mt-2 gap-2">
					<button :disabled="!canSave" @click="save" class="primary" data-testid="save-button">Save</button>
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
import { AccountType } from '../../services/storage/type'

const emit = defineEmits(['close'])

const canSave = ref(false)
const username = ref('')

const save = () => {
	if (canSave.value) {
		passwordDialog.value.showAction(async pwd => {
			try {
				await noteManager.auth.changeUserNameAndPassword(username.value, pwd)
				username.value = noteManager.state.username
				return true
			} catch (ex) {
				debug.logError('Error changing username', ex)
			}
			return false
		})
	}
}
</script>
