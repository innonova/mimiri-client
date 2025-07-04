<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['About']"></TabBar>
		<div class="flex flex-col overflow-y-auto">
			<div @click="boxClicked">
				<div class="p-1 pl-4">Bundle Version: {{ updateManager.currentVersion }}</div>
				<div class="p-1 pl-4 pt-2 leading-5">
					Host Version: {{ mimiriPlatform.isWeb ? browserName : updateManager.hostVersion }}
				</div>
				<div class="p-1 pl-4 pt-2">Released: {{ formatDate(updateManager.releaseDate) }}</div>
				<div class="p-1 pl-4 pt-6">Notes: {{ noteCount }} / {{ maxNoteCount }} ({{ notesPercent }})</div>
				<div class="p-1 pl-4 pt-2">Space Used: {{ usedBytes }} / {{ maxBytes }} ({{ bytesPercent }})</div>
				<div class="p-1 pl-4 pt-2">
					Account:
					<span data-testid="about-username"
						>{{ noteManager.state.username }} (<span class="inline-block mx-px capitalize">{{
							noteManager.state.accountType
						}}</span
						>)</span
					>
				</div>
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
				<div @click="resetBoxClicks" class="flex flex-col items-start">
					<div class="flex info flex-col mx-4 mt-4 bg-info">
						<b>Attributions:</b>
						<template v-for="att of iconAttributions">
							<div class="mt-2 leading-5" v-html="att"></div>
						</template>
					</div>
					<div class="flex info flex-col mx-4 mt-4 mb-10 bg-info">
						<b>Font Licenses:</b>
						<div class="mt-2 mb-1 leading-5">
							All fonts are directly referenced either from the operating system or fonts.mimiri.io <br />
							Licenses and project links for fonts referenced from fonts.mimiri.io listed below
						</div>
						<select v-model="selectedFont" class="mt-2">
							<option value="CHOOSE">Choose font to view license</option>
							<template v-for="item of fontManager.licenses" :key="item.name">
								<option :value="item.name">{{ item.name }} ({{ item.license }})</option>
							</template>
						</select>
						<div v-if="fontLink" class="mt-3 mb-2 p-1">
							Project Link: <a :href="fontLink" target="_blank">{{ fontLink }}</a>
						</div>
						<div class="whitespace-pre-wrap max-w-120 mt-3 p-1">{{ fontLicense }}</div>
					</div>
				</div>
			</div>
			<div v-if="showLog" class="flex flex-col">
				<div class="flex justify-around">
					<div class="text-center">
						<button class="secondary" @click="closeLog">Close Log</button>
					</div>
					<div class="text-center">
						<button class="primary" @click="reload">reload</button>
					</div>
					<div class="text-center">
						<button class="primary" @click="changeChannel">
							{{ settingsManager.channel }}
						</button>
					</div>
				</div>
				<div class="flex justify-around mt-2">
					<div class="text-center">
						<button class="primary" @click="toggleDebug">
							{{ settingsManager.debugEnabled ? 'Disable Debug' : 'Enable Debug' }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { noteManager, updateManager } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import { iconAttributions } from '../../icons/attributions'
import { mimiriPlatform } from '../../services/mimiri-platform'
import TabBar from '../elements/TabBar.vue'
import { fontManager } from '../../global'

const SYSTEM_NOTE_COUNT = 3

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
const selectedFont = ref('CHOOSE')
const fontLicense = ref('')
const fontLink = ref('')

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
	if (noteManager.state.isLoggedIn) {
		usedBytes.value = toMB(noteManager.state.userStats.size)
		maxBytes.value = toMB(noteManager.state.userStats.maxTotalBytes)
		bytesPercent.value = toPercent(noteManager.state.userStats.size, noteManager.state.userStats.maxTotalBytes)
		noteCount.value = noteManager.state.userStats.noteCount - SYSTEM_NOTE_COUNT
		maxNoteCount.value = noteManager.state.userStats.maxNoteCount
		notesPercent.value = toPercent(noteManager.state.userStats.noteCount, noteManager.state.userStats.maxNoteCount)
		maxNoteSize.value = toMB(noteManager.state.userStats.maxNoteBytes)
		if (noteManager.tree.selectedNote()) {
			currentNoteSize.value = toMB(noteManager.tree.selectedNote().size)
			currentNotePercent.value = toPercent(
				noteManager.tree.selectedNote().size,
				noteManager.state.userStats.maxNoteBytes,
			)
		} else {
			currentNoteSize.value = '0 MB'
			currentNotePercent.value = '0 %'
		}
	}
})

let clickCount = 0
let firstClick = Date.now() - 60000
const boxClicked = () => {
	if (Date.now() - firstClick > 60000) {
		clickCount = 0
		firstClick = Date.now()
	}
	if (++clickCount >= 10) {
		clickCount = 0
		firstClick = Date.now() - 60000
		showLog.value = true
	}
}

const resetBoxClicks = () => {
	clickCount = 0
	firstClick = Date.now() - 60000
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
	} else if (settingsManager.channel === 'canary') {
		settingsManager.channel = 'development'
	} else {
		settingsManager.channel = 'stable'
	}
}

const toggleDebug = () => {
	settingsManager.debugEnabled = !settingsManager.debugEnabled
	location.reload()
}

watch(selectedFont, async () => {
	if (selectedFont.value !== 'CHOOSE') {
		fontLicense.value = await fontManager.fetchLicense(selectedFont.value)
		fontLink.value = fontManager.getLink(selectedFont.value)
	} else {
		fontLicense.value = ''
		fontLink.value = ''
	}
})
</script>
