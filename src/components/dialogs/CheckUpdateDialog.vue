<template>
	<dialog
		class="w-96 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Mimiri Notes</DialogTitle>
			<main>
				<div class="p-2">
					<div v-if="!updateManager.latestVersion">No update found</div>
					<div v-if="updateManager.latestVersion">Update found: {{ updateManager.latestVersion }}</div>
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pt-3 pr-2 pb-2">
				<button class="primary" v-if="updateManager.latestVersion" @click="update">Update</button>
				<button class="secondary" @click="close">Close</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { updateManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const isOpen = ref(false)

const show = () => {
	isOpen.value = true
	dialog.value.showModal()
}

const update = () => {
	dialog.value.close()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
