<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-about">About</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div @click="boxClicked">
		<div class="p-1 pl-4">Bundle Version: {{ updateManager.currentVersion }}</div>
		<div class="p-1 pl-4 pt-2">Host Version: {{ mimiriPlatform.isWeb ? browserName : updateManager.hostVersion }}</div>
		<div class="p-1 pl-4 pt-2">Released: {{ formatDate(updateManager.releaseDate) }}</div>
		<div class="p-1 pl-4 pt-6">Notes: {{ noteCount }} / {{ maxNoteCount }} ({{ notesPercent }})</div>
		<div class="p-1 pl-4 pt-2">Space Used: {{ usedBytes }} / {{ maxBytes }} ({{ bytesPercent }})</div>
		<div class="pt-6 pl-4"><a href="https://mimiri.io/terms" target="_blank">Terms & Conditions</a></div>
		<div class="pt-3 pl-4"><a href="https://mimiri.io/privacy" target="_blank">Privacy Policy</a></div>
		<div class="pt-6 pl-4"><a href="https://mimiri.io" target="_blank">https://mimiri.io</a></div>
		<div class="pt-6 pl-4"><a href="https://discord.gg/pg69qPAVZR" target="_blank">Join us on Discord</a></div>
		<div class="pt-3 pl-4"><a href="https://www.reddit.com/r/mimiri/" target="_blank">Join us on Reddit</a></div>
		<div class="pt-6 pl-4">
			<a href="https://github.com/innonova/mimiri-client" target="_blank">Source on GitHub</a>
		</div>
		<div class="pt-3 pl-4">
			<a href="https://github.com/innonova/mimiri-client/issues" target="_blank">Issue Tracker on GitHub</a>
		</div>

		<div class="pt-6 pl-4">Copyright &copy;2024-{{ new Date().getFullYear() }} innonova GmbH</div>
		<div class="inline-flex flex-col mx-4 p-3 mt-4 bg-info">
			<b>Attributions:</b>
			<template v-for="att of iconAttributions">
				<div class="mt-2 leading-5" v-html="att"></div>
			</template>
		</div>
	</div>
	<div v-if="showLog" class="flex flex-col">
		<div class="flex justify-around">
			<div class="text-center">
				<button class="secondary" @click="closeLog">Close Log</button>
			</div>
			<div class="text-center">
				<button @click="reload">reload</button>
			</div>
			<div class="text-center">
				<button @click="changeChannel">
					{{ settingsManager.channel }}
				</button>
			</div>
		</div>
		<div class="h-[600px] overflow-y-scroll p-2">
			<template v-for="message of mobileLog.messages">
				<div>{{ message }}</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { noteManager, updateManager, mobileLog } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import { iconAttributions } from '../../icons/attributions'
import { mimiriPlatform } from '../../services/mimiri-platform'

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
const browserName = ref(navigator.userAgent)

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

onMounted(() => {
	if (noteManager.isLoggedIn) {
		usedBytes.value = toMB(noteManager.usedBytes)
		maxBytes.value = toMB(noteManager.maxBytes)
		bytesPercent.value = toPercent(noteManager.usedBytes, noteManager.maxBytes)
		if (noteManager.noteCount < 1000) {
			// don't count root node, system, and recycle bin
			noteCount.value = noteManager.noteCount - 3
		} else {
			// show real count until server has been updated when close to the limit
			noteCount.value = noteManager.noteCount
		}
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
})

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

const reload = () => {
	location.reload()
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
</script>
