<template>
	<dialog class="bg-dialog text-text desktop:border border-solid border-dialog-border" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">Generate Password</DialogTitle>
			<main class="px-3">
				<PasswordGeneratorComp ref="passwordGenerator" mode="3rdp" @password="onPasswordGenerated" />
				<div class="p-1 mt-2">
					<a href="https://mimiri.io/passwords" target="_blank">How is this calculated?</a>
				</div>
				<div class="p-1 mt-4 m-aut0 flex">
					<div class="w-24 flex items-center">Password:</div>
					<div class="w-48 text-right relative desktop:flex">
						<input v-model="password" tabindex="2" :type="passwordFieldType" class="basic-input" autofocus />
						<div class="w-0 h-0 pt-1 overflow-visible select-none">
							<RefreshIcon class="w-5 h-5 ml-2" @click="regeneratePassword" />
						</div>

						<div class="desktop:w-0 desktop:h-0 overflow-visible">
							<div class="absolute right-2 invisible desktop:visible" @mousedown="showPassword" @mouseup="hidePassword">
								<ShowPasswordIcon v-if="passwordFieldType === 'password'" class="w-5 h-5 mt-1" />
								<ShowingPasswordIcon v-if="passwordFieldType === 'text'" class="w-5 h-5 mt-1" />
							</div>
						</div>
					</div>
				</div>
			</main>
			<footer class="flex justify-end mobile:justify-center items-center gap-2 pr-2 pb-2">
				<button class="primary" @click="copyPassword">Copy</button>
				<button class="secondary" @click="close">Close</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PasswordGeneratorComp from '../elements/PasswordGenerator.vue'
import ShowPasswordIcon from '../../icons/show-password.vue'
import ShowingPasswordIcon from '../../icons/showing-password.vue'
import { clipboardManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import RefreshIcon from '../../icons/refresh.vue'

const passwordGenerator = ref(null)
const password = ref('')
const dialog = ref(null)
const passwordFieldType = ref('password')

onMounted(() => {})

const onPasswordGenerated = pwd => {
	password.value = pwd
}

const copyPassword = () => {
	clipboardManager.write(password.value)
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
