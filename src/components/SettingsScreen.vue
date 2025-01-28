<template>
	<div v-if="showSettings">
		<div class="flex items-center bg-title-bar select-none drag">
			<img
				v-if="mimiriPlatform.isPc && !mimiriPlatform.isMac"
				class="ml-1.5 mr-1 mt-px p-1 min-w-7 w-7 h-7"
				src="/img/logo.png"
			/>
			<div ref="titleBar" class="pl-2 text-size-title w-full h-full flex items-center">Settings</div>
			<button class="cursor-default w-7 h-7 outline-none m-1" @click="close">X</button>
		</div>
		<div class="flex flex-col md:flex-row mt-5 h-full">
			<div class="md:mr-10 select-none max-md:w-full flex flex-col max-md:mb-5">
				<template v-for="item of menuItems" :key="item.title">
					<div
						class="p-2 max-md:w-full max-md:text-center md:pl-5 md:pr-20"
						:class="{
							'bg-info cursor-default': item.id === selectedId,
							'cursor-pointer': item.id !== selectedId,
						}"
						@click="menuClick(item.id)"
					>
						{{ item.title }}
					</div>
				</template>
			</div>
			<div class="flex flex-col gap-16 w-full max-w-[500px]">
				<div class="mt-5">
					<div v-if="selectedId === 'general'">
						<GeneralSettings @close="close"></GeneralSettings>
					</div>
					<div v-if="selectedId === 'pin'">
						<PinCodeSettings @close="close"></PinCodeSettings>
					</div>
					<div v-if="selectedId === 'username'">
						<UsernameSettings @close="close"></UsernameSettings>
					</div>
					<div v-if="selectedId === 'password'">
						<PasswordSettings @close="close"></PasswordSettings>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, showSettings } from '../global'
import { mimiriPlatform } from '../services/mimiri-platform'
import GeneralSettings from './settings/General.vue'
import PinCodeSettings from './settings/PinCode.vue'
import UsernameSettings from './settings/Username.vue'
import PasswordSettings from './settings/Password.vue'

const selectedId = ref('general')

const menuItems = [
	...(mimiriPlatform.isElectron || (env.DEV && !mimiriPlatform.isPhone) ? [{ id: 'general', title: 'General' }] : []),
	...(mimiriPlatform.isElectron || (env.DEV && !mimiriPlatform.isPhone) ? [{ id: 'pin', title: 'PIN Code' }] : []),
	{ id: 'username', title: 'Username' },
	{ id: 'password', title: 'Password' },
]

const menuClick = (id: string) => {
	selectedId.value = id
}

const close = () => {
	showSettings.value = false
}

const show = (id: string) => {
	selectedId.value = id
	showSettings.value = true
}

defineExpose({
	show,
})
</script>
