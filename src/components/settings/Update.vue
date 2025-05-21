<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-update">Update</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="leading-7">
		<div class="mt-4 px-1">
			<select v-model="settingsManager.updateMode">
				<option :value="UpdateMode.AutomaticOnIdle">Automatic - when idle (default)</option>
				<option :value="UpdateMode.AutomaticOnStart">Automatic - on startup</option>
				<option :value="UpdateMode.StrongNotify">Manual - notify me clearly</option>
				<option :value="UpdateMode.DiscreteNotify">Manual - notify me discretely</option>
				<option :value="UpdateMode.ManualOnly">Manual - do not notify me</option>
				<option :value="UpdateMode.Off">Off - stay on this version</option>
			</select>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.AutomaticOnIdle" class="mt-1 px-2">
			<li>Updates that do not require restart will happen automatically when you are not actively using the app.</li>
			<li v-if="isIos">Larger updates will happen like normal through the AppStore</li>
			<li v-if="isAndroid">Larger updates will happen like normal through Google Play</li>
			<li v-if="isMacOrWindows">
				Updates that require restarting the application will happen automatically when you restart the application.
			</li>
			<li v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will happen through the
				normal flow here.
			</li>
			<li v-if="isLinux">
				If you have installed the application manually you will be notified when an update to the Electron host is
				available.
			</li>
			<li>Your current tree and note position will be preserved.</li>
			<li>Updates will never happen if you have unsaved data.</li>
			<li>The experience aims to be completely seamless.</li>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.AutomaticOnStart" class="mt-1 px-2">
			<li>Updates automatically when you restart the application.</li>
			<li v-if="isIos">Larger updates will happen like normal through the AppStore</li>
			<li v-if="isAndroid">Larger updates will happen like normal through Google Play</li>
			<li v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will happen through the
				normal flow here.
			</li>
			<li v-if="isLinux">
				If you have installed the application manually you will be notified when an update to the Electron host is
				available.
			</li>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.StrongNotify" class="mt-1 px-2">
			<li>
				Notification will be shown like this
				<div class="inline-block relative ml-2 top-1">
					<NotificationActiveIcon class="w-9 h-7 p-px no-drag"></NotificationActiveIcon>
					<div class="absolute bottom-0 left-px w-2 h-2 rounded bg-bad"></div>
				</div>
				in the titlebar and like this
				<div class="inline-block relative ml-2 top-1">
					<CogIcon class="w-9 h-7 p-px no-drag"></CogIcon>
					<div class="absolute bottom-0 right-px w-2 h-2 rounded bg-bad"></div>
				</div>
				and this
				<div class="inline-block relative ml-2 top-1">
					<DownloadIcon class="w-9 h-7 p-px no-drag"></DownloadIcon>
					<div class="absolute bottom-0 right-px w-2 h-2 rounded bg-bad"></div>
				</div>
				the System area in the treeview
			</li>
			<li>The update can then be manually performed from here.</li>
			<li v-if="isIos">Larger updates will happen like normal through the AppStore</li>
			<li v-if="isAndroid">Larger updates will happen like normal through Google Play</li>
			<li v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will happen through the
				normal flow here.
			</li>
			<li v-if="isLinux">
				If you have installed the application manually you will be notified when an update to the Electron host is
				available.
			</li>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.DiscreteNotify" class="mt-1 px-2">
			<li>
				Notification will be shown like this
				<div class="inline-block relative ml-2 top-1">
					<NotificationActiveIcon class="w-9 h-7 p-px no-drag"></NotificationActiveIcon>
				</div>
				in the titlebar and like this
				<div class="inline-block relative ml-2 top-1">
					<DownloadIcon class="w-9 h-7 p-px no-drag"></DownloadIcon>
					<div class="absolute bottom-0 right-px w-2 h-2 rounded bg-bad"></div>
				</div>
				the System area in the treeview
			</li>
			<li>The update can then be manually performed from here.</li>
			<li v-if="isIos">Larger updates will happen like normal through the AppStore</li>
			<li v-if="isAndroid">Larger updates will happen like normal through Google Play</li>
			<li v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will happen through the
				normal flow here.
			</li>
			<li v-if="isLinux">
				If you have installed the application manually you will be notified when an update to the Electron host is
				available.
			</li>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.ManualOnly" class="mt-1 px-2">
			<li>No notification will be shown, you will need to manually check for updates from here</li>
			<li v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will still happen
				through the normal flow here.
			</li>
			<li v-if="isIos">Larger updates will still happen like normal through the AppStore (outside our control)</li>
			<li v-if="isAndroid">Larger updates will still happen like normal through Google Play (outside our control)</li>
		</div>
		<div v-if="settingsManager.updateMode === UpdateMode.Off" class="mt-1 px-2">
			<p v-if="isLinux">
				If you have installed via FlatHub or Snap Store updates to the Electron host application will still happen
				through the normal flow here.
			</p>
			<p v-if="isIos">Larger updates will still happen like normal through the AppStore (outside our control)</p>
			<p v-if="isAndroid">Larger updates will still happen like normal through Google Play (outside our control)</p>
		</div>
	</div>
	<div v-if="showNoUpdatesFound && settingsManager.updateMode !== UpdateMode.Off" class="p-2 mt-4 leading-5">
		<div>No new updates found</div>
		<div class="mt-2">Current version: {{ updateManager.currentVersion }}</div>
		<div>Latest version: {{ updateManager.latestVersion ?? updateManager.currentVersion }}</div>
	</div>
	<div
		v-if="!updateManager.isUpdateAvailable && settingsManager.updateMode !== UpdateMode.Off"
		class="max-w-[30rem] pt-5 pl-1"
	>
		<button @click="checkUpdates" class="w-52">Check for updates</button>
	</div>
	<div v-if="updateManager.isUpdateAvailable && settingsManager.updateMode !== UpdateMode.Off" class="p-1 mt-4">
		<div class="mb-14 max-w-[30rem]">
			<h1 class="font-bold text-size-header">Update available</h1>
			<div class="flex flex-col w-full items-center">
				<div class="pb-1 pt-4 flex">
					<div class="w-32">Current Version:</div>
					<div class="w-16 text-right">{{ updateManager.currentVersion }}</div>
				</div>
				<div class="py-1 flex">
					<div class="w-32">New Version:</div>
					<div class="w-16 text-right">{{ updateManager.latestVersion }}</div>
				</div>
			</div>
		</div>
		<div v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinux" class="max-w-[30rem]">
			<div class="relative max-w-[30rem] h-[30px] border border-solid border-dialog-border">
				<div class="h-[30px] bg-progress-indicator progress"></div>
				<div
					v-if="running && stage === 'download'"
					class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
				>
					{{ downloadedBytes }} / {{ totalBytes }} &nbsp; ({{ bytesPerSec }})
				</div>
				<div
					v-if="running && stage === 'verify'"
					class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
				>
					Verifying Signature...
				</div>
				<div
					v-if="running && stage === 'install'"
					class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
				>
					Installing...
				</div>
				<div v-if="running && stage === 'ready'" class="absolute h-full w-full top-0 left-0 text-center leading-[27px]">
					Restart to activate new version
				</div>
			</div>
		</div>
		<div
			v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinux"
			class="mt-2 flex justify-end gap-2 max-w-[30rem]"
		>
			<button v-if="!running" @click="update">Update</button>
			<!-- <button class="secondary w-32" v-if="!running" @click="later">Maybe Later</button> -->
			<button v-if="running && stage === 'ready'" @click="restart">Restart</button>
			<button class="secondary" v-if="running && (stage === 'download' || stage === 'ready')" @click="cancel">
				Cancel
			</button>
		</div>
		<div v-if="updateManager.isHostUpdate && mimiriPlatform.isLinux" class="max-w-[30rem]">
			<div class="py-3">An update of the Electron Client is available here:</div>
			<div class="py-2">
				Direct download: <a :href="updateManager.downloadUrl" target="_blank">{{ updateManager.downloadName }}</a>
			</div>
			<div class="py-2"><a href="https://mimiri.io/#downloads" target="_blank">Other download options</a></div>
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
		<ItemHeader>New in this update</ItemHeader>
		<div class="mt-5 mb-1 font-semibold">Version:</div>
		<ul class="list-disc ml-5">
			<li class="py-1">{{ updateManager.currentVersion }} -> {{ updateManager.latestVersion }}</li>
		</ul>
		<div class="mt-5 mb-1 font-semibold">New features and changes:</div>
		<ul class="list-disc ml-5">
			<template v-for="item of updateManager.features" :key="item.id">
				<li class="py-1">Feature: {{ item.text }}</li>
			</template>
		</ul>
		<div class="mt-4 mb-1 font-semibold">Fixes:</div>
		<ul class="list-disc ml-5">
			<template v-for="item of updateManager.fixes" :key="item.id">
				<li class="py-1">Fix: {{ item.text }}</li>
			</template>
		</ul>
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

const running = ref(false)
const stage = ref('')
const total = ref(0)
const downloaded = ref(0)
const progress = ref('0px')
const downloadedBytes = ref('')
const totalBytes = ref('')
const bytesPerSec = ref('')
const showNoUpdatesFound = ref(false)

const isLinux = computed(() => mimiriPlatform.isLinux)
const isMacOrWindows = computed(() => mimiriPlatform.isWindows || mimiriPlatform.isMac)
const isIos = computed(() => mimiriPlatform.isIos)
const isAndroid = computed(() => mimiriPlatform.isAndroid)

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
const later = () => {
	// showUpdate.value = false
}

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
