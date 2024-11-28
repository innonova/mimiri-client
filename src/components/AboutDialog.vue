<template>
	<dialog class="w-96 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">Mimiri Notes</div>
				<button class="cursor-default w-8 outline-none" @click="close">X</button>
			</header>
			<main>
				<div class="p-1 pl-4">Version: {{ updateManager.currentVersion }}</div>
				<div class="p-1 pl-4 pt-2">Released: {{ formatDate(updateManager.releaseDate) }}</div>
				<div class="p-1 pl-4 pt-6">Notes: {{ noteCount }} / {{ maxNoteCount }} ({{ notesPercent }})</div>
				<div class="p-1 pl-4 pt-2">Space Used: {{ usedBytes }} / {{ maxBytes }} ({{ bytesPercent }})</div>
				<div class="p-1 pl-4 pt-2">Note Size: {{ currentNoteSize }} / {{ maxNoteSize }} ({{ currentNotePercent }})</div>
				<div class="pt-6 pl-4"><a href="https://mimiri.io" target="_blank">https://mimiri.io</a></div>
				<div class="pt-3 pl-4"><a href="https://discord.gg/pg69qPAVZR" target="_blank">Join us on Discord</a></div>
				<div class="pt-6 pl-4">Copyright &copy;2024 innonova GmbH</div>
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
import { noteManager, updateManager } from '../global'
const dialog = ref(null)

const usedBytes = ref('0 MB')
const maxBytes = ref('10 MB')
const bytesPercent = ref('0 %')
const noteCount = ref(0)
const maxNoteCount = ref(0)
const notesPercent = ref('0 %')
const maxNoteSize = ref('1 MB')
const currentNoteSize = ref('0 MB')
const currentNotePercent = ref('0 %')

const biCif = value => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
}

const formatDate = (date: Date) => {
	const result = `${date.getFullYear()}.${biCif(date.getMonth() + 1)}.${biCif(date.getDate())}`
	return result
}

const toMB = bytes => {
	const mb = bytes / 1024 / 1024
	if (mb < 0.1) {
		return `${Math.round(1000 * mb) / 1000} MB`
	}
	return `${Math.round(100 * mb) / 100} MB`
}

const toPercent = (used, max) => {
	const percent = (used / max) * 100
	if (percent < 1) {
		return `${Math.round(100 * percent) / 100} %`
	}
	return `${Math.round(10 * percent) / 10} %`
}

const show = () => {
	if (noteManager.isLoggedIn) {
		usedBytes.value = toMB(noteManager.usedBytes)
		maxBytes.value = toMB(noteManager.maxBytes)
		bytesPercent.value = toPercent(noteManager.usedBytes, noteManager.maxBytes)
		noteCount.value = noteManager.noteCount
		maxNoteCount.value = noteManager.maxNoteCount
		notesPercent.value = toPercent(noteManager.noteCount, noteManager.maxNoteCount)
		maxNoteSize.value = toMB(noteManager.maxNoteSize)
		if (noteManager.selectedNote) {
			currentNoteSize.value = toMB(noteManager.selectedNote.size)
			currentNotePercent.value = toPercent(noteManager.selectedNote.size, noteManager.maxNoteSize)
		} else {
			currentNoteSize.value = '0 MB'
			currentNotePercent.value = '0 %'
		}
	}
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
