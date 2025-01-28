<template>
	<dialog class="w-96 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div v-if="!showLog" class="grid grid-rows-[auto_1fr_auto] gap-6" @click="boxClicked">
			<DialogTitle @close="close">Mimiri Notes</DialogTitle>
			<main>
				<div class="p-1 pl-4">Bundle Version: {{ updateManager.currentVersion }}</div>
				<div class="p-1 pl-4 pt-2">Host Version: {{ updateManager.hostVersion }}</div>
				<div class="p-1 pl-4 pt-2">Released: {{ formatDate(updateManager.releaseDate) }}</div>
				<div class="p-1 pl-4 pt-6">Notes: {{ noteCount }} / {{ maxNoteCount }} ({{ notesPercent }})</div>
				<div class="p-1 pl-4 pt-2">Space Used: {{ usedBytes }} / {{ maxBytes }} ({{ bytesPercent }})</div>
				<div class="p-1 pl-4 pt-2">Note Size: {{ currentNoteSize }} / {{ maxNoteSize }} ({{ currentNotePercent }})</div>
				<div class="pt-6 pl-4"><a href="https://mimiri.io" target="_blank">https://mimiri.io</a></div>
				<div class="pt-3 pl-4"><a href="https://discord.gg/pg69qPAVZR" target="_blank">Join us on Discord</a></div>
				<div class="pt-6 pl-4">Copyright &copy;2024 innonova GmbH</div>
				<div class="flex flex-col mx-4 p-2 mt-4 bg-info">
					<b>Attributions:</b>
					<template v-for="att of iconAttributions">
						<div class="mt-2 leading-5" v-html="att"></div>
					</template>
				</div>
			</main>
			<footer class="flex justify-end gap-2 pt-3 pr-2 pb-2">
				<button class="secondary" @click="close">Close</button>
			</footer>
		</div>
		<div v-if="showLog" class="flex flex-col">
			<div class="h-[600px] overflow-y-scroll p-2">
				<template v-for="message of mobileLog.messages">
					<div>{{ message }}</div>
				</template>
			</div>
			<div class="flex justify-around">
				<div class="text-center">
					<button class="secondary" @click="closeLog">Close Log</button>
				</div>
				<div class="text-center">
					<button @click="changeChannel">
						{{ settingsManager.channel }}
					</button>
				</div>
			</div>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, updateManager, mobileLog } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import DialogTitle from '../elements/DialogTitle.vue'
import { iconAttributions } from '../../icons/attributions'

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
const showLog = ref(false)

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

let clickCount = 0
let firstClick = Date.now() - 60000
const boxClicked = () => {
	if (mobileLog.enabled) {
		if (Date.now() - firstClick > 60000) {
			clickCount = 0
			firstClick = Date.now()
		}
		if (++clickCount >= 10) {
			clickCount = 0
			firstClick = Date.now() - 60000
			mobileLog.log('log opened')
			showLog.value = true
		}
	}
}

const closeLog = () => {
	showLog.value = false
}

const changeChannel = () => {
	if (settingsManager.channel === 'stable') {
		settingsManager.channel = 'canary'
	} else {
		settingsManager.channel = 'stable'
	}
}

defineExpose({
	show,
})
</script>
