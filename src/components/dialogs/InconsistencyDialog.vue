<template>
	<dialog
		class="w-80 bg-dialog text-text desktop:border border-solid border-dialog-border"
		ref="dialog"
		data-testid="inconsistency-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto] gap-6">
			<DialogTitle @close="close">{{ $t('inconsistencyDialog.title') }}</DialogTitle>
			<main class="px-2 leading-5">
				<div class="mb-2">{{ $t('inconsistencyDialog.detected') }}</div>
				<div class="mb-2">{{ $t('inconsistencyDialog.reloadRecommended') }}</div>
			</main>
			<footer class="flex justify-end mobile:justify-center gap-2 pr-2 pb-2">
				<button class="primary" @click="reload" data-testid="inconsistency-dialog-reload">
					{{ $t('inconsistencyDialog.reload') }}
				</button>
				<button class="secondary" @click="close" data-testid="inconsistency-dialog-cancel">
					{{ $t('inconsistencyDialog.cancel') }}
				</button>
			</footer>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogTitle from '../elements/DialogTitle.vue'
const dialog = ref(null)
const isOpen = ref(false)
// const text = ref('')

const show = () => {
	isOpen.value = true
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const reload = () => {
	location.reload()
}

defineExpose({
	show,
})
</script>
