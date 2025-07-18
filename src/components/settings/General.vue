<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['General']" />
		<div class="overflow-y-auto pb-10">
			<div class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="darkMode" class="mr-1 relative top-0.5" />
					Dark Mode
				</label>
			</div>
			<div v-if="!mimiriPlatform.isDesktop || !alwaysEdit || env.DEV" class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="alwaysEdit" class="mr-1 relative top-0.5" />
					Always edit
				</label>
			</div>
			<div v-if="!mimiriPlatform.isDesktop || simpleEditor || env.DEV" class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="simpleEditor" class="mr-1 relative top-0.5" />
					Use simplified editor
				</label>
			</div>
			<div
				v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isFlatpak && !mimiriPlatform.isWeb"
				class="p-1 pt-2 m-auto text-left"
			>
				<label>
					<input type="checkbox" v-model="openAtLogin" class="mr-1 relative top-0.5" />
					Launch Mimiri Notes on Login
				</label>
			</div>
			<div v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isWeb" class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="showInTaskBar" class="mr-1 relative top-0.5" />
					Show in Taskbar
				</label>
			</div>
			<div v-if="mimiriPlatform.isWindowsApp" class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="keepTrayIconVisible" class="mr-1 relative top-0.5" />
					Keep Tray Icon Visible
				</label>
			</div>
			<div v-if="mimiriPlatform.isElectron" class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="closeOnX" class="mr-1 relative top-0.5" />
					Quit when closing application window
				</label>
			</div>
			<div class="p-1 pt-2 m-auto text-left">
				<label>
					<input type="checkbox" v-model="disableDevBlog" class="mr-1 relative top-0.5" />
					Disable Dev Blog
				</label>
			</div>
			<div v-if="mimiriPlatform.isLinuxApp" class="p-1 pt-2 m-auto text-left flex gap-2 items-center">
				<div>Tray icon color:</div>
				<select v-model="trayIcon">
					<option value="system">Auto</option>
					<option value="white">White</option>
					<option value="black">Black</option>
				</select>
			</div>
			<div class="mt-10 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-end mt-2 gap-2">
					<button :disabled="!canSave" @click="save" class="primary">Save</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { settingsManager } from '../../services/settings-manager'
import { mimiriPlatform } from '../../services/mimiri-platform'
import TabBar from '../elements/TabBar.vue'
import { env } from '../../global'

const emit = defineEmits(['close'])

const darkMode = ref(false)
const openAtLogin = ref(false)
const showInTaskBar = ref(false)
const keepTrayIconVisible = ref(false)
const closeOnX = ref(false)
const trayIcon = ref('system')
const disableDevBlog = ref(false)

const alwaysEdit = ref(true)
const simpleEditor = ref(false)

const canSave = computed(
	() =>
		darkMode.value !== settingsManager.darkMode ||
		keepTrayIconVisible.value !== settingsManager.keepTrayIconVisible ||
		showInTaskBar.value !== settingsManager.showInTaskBar ||
		openAtLogin.value !== settingsManager.openAtLogin ||
		closeOnX.value !== settingsManager.closeOnX ||
		trayIcon.value !== settingsManager.trayIcon ||
		alwaysEdit.value !== settingsManager.alwaysEdit ||
		simpleEditor.value !== settingsManager.simpleEditor ||
		disableDevBlog.value !== settingsManager.disableDevBlog,
)

onMounted(() => {
	darkMode.value = settingsManager.darkMode
	keepTrayIconVisible.value = settingsManager.keepTrayIconVisible
	showInTaskBar.value = settingsManager.showInTaskBar
	openAtLogin.value = settingsManager.openAtLogin
	closeOnX.value = settingsManager.closeOnX
	trayIcon.value = settingsManager.trayIcon
	alwaysEdit.value = settingsManager.alwaysEdit
	simpleEditor.value = settingsManager.simpleEditor
	disableDevBlog.value = settingsManager.disableDevBlog
})

const save = async () => {
	settingsManager.darkMode = darkMode.value
	settingsManager.keepTrayIconVisible = keepTrayIconVisible.value
	settingsManager.showInTaskBar = showInTaskBar.value
	settingsManager.openAtLogin = openAtLogin.value
	settingsManager.closeOnX = closeOnX.value
	settingsManager.trayIcon = trayIcon.value
	settingsManager.alwaysEdit = alwaysEdit.value
	settingsManager.simpleEditor = simpleEditor.value
	const reload = settingsManager.disableDevBlog !== disableDevBlog.value
	settingsManager.disableDevBlog = disableDevBlog.value
	if (reload) {
		window.location.reload()
	}
}
</script>
