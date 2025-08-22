<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="clear-local-data-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Clear local data</DialogTitle>
			<main class="px-2 leading-5">
				<div class="mb-2">Do you want to remove locally cached data?</div>
				<button v-if="!showMoreInfo" class="underline cursor-pointer" @click="toggleMoreInfo">more info</button>
				<div v-if="showMoreInfo">
					<div class="mb-1">If this is not your personal device, removing this data is advisable.</div>
					<div class="mb-1">Leaving it will improve performance the next time you log in on this device.</div>
					<div>
						While your data is encrypted leaving it lying around does make it more exposed to potential attacks.
					</div>
				</div>
			</main>
			<footer class="flex mobile:justify-center gap-2 pr-2 pb-2 pl-2 justify-end">
				<button class="primary" @click="clearData" data-testid="clear-local-data-clear">Remove data</button>
				<button class="secondary" @click="logout" data-testid="clear-local-data-logout">Just log out</button>
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
