<template>
	<dialog class="w-96 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">Mimiri Notes</div>
				<button class="cursor-default w-8 outline-none" @click="close">X</button>
			</header>
			<main>
				<div class="p-2">
					<div v-if="!updateManager.latestVersion">No update found</div>
					<div v-if="updateManager.latestVersion">Update found: {{ updateManager.latestVersion }}</div>
				</div>
			</main>
			<footer class="flex justify-end gap-2 pt-3">
				<button class="bg-button-primary text-button-primary-text mr-2 mb-2 hover:opacity-80" @click="close">
					Close
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { updateManager } from '../global'
const dialog = ref(null)

const show = () => {
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
