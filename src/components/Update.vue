<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag"></div>
	<div class="m-auto p-1">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Mimiri Update</h1>
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
		<div v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinux" class="w-[300px] m-auto">
			<div class="relative w-[300px] h-[30px] border border-solid border-dialog-border">
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
		<div v-if="!updateManager.isHostUpdate || !mimiriPlatform.isLinux" class="mt-2 m-auto flex justify-end">
			<button class="bg-button-primary text-button-primary-text mr-2 hover:opacity-80" v-if="!running" @click="update">
				Update
			</button>
			<button
				class="bg-button-secondary text-button-secondary-text w-32 hover:opacity-80"
				v-if="!running"
				@click="later"
			>
				Maybe Later
			</button>
			<button
				class="bg-button-primary text-button-primary-text w-32 mr-2 hover:opacity-80"
				v-if="running && stage === 'ready'"
				@click="restart"
			>
				Restart
			</button>
			<button
				class="bg-button-primary text-button-primary-text w-32 hover:opacity-80"
				v-if="running && (stage === 'download' || stage === 'ready')"
				@click="cancel"
			>
				Cancel
			</button>
		</div>
		<div v-if="updateManager.isHostUpdate && mimiriPlatform.isLinux">
			<div class="py-3">An update of the Electron Client is available here:</div>
			<div class="py-2">
				Direct download: <a :href="updateManager.downloadUrl" target="_blank">{{ updateManager.downloadName }}</a>
			</div>
			<div class="py-2"><a href="https://mimiri.io/#downloads" target="_blank">Other download options</a></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { showUpdate, updateManager } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'

const running = ref(false)
const stage = ref('')
const total = ref(0)
const downloaded = ref(0)
const progress = ref('0px')
const downloadedBytes = ref('')
const totalBytes = ref('')
const bytesPerSec = ref('')

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

const update = async () => {
	running.value = true
	cancelled = false
	const start = performance.now()
	version = updateManager.latestVersion
	await updateManager.download(version, status => {
		console.log(status)

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

		let progressAmount = (300 * status.downloaded) / status.total
		if (progressAmount < 10) {
			progressAmount = 10
		}
		progress.value = `${progressAmount}px`
		return true
	})
	if (!cancelled) {
		stage.value = 'ready'
	}
	// running.value = false
}
const later = () => {
	showUpdate.value = false
}

const restart = async () => {
	await updateManager.use(version)
}

const cancel = () => {
	cancelled = true
	running.value = false
	downloaded.value = 0
	progress.value = '0px'
	if (stage.value === 'ready') {
		showUpdate.value = false
	}
}
</script>

<style scoped>
.progress {
	width: v-bind(progress);
}
</style>
