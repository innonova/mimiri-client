<template>
	<div id="title-bar" class="w-full h-[36px] pl-px select-none drag" />
	<div class="m-auto p-10">
		<div class="mb-14">
			<h1 class="text-center font-bold text-size-header">Convert Existing Account</h1>
		</div>
		<div class="w-[300px] m-auto">
			<div class="relative w-[300px] h-[30px] border border-solid border-dialog-border">
				<div class="h-[30px] bg-progress-indicator progress" />
				<div
					v-if="running && convertedNodes === 0"
					class="absolute h-full w-full top-0 left-0 text-center leading-[27px]"
				>
					Initializing...
				</div>
				<div v-if="convertedNodes > 0" class="absolute h-full w-full top-0 left-0 text-center leading-[27px]">
					{{ convertedNodes }} nodes converted
				</div>
			</div>
		</div>
		<div class="w-[300px] mt-2 m-auto flex justify-end">
			<button tabindex="1" class="primary" :disabled="running" @click="convert">Convert</button>
			<button tabindex="2" class="secondary" :disabled="running" @click="cancel">Cancel</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { conversionData, showConvertAccount } from '../global'

const convertedNodes = ref(0)
const progress = ref('0px')
const running = ref(false)

const convert = async () => {
	if (!running.value) {
		running.value = true
		try {
			// await noteManager.importAccount(
			// 	conversionData.value.username,
			// 	conversionData.value.password,
			// 	(converted, completed, total) => {
			// 		convertedNodes.value = converted
			// 		let progressAmount = (300 * completed) / total
			// 		if (progressAmount < 10) {
			// 			progressAmount = 10
			// 		}
			// 		progress.value = `${progressAmount}px`
			// 	},
			// )
			showConvertAccount.value = false
		} finally {
			running.value = false
		}
	}
}

const cancel = () => {
	conversionData.value = { username: '', password: '' }
	showConvertAccount.value = false
}
</script>

<style scoped>
.progress {
	width: v-bind(progress);
}
</style>
