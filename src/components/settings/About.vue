<template>
	<div class="flex flex-col h-full">
		<TabBar :items="[$t('settingsAbout.tab')]" />
		<div class="flex flex-col overflow-y-auto">
			<div @click="boxClicked">
				<div class="p-1 pl-4">{{ $t('settingsAbout.bundleVersion') }} {{ updateManager.currentVersion }}</div>
				<div class="p-1 pl-4 pt-2 leading-5">
					{{ $t('settingsAbout.hostVersion') }} {{ mimiriPlatform.isWeb ? browserName : updateManager.hostVersion }}
				</div>
				<div class="p-1 pl-4 pt-2">{{ $t('settingsAbout.released') }} {{ formatDate(updateManager.releaseDate) }}</div>
				<template v-if="maxNoteCount > 0">
					<div class="p-1 pl-4 pt-6">
						{{ $t('settingsAbout.notes') }} <span data-testid="about-note-count">{{ noteCount }}</span> /
						<span data-testid="about-max-note-count">{{ maxNoteCount }}</span> ({{ notesPercent }})
					</div>
					<div class="p-1 pl-4 pt-2">
						{{ $t('settingsAbout.spaceUsed') }}
						<span data-testid="about-space-used" :title="`${usedBytesRaw}`">{{ usedBytes }}</span> /
						<span data-testid="about-max-space">{{ maxBytes }}</span> ({{ bytesPercent }})
					</div>
					<div class="p-1 pl-4 pt-2">
						{{ $t('settingsAbout.unsyncedNotes') }} <span data-testid="about-unsynced-notes">{{ localNoteCount }}</span>
					</div>
					<div class="p-1 pl-4 pt-2">
						{{ $t('settingsAbout.unsyncedData') }} <span data-testid="about-unsynced-data">{{ localUsedBytes }}</span>
					</div>
				</template>
				<template v-else>
					<div class="p-1 pl-4 pt-6">{{ $t('settingsAbout.notes') }} {{ noteCount }}</div>
					<div class="p-1 pl-4 pt-2">{{ $t('settingsAbout.spaceUsed') }} {{ usedBytes }}</div>
				</template>
				<div class="p-1 pl-4 pt-6">
					{{ $t('settingsAbout.account') }}
					<span
						><span data-testid="about-username">{{ noteManager.state.username }}</span> (<span
							class="inline-block mx-px capitalize"
							data-testid="about-account-type"
							>{{ noteManager.state.accountType }}</span
						>)</span
					>
				</div>
				<div v-if="flags" class="p-1 pl-4 pt-2">{{ $t('settingsAbout.system') }} {{ flags }}</div>
				<div class="pt-6 pl-4">
					<a href="https://mimiri.io/terms" target="_blank">{{ $t('settingsAbout.termsAndConditions') }}</a>
				</div>
				<div class="pt-3 pl-4">
					<a href="https://mimiri.io/privacy" target="_blank">{{ $t('settingsAbout.privacyPolicy') }}</a>
				</div>
				<div class="pt-6 pl-4"><a href="https://mimiri.io" target="_blank">https://mimiri.io</a></div>
				<div class="pt-6 pl-4">
					<a href="https://discord.gg/pg69qPAVZR" target="_blank">{{ $t('settingsAbout.discord') }}</a>
				</div>
				<div class="pt-3 pl-4">
					<a href="https://www.reddit.com/r/mimiri/" target="_blank">{{ $t('settingsAbout.reddit') }}</a>
				</div>
				<div class="pt-6 pl-4">
					<a href="https://github.com/innonova/mimiri-client" target="_blank">{{ $t('settingsAbout.sourceGitHub') }}</a>
				</div>
				<div class="pt-3 pl-4">
					<a href="https://github.com/innonova/mimiri-client/issues" target="_blank">{{
						$t('settingsAbout.issueTracker')
					}}</a>
				</div>
				<div @click="resetBoxClicks" class="flex flex-col items-start">
					<div class="flex info flex-col mx-4 mt-4 bg-info">
						<b>{{ $t('settingsAbout.attributions') }}</b>
						<template v-for="att of iconAttributions" :key="att">
							<div class="mt-2 leading-5" v-html="att" />
						</template>
					</div>
					<div class="flex info flex-col mx-4 mt-4 mb-10 bg-info">
						<b>{{ $t('settingsAbout.fontLicenses') }}</b>
						<div class="mt-2 mb-1 leading-5">
							{{ $t('settingsAbout.fontLicensesText') }}
						</div>
						<select v-model="selectedFont" class="mt-2">
							<option value="CHOOSE">{{ $t('settingsAbout.chooseFontLicense') }}</option>
							<template v-for="item of fontManager.licenses" :key="item.name">
								<option :value="item.name">{{ item.name }} ({{ item.license }})</option>
							</template>
						</select>
						<div v-if="fontLink" class="mt-3 mb-2 p-1">
							{{ $t('settingsAbout.projectLink') }} <a :href="fontLink" target="_blank">{{ fontLink }}</a>
						</div>
						<div class="whitespace-pre-wrap max-w-120 mt-3 p-1">{{ fontLicense }}</div>
					</div>
				</div>
			</div>
			<div v-if="showLog" class="flex flex-col">
				<div class="flex justify-around">
					<div class="text-center">
						<button class="secondary" @click="closeLog">{{ $t('settingsAbout.closeLog') }}</button>
					</div>
					<div class="text-center">
						<button class="primary" @click="reload">{{ $t('settingsAbout.reload') }}</button>
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
							{{ settingsManager.debugEnabled ? $t('settingsAbout.disableDebug') : $t('settingsAbout.enableDebug') }}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ipcClient, noteManager, updateManager } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import { iconAttributions } from '../../icons/attributions'
import { mimiriPlatform } from '../../services/mimiri-platform'
import TabBar from '../elements/TabBar.vue'
import { fontManager } from '../../global'
import { formatBytes } from '../../services/helpers'
import { SYSTEM_NOTE_COUNT } from '../../services/storage/synchronization-service'

const usedBytesRaw = ref(0)
const usedBytes = ref('0 MB')
const maxBytes = ref('10 MB')
const localUsedBytes = ref('0 MB')
const bytesPercent = ref('0 %')
const noteCount = ref(0)
const localNoteCount = ref(0)
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
const flags = ref('')

if (ipcClient.isAvailable) {
	void ipcClient.os.rules()?.then(rules => (flags.value = rules?.flags?.join(', ')))
}

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

const toPercent = (used, max) => {
	const percent = (used / max) * 100
	if (percent < 1) {
		return `${Math.round(100 * percent) / 100} %`
	}
	return `${Math.round(10 * percent) / 10} %`
}

watch(
	noteManager.state,
	() => {
		if (noteManager.state.isLoggedIn) {
			usedBytesRaw.value = noteManager.state.userStats.size + noteManager.state.userStats.localSizeDelta
			usedBytes.value = formatBytes(usedBytesRaw.value)
			maxBytes.value = formatBytes(noteManager.state.userStats.maxTotalBytes)
			localUsedBytes.value = formatBytes(noteManager.state.userStats.localSize)
			bytesPercent.value = toPercent(
				noteManager.state.userStats.size + noteManager.state.userStats.localSizeDelta,
				noteManager.state.userStats.maxTotalBytes,
			)
			noteCount.value =
				noteManager.state.userStats.noteCount + noteManager.state.userStats.localNoteCountDelta - SYSTEM_NOTE_COUNT
			maxNoteCount.value = noteManager.state.userStats.maxNoteCount
			localNoteCount.value = noteManager.state.userStats.localNoteCount
			notesPercent.value = toPercent(
				noteManager.state.userStats.noteCount + noteManager.state.userStats.localNoteCountDelta,
				noteManager.state.userStats.maxNoteCount,
			)
			maxNoteSize.value = formatBytes(noteManager.state.userStats.maxNoteBytes)
			if (noteManager.tree.selectedNote()) {
				currentNoteSize.value = formatBytes(noteManager.tree.selectedNote().size)
				currentNotePercent.value = toPercent(
					noteManager.tree.selectedNote().size,
					noteManager.state.userStats.maxNoteBytes,
				)
			} else {
				currentNoteSize.value = '0 MB'
				currentNotePercent.value = '0 %'
			}
		}
	},
	{ immediate: true },
)

let clickCount = 0
let firstClick = Date.now() - 2000
const boxClicked = () => {
	if (Date.now() - firstClick > 2000) {
		clickCount = 0
		firstClick = Date.now()
	}
	if (++clickCount >= 10) {
		clickCount = 0
		firstClick = Date.now() - 2000
		showLog.value = true
	}
}

const resetBoxClicks = () => {
	clickCount = 0
	firstClick = Date.now() - 2000
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
