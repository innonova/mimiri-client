<template>
	<div class="flex flex-col h-full">
		<TabBar :items="[$t('settingsGeneral.tab')]" />
		<div class="overflow-y-auto pb-10">
			<div class="p-1 pt-2 m-auto text-left flex items-center">
				<div class="w-15">{{ $t('settingsGeneral.theme') }}</div>
				<select v-model="theme" class="ml-1">
					<option value="default">{{ $t('settingsGeneral.themeSystem') }}</option>
					<option value="light">{{ $t('settingsGeneral.themeLight') }}</option>
					<option value="dark">{{ $t('settingsGeneral.themeDark') }}</option>
				</select>
			</div>
			<div v-if="mimiriPlatform.isLinuxApp || env.DEV" class="p-1 pt-2 m-auto text-left flex items-center">
				<div class="w-15">{{ $t('settingsGeneral.trayIcon') }}</div>
				<select v-model="trayIcon" class="ml-1">
					<option value="system">{{ $t('settingsGeneral.trayIconSystem') }}</option>
					<option value="white">{{ $t('settingsGeneral.trayIconWhite') }}</option>
					<option value="black">{{ $t('settingsGeneral.trayIconBlack') }}</option>
				</select>
			</div>
			<div v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isWeb" class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.launchOnLoginTooltip')">
					<input type="checkbox" v-model="openAtLogin" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.launchOnLogin') }}
				</label>
			</div>
			<div v-if="mimiriPlatform.isWindowsApp" class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.showInTaskbarTooltip')">
					<input type="checkbox" v-model="showInTaskBar" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.showInTaskbar') }}
				</label>
			</div>
			<div v-if="mimiriPlatform.isWindowsApp" class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.keepTrayVisibleTooltip')">
					<input type="checkbox" v-model="keepTrayIconVisible" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.keepTrayVisible') }}
				</label>
			</div>
			<div v-if="mimiriPlatform.isElectron" class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.quitOnCloseTooltip')">
					<input type="checkbox" v-model="closeOnX" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.quitOnClose') }}
				</label>
			</div>
			<div class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.useChevronsTooltip')">
					<input type="checkbox" v-model="useChevrons" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.useChevrons') }}
				</label>
			</div>
			<div v-if="mimiriPlatform.isDesktop" class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.showVerticalGuidesTooltip')">
					<input type="checkbox" v-model="showVerticalGuides" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.showVerticalGuides') }}
				</label>
			</div>
			<div class="p-1 pt-2 m-auto text-left">
				<label :title="$t('settingsGeneral.disableDevBlogTooltip')">
					<input type="checkbox" v-model="disableDevBlog" class="mr-1 relative top-0.5" />
					{{ $t('settingsGeneral.disableDevBlog') }}
				</label>
			</div>
			<div class="mt-10 max-w-110 mr-2">
				<hr />
				<div class="w-full flex justify-end mt-2 gap-2">
					<button :disabled="!canSave" @click="save" class="primary">{{ $t('settingsGeneral.save') }}</button>
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

const theme = ref('default')
const openAtLogin = ref(false)
const showInTaskBar = ref(false)
const keepTrayIconVisible = ref(false)
const closeOnX = ref(false)
const trayIcon = ref('system')
const disableDevBlog = ref(false)
const useChevrons = ref(false)
const showVerticalGuides = ref(false)

const canSave = computed(
	() =>
		theme.value !== settingsManager.theme ||
		keepTrayIconVisible.value !== settingsManager.keepTrayIconVisible ||
		showInTaskBar.value !== settingsManager.showInTaskBar ||
		openAtLogin.value !== settingsManager.openAtLogin ||
		closeOnX.value !== settingsManager.closeOnX ||
		trayIcon.value !== settingsManager.trayIcon ||
		disableDevBlog.value !== settingsManager.disableDevBlog ||
		useChevrons.value !== settingsManager.useChevrons ||
		showVerticalGuides.value !== settingsManager.showVerticalGuides,
)

onMounted(() => {
	theme.value = settingsManager.theme
	keepTrayIconVisible.value = settingsManager.keepTrayIconVisible
	showInTaskBar.value = settingsManager.showInTaskBar
	openAtLogin.value = settingsManager.openAtLogin
	closeOnX.value = settingsManager.closeOnX
	trayIcon.value = settingsManager.trayIcon
	disableDevBlog.value = settingsManager.disableDevBlog
	useChevrons.value = settingsManager.useChevrons
	showVerticalGuides.value = settingsManager.showVerticalGuides
})

const save = async () => {
	settingsManager.theme = theme.value
	settingsManager.keepTrayIconVisible = keepTrayIconVisible.value
	settingsManager.showInTaskBar = showInTaskBar.value
	settingsManager.openAtLogin = openAtLogin.value
	settingsManager.closeOnX = closeOnX.value
	settingsManager.trayIcon = trayIcon.value
	const reload = settingsManager.disableDevBlog !== disableDevBlog.value
	settingsManager.disableDevBlog = disableDevBlog.value
	settingsManager.useChevrons = useChevrons.value
	settingsManager.showVerticalGuides = showVerticalGuides.value
	if (reload) {
		window.location.reload()
	}
}
</script>
