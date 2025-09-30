<template>
	<div v-if="settingsManager.debugEnabled" class="flex flex-col h-full">
		<TabBar @selected="tabSelected" :items="['Settings', 'Errors', 'Messages', 'Latency', 'Functions']" />
		<div v-if="selectedTab === 'Settings'" class="w-full h-full overflow-y-auto">
			<div class="flex items-center gap-2 p-2">
				<button @click="testError" class="primary">Test Error</button>
				<button @click="clearErrors" class="primary">Clear Errors</button>
				<button @click="clearMessages" class="primary">Clear Messages</button>
				<button @click="clearLatency" class="primary">Clear Latency</button>
				<button @click="timeTravel" class="primary">Time Travel</button>
			</div>
			<hr class="my-2" />
			<div class="grid grid-cols-[1rem_8rem_8rem_10rem] gap-2 p-2 items-center">
				<input id="pre-call-latency-enabled" type="checkbox" v-model="preCallLatencyEnabled" />
				<label for="pre-call-latency-enabled">Pre call latency</label>
				<div class="flex items-baseline gap-1">
					<input type="number" v-model="preCallLatency" class="border border-gray-300 w-24 rounded p-1" />ms
				</div>
				<div>
					<label class="flex items-center gap-1"
						><input type="checkbox" v-model="preCallLatencyRandom" /> Random (0-{{ preCallLatency }}ms)</label
					>
				</div>
				<input id="post-call-latency-enabled" type="checkbox" v-model="postCallLatencyEnabled" />
				<label for="post-call-latency-enabled">Post call latency</label>
				<div class="flex items-baseline gap-1">
					<input type="number" v-model="postCallLatency" class="border border-gray-300 w-24 rounded p-1" />ms
				</div>
				<div>
					<label class="flex items-center gap-1"
						><input type="checkbox" v-model="postCallLatencyRandom" /> Random (0-{{ postCallLatency }}ms)</label
					>
				</div>
				<input id="call-error-frequency-enabled" type="checkbox" v-model="callErrorFrequencyEnabled" />
				<label for="call-error-frequency-enabled">Call error frequency</label>
				<div class="flex items-baseline gap-1">
					<input type="number" v-model="callErrorFrequency" class="border border-gray-300 w-24 rounded p-1" />%
				</div>
				<div />
				<div />
				<label for="call-error-delay">Call error delay</label>
				<div class="flex items-baseline gap-1">
					<input type="number" v-model="callErrorDelay" class="border border-gray-300 w-24 rounded p-1" />ms
				</div>
				<div />
				<div />
				<label for="latency-threshold-enabled">Latency Threshold</label>
				<div class="flex items-baseline gap-1">
					<input type="number" v-model="latencyThreshold" class="border border-gray-300 w-24 rounded p-1" />ms
				</div>
				<div />
				<div class="col-span-4 text-right">
					<button @click="save" class="primary mt-3">Save</button>
				</div>
			</div>
		</div>
		<div v-if="selectedTab === 'Errors'" class="w-full h-full overflow-y-auto pb-10">
			<div class="grid grid-cols-[10rem_auto] gap-2 p-2">
				<template v-for="error of errorLog" :key="error.id">
					<div @click="showStackId(error.id)" class="cursor-pointer text-gray-500">
						{{ formatDateTime(new Date(error.timestamp)) }}
					</div>
					<div @click="showStackId(error.id)" class="cursor-pointer">
						{{ error.message }}
					</div>
					<div v-if="stackIdShowing === error.id" class="col-span-2 text-gray-500 whitespace-pre-wrap">
						{{ error.stack }}
					</div>
				</template>
			</div>
		</div>
		<div v-if="selectedTab === 'Messages'" class="w-full h-full overflow-y-auto pb-10">
			<div class="grid grid-cols-[10rem_auto] gap-2 p-2">
				<template v-for="message of messageLog" :key="message.id">
					<div class="text-gray-500">{{ formatDateTime(new Date(message.timestamp)) }}</div>
					<div>{{ message.message }}</div>
				</template>
			</div>
		</div>
		<div v-if="selectedTab === 'Latency'" class="w-full h-full overflow-y-auto pb-10">
			<div class="grid grid-cols-[10rem_auto] gap-2 p-2">
				<template v-for="latency of latencyLog" :key="latency.id">
					<div class="text-gray-500">{{ formatDateTime(new Date(latency.timestamp)) }}</div>
					<div>{{ latency.message }}</div>
				</template>
			</div>
		</div>
		<div v-if="selectedTab === 'Functions'" class="w-full h-full overflow-y-auto pb-10">
			<div class="grid grid-cols-[10rem_10rem] gap-2 p-2">
				<button @click="enableAutoStart" class="primary">Enable AutoStart</button>
				<button @click="disableAutoStart" class="primary">Disable AutoStart</button>
				<button @click="saveFile" class="primary">Save File</button>
				<button @click="loadFile" class="primary">Load File</button>
				<button @click="saveFolder" class="primary">Save Folder</button>
				<button @click="loadFolder" class="primary">Load Folder</button>
			</div>
			<div class="p-2 whitespace-pre-wrap">
				{{ functionResult }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TabBar from '../elements/TabBar.vue'
import { settingsManager } from '../../services/settings-manager'
import { debug, ipcClient, noteManager } from '../../global'
import { formatDateTime } from '../../services/helpers'
import { emptyGuid } from '../../services/types/guid'
import { toBase64 } from '../../services/hex-base64'

const selectedTab = ref('Settings')
const errorLog = ref([])
const latencyLog = ref([])
const messageLog = ref([])
const stackIdShowing = ref(emptyGuid())

const preCallLatency = ref(1000)
const preCallLatencyEnabled = ref(false)
const preCallLatencyRandom = ref(false)
const postCallLatency = ref(1000)
const postCallLatencyEnabled = ref(false)
const postCallLatencyRandom = ref(false)
const callErrorFrequency = ref(10)
const callErrorFrequencyEnabled = ref(false)
const callErrorDelay = ref(0)
const latencyThreshold = ref(1000)

const functionResult = ref('')

onMounted(() => {
	preCallLatency.value = debug.settings.preCallLatency
	preCallLatencyEnabled.value = debug.settings.preCallLatencyEnabled
	preCallLatencyRandom.value = debug.settings.preCallLatencyRandom
	postCallLatency.value = debug.settings.postCallLatency
	postCallLatencyEnabled.value = debug.settings.postCallLatencyEnabled
	postCallLatencyRandom.value = debug.settings.postCallLatencyRandom
	callErrorFrequency.value = debug.settings.callErrorFrequency
	callErrorFrequencyEnabled.value = debug.settings.callErrorFrequencyEnabled
	callErrorDelay.value = debug.settings.callErrorDelay
	latencyThreshold.value = debug.settings.latencyThreshold
	errorLog.value = debug.errorLog
	messageLog.value = debug.messageLog
	latencyLog.value = debug.latencyLog
})

const showStackId = id => {
	if (stackIdShowing.value === id) {
		stackIdShowing.value = emptyGuid()
	} else {
		stackIdShowing.value = id
	}
}

const tabSelected = item => {
	if (item === 'Settings') {
		selectedTab.value = 'Settings'
	} else if (item === 'Errors') {
		selectedTab.value = 'Errors'
		errorLog.value = debug.errorLog
	} else if (item === 'Messages') {
		selectedTab.value = 'Messages'
		messageLog.value = debug.messageLog
	} else if (item === 'Latency') {
		selectedTab.value = 'Latency'
		latencyLog.value = debug.latencyLog
	} else if (item === 'Functions') {
		selectedTab.value = 'Functions'
	} else {
		selectedTab.value = ''
	}
}
const save = () => {
	debug.saveSettings({
		preCallLatency: preCallLatency.value,
		preCallLatencyEnabled: preCallLatencyEnabled.value,
		preCallLatencyRandom: preCallLatencyRandom.value,
		postCallLatency: postCallLatency.value,
		postCallLatencyEnabled: postCallLatencyEnabled.value,
		postCallLatencyRandom: postCallLatencyRandom.value,
		callErrorFrequency: callErrorFrequency.value,
		callErrorFrequencyEnabled: callErrorFrequencyEnabled.value,
		callErrorDelay: callErrorDelay.value,
		latencyThreshold: latencyThreshold.value,
	})
}

const testError = () => {
	throw new Error('This is a test error')
}

const clearErrors = () => {
	debug.clearErrorLog()
}

const clearMessages = () => {
	debug.clearMessageLog()
}

const clearLatency = () => {
	debug.clearLatencyLog()
}

const timeTravel = () => {
	noteManager.state.created = new Date(noteManager.state.created.getTime() - 25 * 60 * 60 * 1000)
}

const enableAutoStart = async () => {
	functionResult.value = 'Enable AutoStart clicked'
	if (ipcClient.isAvailable) {
		await ipcClient.os.setAutoStart(true)
	}
}

const disableAutoStart = async () => {
	functionResult.value = 'Disable AutoStart clicked'
	if (ipcClient.isAvailable) {
		await ipcClient.os.setAutoStart(false)
	}
}

const saveFile = async () => {
	functionResult.value = 'Save File clicked'
	if (ipcClient.isAvailable) {
		const base64Data = await toBase64(new TextEncoder().encode('TEST'))
		const result = await ipcClient.fileSystem.saveFile(
			{ path: '', isFolder: false, content: base64Data },
			{
				title: 'Save Test File',
				filters: [{ name: 'Text Files', extensions: ['txt'] }],
			},
		)
		functionResult.value += JSON.stringify(result, null, 2)
	}
}

const loadFile = async () => {
	functionResult.value = 'Load File clicked'
	if (ipcClient.isAvailable) {
		const result = await ipcClient.fileSystem.loadFile()
		functionResult.value += JSON.stringify(result, null, 2)
	}
}

const saveFolder = async () => {
	functionResult.value = 'Save Folder clicked'
	if (ipcClient.isAvailable) {
		const files = [
			{ path: 'test.txt', isFolder: false, content: await toBase64(new TextEncoder().encode('TEST')) },
			{ path: 'test2.txt', isFolder: false, content: await toBase64(new TextEncoder().encode('TEST 2')) },
			{ path: 'sub/test3.txt', isFolder: false, content: await toBase64(new TextEncoder().encode('TEST 3')) },
			{ path: 'sub2/test4.txt', isFolder: false, content: await toBase64(new TextEncoder().encode('TEST 4')) },
			{ path: 'sub2/subsub/test5.txt', isFolder: false, content: await toBase64(new TextEncoder().encode('TEST 5')) },
		]
		const result = await ipcClient.fileSystem.saveFolder(files, { title: 'Save Test Folder' })
		functionResult.value += JSON.stringify(result, null, 2)
	}
}

const loadFolder = async () => {
	functionResult.value = 'Load Folder clicked'
	if (ipcClient.isAvailable) {
		const result = await ipcClient.fileSystem.loadFolder()
		functionResult.value += JSON.stringify(result, null, 2)
	}
}
</script>
