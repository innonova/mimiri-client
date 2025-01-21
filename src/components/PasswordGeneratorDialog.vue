<template>
	<dialog class="min-w-96 bg-dialog text-text border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<header class="flex gap-8 justify-between items-center py-0.5 bg-title-bar">
				<div class="pl-2">Generate Password</div>
				<button class="cursor-default w-8" @click="close">X</button>
			</header>
			<main class="px-3">
				<PasswordGeneratorComp
					ref="passwordGenerator"
					mode="3rdp"
					@password="onPasswordGenerated"
				></PasswordGeneratorComp>
				<div class="p-1 mt-2">
					<a href="https://mimiri.io/passwords" target="_blank">How is this calculated?</a>
				</div>
				<div class="p-1 mt-4 m-aut0 flex">
					<div class="w-24 flex items-center">Password:</div>
					<div class="w-52 text-right relative md:flex">
						<input v-model="password" tabindex="2" :type="passwordFieldType" class="bg-input text-input-text" />
						<div class="md:w-0 md:h-0 overflow-visible">
							<div class="absolute right-1 invisible md:visible" @mousedown="showPassword" @mouseup="hidePassword">
								<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-6 h-6 mt-0.5"></ShowPasswordIcon>
								<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-6 h-6 mt-0.5"></ShowingPasswordIcon>
							</div>
						</div>
					</div>
				</div>
			</main>
			<footer class="flex justify-end items-center gap-2">
				<button class="bg-button-secondary text-button-secondary-text mb-2 hover:opacity-80" @click="copyPassword">
					Copy
				</button>
				<button
					class="bg-button-secondary text-button-secondary-text mb-2 hover:opacity-80"
					@click="regeneratePassword"
				>
					Generate
				</button>
				<button class="bg-button-secondary text-button-secondary-text mr-2 mb-2 hover:opacity-80" @click="close">
					Close
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PasswordGeneratorComp from './PasswordGenerator.vue'
import ShowPasswordIcon from '../icons/show-password.vue'
import ShowingPasswordIcon from '../icons/showing-password.vue'
import { Capacitor, registerPlugin } from '@capacitor/core'

const passwordGenerator = ref(null)
const password = ref('')
const dialog = ref(null)
const passwordFieldType = ref('password')

let clipboard
if (Capacitor.isPluginAvailable('MimiriClipboard')) {
	clipboard = registerPlugin<any>('MimiriClipboard')
}

const onPasswordGenerated = pwd => {
	password.value = pwd
}

const copyPassword = () => {
	if (clipboard) {
		clipboard.write({ text: password.value })
	} else {
		navigator.clipboard.writeText(password.value)
	}
}

const regeneratePassword = () => {
	passwordGenerator.value.regeneratePassword()
}

const showPassword = () => {
	passwordFieldType.value = 'text'
}

const hidePassword = () => {
	passwordFieldType.value = 'password'
}

const show = () => {
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

defineExpose({
	show,
})
</script>
