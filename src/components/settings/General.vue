<template>
	<div class="flex select-none">
		<div class="py-2 px-4 bg-info cursor-default">General</div>
	</div>
	<div class="bg-info w-full h-2 mb-2"></div>
	<div class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="darkMode" class="mr-1 relative top-0.5" />
			Dark Mode
		</label>
	</div>
	<div class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="openAtLogin" class="mr-1 relative top-0.5" />
			Lunch Mimiri Notes on Login
		</label>
	</div>
	<div class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="showInTaskBar" class="mr-1 relative top-0.5" />
			Show in Taskbar
		</label>
	</div>
	<div class="p-1 pt-2 m-auto text-left">
		<label>
			<input type="checkbox" v-model="keepTrayIconVisible" class="mr-1 relative top-0.5" />
			Keep Tray Icon Visible
		</label>
	</div>
	<div class="mt-10 w-full">
		<hr />
		<div class="w-full flex justify-end mt-2">
			<button :disabled="!canSave" @click="save">Save</button>
			<button class="secondary" @click="close">Close</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { settingsManager } from '../../services/settings-manager'

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
