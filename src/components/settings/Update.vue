<template>
	<div class="flex flex-col h-full">
		<TabBar :items="[$t('settingsUpdate.tab')]" />
		<div class="overflow-y-auto pb-10">
			<div class="leading-7">
				<div class="mt-2 px-1">
					<select v-model="settingsManager.updateMode" data-testid="update-mode-select">
						<option :value="UpdateMode.AutomaticOnIdle">{{ $t('settingsUpdate.autoIdle') }}</option>
						<option :value="UpdateMode.AutomaticOnStart">{{ $t('settingsUpdate.autoStart') }}</option>
						<option :value="UpdateMode.StrongNotify">{{ $t('settingsUpdate.strongNotify') }}</option>
						<option :value="UpdateMode.DiscreteNotify">{{ $t('settingsUpdate.discreteNotify') }}</option>
						<option :value="UpdateMode.ManualOnly">{{ $t('settingsUpdate.manualOnly') }}</option>
						<option :value="UpdateMode.Off">{{ $t('settingsUpdate.off') }}</option>
					</select>
				</div>
				<ul v-if="settingsManager.updateMode === UpdateMode.AutomaticOnIdle" class="mt-1 pl-6 list-disc">
					<li>
						{{ $t('settingsUpdate.descNoRestartAuto') }}
					</li>
					<li v-if="isIos">{{ $t('settingsUpdate.descIosAppStore') }}</li>
					<li v-if="isAndroid">{{ $t('settingsUpdate.descAndroidPlay') }}</li>
					<li v-if="isMacOrWindows">
						{{ $t('settingsUpdate.descMacWinRestart') }}
					</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxFlatHub') }}
					</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxManual') }}
					</li>
					<li>{{ $t('settingsUpdate.descPreservePosition') }}</li>
					<li>{{ $t('settingsUpdate.descNoUnsaved') }}</li>
					<li>{{ $t('settingsUpdate.descSeamless') }}</li>
				</ul>
				<ul v-if="settingsManager.updateMode === UpdateMode.AutomaticOnStart" class="mt-1 pl-6 list-disc">
					<li>{{ $t('settingsUpdate.descOnRestart') }}</li>
					<li v-if="isIos">{{ $t('settingsUpdate.descIosAppStore') }}</li>
					<li v-if="isAndroid">{{ $t('settingsUpdate.descAndroidPlay') }}</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxFlatHub') }}
					</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxManual') }}
					</li>
				</ul>
				<ul v-if="settingsManager.updateMode === UpdateMode.StrongNotify" class="mt-1 pl-6 list-disc">
					<li>
						{{ $t('settingsUpdate.descNotificationShown') }}
						<div class="inline-block relative ml-2 top-1">
							<NotificationActiveIcon class="w-9 h-7 p-px no-drag" />
							<div class="absolute bottom-0 left-px w-2 h-2 rounded-sm bg-bad" />
						</div>
						{{ $t('settingsUpdate.descInTitlebar') }}
						<div class="inline-block relative ml-2 top-1">
							<CogIcon class="w-9 h-7 p-px no-drag" />
							<div class="absolute bottom-0 right-px w-2 h-2 rounded-sm bg-bad" />
						</div>
						{{ $t('settingsUpdate.descAndThis') }}
						<div class="inline-block relative ml-2 top-1">
							<DownloadIcon class="w-9 h-7 p-px no-drag" />
							<div class="absolute bottom-0 right-px w-2 h-2 rounded-sm bg-bad" />
						</div>
						{{ $t('settingsUpdate.descInSystemArea') }}
					</li>
					<li>{{ $t('settingsUpdate.descManualPerform') }}</li>
					<li v-if="isIos">{{ $t('settingsUpdate.descIosAppStore') }}</li>
					<li v-if="isAndroid">{{ $t('settingsUpdate.descAndroidPlay') }}</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxFlatHub') }}
					</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxManual') }}
					</li>
				</ul>
				<ul v-if="settingsManager.updateMode === UpdateMode.DiscreteNotify" class="mt-1 pl-6 list-disc">
					<li>
						{{ $t('settingsUpdate.descNotificationShown') }}
						<div class="inline-block relative ml-2 top-1">
							<NotificationActiveIcon class="w-9 h-7 p-px no-drag" />
						</div>
						{{ $t('settingsUpdate.descInTitlebar') }}
						<div class="inline-block relative ml-2 top-1">
							<DownloadIcon class="w-9 h-7 p-px no-drag" />
							<div class="absolute bottom-0 right-px w-2 h-2 rounded-sm bg-bad" />
						</div>
						{{ $t('settingsUpdate.descInSystemArea') }}
					</li>
					<li>{{ $t('settingsUpdate.descManualPerform') }}</li>
					<li v-if="isIos">{{ $t('settingsUpdate.descIosAppStore') }}</li>
					<li v-if="isAndroid">{{ $t('settingsUpdate.descAndroidPlay') }}</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxFlatHub') }}
					</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descLinuxManual') }}
					</li>
				</ul>
				<ul v-if="settingsManager.updateMode === UpdateMode.ManualOnly" class="mt-1 pl-6 list-disc">
					<li>{{ $t('settingsUpdate.descNoNotification') }}</li>
					<li v-if="isLinux">
						{{ $t('settingsUpdate.descFlatHubStill') }}
					</li>
					<li v-if="isIos">{{ $t('settingsUpdate.descIosStill') }}</li>
					<li v-if="isAndroid">
						{{ $t('settingsUpdate.descAndroidStill') }}
					</li>
				</ul>
				<div v-if="settingsManager.updateMode === UpdateMode.Off" class="mt-1 px-2">
					<p v-if="isLinux">
						{{ $t('settingsUpdate.descFlatHubStill') }}
					</p>
					<p v-if="isIos">{{ $t('settingsUpdate.descIosStill') }}</p>
					<p v-if="isAndroid">{{ $t('settingsUpdate.descAndroidStill') }}</p>
				</div>
			</div>
			<div v-if="showNoUpdatesFound && settingsManager.updateMode !== UpdateMode.Off" class="p-2 mt-4 leading-5">
				<div>{{ $t('settingsUpdate.noUpdatesFound') }}</div>
				<div class="mt-2" data-testid="update-current-version">
					{{ $t('settingsUpdate.currentVersion') }} {{ updateManager.currentVersion }}
				</div>
				<div data-testid="update-latest-version">
					{{ $t('settingsUpdate.latestVersion') }} {{ updateManager.latestVersion ?? updateManager.currentVersion }}
				</div>
			</div>
			<div v-else class="pb-1 mt-3 pt-4 ml-2 flex">
				<div class="w-32">{{ $t('settingsUpdate.currentVersion') }}</div>
				<div class="w-16 text-right" data-testid="update-current-version">{{ updateManager.currentVersion }}</div>
			</div>
			<div
				v-if="!updateManager.isUpdateAvailable && settingsManager.updateMode !== UpdateMode.Off"
				class="max-w-110 pt-5 pl-1"
			>
				<button @click="checkUpdates" class="primary" data-testid="update-check-button">
					{{ $t('settingsUpdate.checkForUpdates') }}
				</button>
			</div>
			<div
				v-if="updateManager.isUpdateAvailable && settingsManager.updateMode !== UpdateMode.Off"
				class="p-1 mt-4"
				data-testid="update-available"
			>
				<div class="mb-14 max-w-110">
					<h1 class="font-bold text-size-header">{{ $t('settingsUpdate.updateAvailable') }}</h1>
					<div class="flex flex-col w-full items-center">
						<div class="pb-1 pt-4 flex">
							<div class="w-32">{{ $t('settingsUpdate.currentVersion') }}</div>
							<div class="w-16 text-right">{{ updateManager.currentVersion }}</div>
						</div>
						<div class="py-1 flex">
							<div class="w-32">{{ $t('settingsUpdate.newVersion') }}</div>
							<div class="w-16 text-right" data-testid="update-new-version">{{ updateManager.latestVersion }}</div>
						</div>
					</div>
				</div>
				<div v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinuxApp" class="max-w-110">
					<div class="relative max-w-110 h-[30px] border border-solid border-dialog-border">
						<div class="h-[30px] bg-progress-indicator progress" />
						<div
							v-if="running && stage === 'download'"
							class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
							data-testid="update-stage-download"
						>
							{{ downloadedBytes }} / {{ totalBytes }} &nbsp; ({{ bytesPerSec }})
						</div>
						<div
							v-if="running && stage === 'verify'"
							class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
							data-testid="update-stage-verify"
						>
							{{ $t('settingsUpdate.verifyingSignature') }}
						</div>
						<div
							v-if="running && stage === 'install'"
							class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
							data-testid="update-stage-install"
						>
							{{ $t('settingsUpdate.installing') }}
						</div>
						<div
							v-if="running && stage === 'ready'"
							class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
							data-testid="update-stage-ready"
						>
							{{ $t('settingsUpdate.restartToActivate') }}
						</div>
					</div>
				</div>
				<div
					v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinuxApp"
					class="mt-2 flex justify-end gap-2 max-w-110"
				>
					<button class="primary" v-if="!running" @click="update" data-testid="update-download-button">
						{{ $t('settingsUpdate.update') }}
					</button>
					<button
						class="primary"
						v-if="running && stage === 'ready'"
						@click="restart"
						data-testid="update-restart-button"
					>
						{{ $t('settingsUpdate.restart') }}
					</button>
					<button
						class="secondary"
						v-if="running && (stage === 'download' || stage === 'ready')"
						@click="cancel"
						data-testid="update-cancel-button"
					>
						{{ $t('settingsUpdate.cancel') }}
					</button>
				</div>
				<div
					v-if="
						updateManager.isHostUpdate &&
						mimiriPlatform.isLinuxApp &&
						!mimiriPlatform.isFlatHub &&
						!mimiriPlatform.isSnapStore
					"
					class="max-w-110"
				>
					<div class="py-3">{{ $t('settingsUpdate.electronClientRequired') }}</div>
					<div class="py-2">
						{{ $t('settingsUpdate.directDownload') }}
						<a :href="updateManager.downloadUrl" target="_blank">{{ updateManager.downloadName }}</a>
					</div>
					<div class="py-2">
						<a href="https://mimiri.io/#downloads" target="_blank">{{ $t('settingsUpdate.otherDownloadOptions') }}</a>
					</div>
				</div>
				<div
					v-if="
						updateManager.isHostUpdate &&
						mimiriPlatform.isLinuxApp &&
						(mimiriPlatform.isFlatHub || mimiriPlatform.isSnapStore)
					"
					class="max-w-110"
				>
					<div class="py-3">{{ $t('settingsUpdate.electronClientRequired') }}</div>
				</div>
			</div>
			<div
				v-if="
					(updateManager.features.length || updateManager.fixes.length) &&
					updateManager.latestVersion &&
					settingsManager.updateMode !== UpdateMode.Off
				"
				class="py-5 px-2"
			>
				<ItemHeader>{{ $t('settingsUpdate.newInUpdate') }}</ItemHeader>
				<div class="mt-5 mb-1 font-semibold">{{ $t('settingsUpdate.version') }}</div>
				<ul class="list-disc ml-5">
					<li class="py-1">{{ updateManager.currentVersion }} -> {{ updateManager.latestVersion }}</li>
				</ul>
				<div class="mt-5 mb-1 font-semibold">{{ $t('settingsUpdate.newFeaturesAndChanges') }}</div>
				<ul class="list-disc ml-5">
					<template v-for="(item, index) of updateManager.features" :key="index">
						<li class="py-1">{{ item.text }}</li>
					</template>
				</ul>
				<div class="mt-4 mb-1 font-semibold">{{ $t('settingsUpdate.fixes') }}</div>
				<ul class="list-disc ml-5">
					<template v-for="(item, index) of updateManager.fixes" :key="index">
						<li class="py-1">{{ item.text }}</li>
					</template>
				</ul>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { updateManager } from '../../global'
import { mimiriPlatform } from '../../services/mimiri-platform'
import ItemHeader from '../subscription/ItemHeader.vue'
import { settingsManager, UpdateMode } from '../../services/settings-manager'
import NotificationActiveIcon from '../../icons/notification-active.vue'
import CogIcon from '../../icons/cog.vue'
import DownloadIcon from '../../icons/download.vue'
import TabBar from '../elements/TabBar.vue'

const running = ref(false)
const stage = ref('')
const total = ref(0)
const downloaded = ref(0)
const progress = ref('0px')
const downloadedBytes = ref('')
const totalBytes = ref('')
const bytesPerSec = ref('')
const showNoUpdatesFound = ref(false)

const isLinux = computed(() => mimiriPlatform.isLinuxApp)
const isMacOrWindows = computed(() => mimiriPlatform.isWindowsApp || mimiriPlatform.isMacApp)
const isIos = computed(() => mimiriPlatform.isIosApp)
const isAndroid = computed(() => mimiriPlatform.isAndroidApp)

let cancelled = false
let version = ''

const kibi = 1024
const mibi = 1024 * 1024
const gibi = 1024 * 1024 * 1024

const bytesToText = (bytes: number) => {
	if (bytes < kibi) {
		return `${bytes} B`
	}
	if (bytes < mibi) {
		return `${Math.round((bytes / kibi) * 100) / 100} kB`
	}
	if (bytes < gibi) {
		return `${Math.round((bytes / mibi) * 100) / 100} MB`
	}
}

const checkUpdates = async () => {
	await updateManager.check()
	showNoUpdatesFound.value = !updateManager.isUpdateAvailable
}

const update = async () => {
	running.value = true
	cancelled = false
	const start = performance.now()
	version = updateManager.latestVersion
	await updateManager.download(version, status => {
		if (cancelled) {
			return false
		}
		if (status.error) {
			console.log(status)
			cancelled = true
			running.value = false
			downloaded.value = 0
			progress.value = '0px'
			return false
		}

		stage.value = status.stage

		const elapsed = performance.now() - start

		total.value = status.total
		downloaded.value = status.downloaded
		downloadedBytes.value = bytesToText(status.downloaded)
		totalBytes.value = bytesToText(status.total)
		bytesPerSec.value = `${bytesToText((status.downloaded * 1000) / elapsed)}/s`

		let progressAmount = (100 * status.downloaded) / status.total
		if (progressAmount < 10) {
			progressAmount = 10
		}
		progress.value = `${progressAmount}%`
		return true
	})
	if (!cancelled) {
		stage.value = 'ready'
	}
	// running.value = false
}
// const later = () => {
// showUpdate.value = false
// }

const restart = async () => {
	await updateManager.use(version, true)
}

const cancel = () => {
	cancelled = true
	running.value = false
	downloaded.value = 0
	progress.value = '0px'
	if (stage.value === 'ready') {
		// showUpdate.value = false
	}
}
</script>

<style scoped>
.progress {
	width: v-bind(progress);
}
</style>
