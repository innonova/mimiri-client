<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="clear-local-data-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ $t('deleteLocalDataDialog.title') }}</DialogTitle>
			<main class="px-2 leading-5">
				<div class="mb-2">{{ $t('deleteLocalDataDialog.question') }}</div>
				<button v-if="!showMoreInfo" class="underline cursor-pointer" @click="toggleMoreInfo">
					{{ $t('deleteLocalDataDialog.moreInfo') }}
				</button>
				<div v-if="showMoreInfo">
					<div class="mb-1">{{ $t('deleteLocalDataDialog.notPersonalDevice') }}</div>
					<div class="mb-1">{{ $t('deleteLocalDataDialog.leaveImprovePerformance') }}</div>
					<div>
						{{ $t('deleteLocalDataDialog.encryptedWarning') }}
					</div>
				</div>
			</main>
			<footer class="flex mobile:justify-center gap-2 pr-2 pb-2 pl-2 justify-end">
				<button class="primary" @click="clearData" data-testid="clear-local-data-clear">
					{{ $t('deleteLocalDataDialog.removeData') }}
				</button>
				<button class="secondary" @click="logout" data-testid="clear-local-data-logout">
					{{ $t('deleteLocalDataDialog.justLogOut') }}
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
import { noteManager } from '../../global'
const dialog = ref(null)
const isOpen = ref(false)
const showMoreInfo = ref(false)

const toggleMoreInfo = () => {
	showMoreInfo.value = !showMoreInfo.value
}

const show = async () => {
	isOpen.value = true
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}
const clearData = async () => {
	await noteManager.session.logout(true, true)
	window.location.reload()
	dialog.value.close()
}

const logout = async () => {
	await noteManager.session.logout(true)
	window.location.reload()
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
