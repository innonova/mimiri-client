<template>
	<dialog
		class="bg-dialog desktop:border border-solid border-dialog-border text-text"
		ref="dialog"
		data-testid="accept-share-dialog"
	>
		<div class="grid grid-rows-[auto_1fr_auto]">
			<DialogTitle @close="close">Accept Share</DialogTitle>
			<form @submit.prevent="submitDialog" class="mx-2 mt-5 mb-2 mobile:mx-8">
				<div class="grid grid-cols-[4rem_10rem] mobile:grid-cols-[4rem_auto] items-center gap-2 mx-2 mb-2">
					<span class="whitespace-nowrap">Code:</span>
					<input
						ref="codeInput"
						class="basic-input"
						type="text"
						autofocus
						v-model="code"
						:class="{ invalid: invalid }"
						@keyup.enter="submitDialog"
						data-testid="share-code-input"
					>
					<div v-if="invalid" />
					<div v-if="invalid" class="text-error leading-4">No share found</div>
					<div class="col-span-2 flex justify-end mobile:justify-center gap-2 mt-2 mobile:mt-8">
						<LoadingIcon v-if="loading" class="animate-spin w-8 h-8 mr-2 inline-block" />
						<button v-if="!loading" class="primary" @click="submitDialog" data-testid="share-ok-button">OK</button>
						<button class="secondary" @click="close" data-testid="share-cancel-button">Cancel</button>
					</div>
				</div>
			</form>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import type { MimerNote } from '../../services/types/mimer-note'
import LoadingIcon from '../../icons/loading.vue'
const dialog = ref(null)
const code = ref('')
const codeInput = ref(null)
const loading = ref(null)

const invalid = ref(false)
let parent: MimerNote

const show = (note?: MimerNote) => {
	parent = note
	code.value = ''
	invalid.value = false
	loading.value = false
	dialog.value.showModal()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	invalid.value = false
	if (!code.value.trim()) {
		invalid.value = true
		codeInput.value.focus()
		return
	}
	try {
		loading.value = true
		const offer = await noteManager.note.getShareOffer(code.value.trim())
		if (offer) {
			await noteManager.note.acceptShare(offer, parent)
			close()
		} else {
			invalid.value = true
		}
	} finally {
		loading.value = false
	}
}

defineExpose({
	show,
})
</script>
