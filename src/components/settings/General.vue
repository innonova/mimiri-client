<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default" data-testid="settings-view-general">General</div>
	</div>
	<div class="bg-info h-2 mb-2 mr-2"></div>
	<div class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="darkMode" class="mr-1 relative top-0.5" />
			Dark Mode
		</label>
	</div>
	<div
		v-if="mimiriPlatform.isPc && !mimiriPlatform.isFlatpak && !mimiriPlatform.isWeb"
		class="p-1 pt-2 m-auto text-left"
	>
		<label>
			<input type="checkbox" v-model="openAtLogin" class="mr-1 relative top-0.5" />
			Lunch Mimiri Notes on Login
		</label>
	</div>
	<div v-if="mimiriPlatform.isPc && !mimiriPlatform.isWeb" class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="showInTaskBar" class="mr-1 relative top-0.5" />
			Show in Taskbar
		</label>
	</div>
	<div v-if="mimiriPlatform.isWindows" class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="keepTrayIconVisible" class="mr-1 relative top-0.5" />
			Keep Tray Icon Visible
		</label>
	</div>
	<div class="mt-10 max-w-[30rem] mr-2">
		<hr />
		<div class="w-full flex justify-end mt-2 gap-2">
			<button :disabled="!canSave" @click="save">Save</button>
			<!-- <button class="secondary" @click="close">Close</button> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { settingsManager } from '../../services/settings-manager'
import { mimiriPlatform } from '../../services/mimiri-platform'

const emit = defineEmits(['close'])

const darkMode = ref(false)
const openAtLogin = ref(false)
const showInTaskBar = ref(false)
const keepTrayIconVisible = ref(false)
const canSave = computed(
	() =>
		darkMode.value !== settingsManager.darkMode ||
		keepTrayIconVisible.value !== settingsManager.keepTrayIconVisible ||
		showInTaskBar.value !== settingsManager.showInTaskBar ||
		openAtLogin.value !== settingsManager.openAtLogin,
)

onMounted(() => {
	darkMode.value = settingsManager.darkMode
	keepTrayIconVisible.value = settingsManager.keepTrayIconVisible
	showInTaskBar.value = settingsManager.showInTaskBar
	openAtLogin.value = settingsManager.openAtLogin
})

const close = () => {
	emit('close')
}

const save = () => {
	settingsManager.darkMode = darkMode.value
	settingsManager.keepTrayIconVisible = keepTrayIconVisible.value
	settingsManager.showInTaskBar = showInTaskBar.value
	settingsManager.openAtLogin = openAtLogin.value
}
</script>
