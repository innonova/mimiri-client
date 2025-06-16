<template>
	<dialog class="bg-dialog desktop:border border-solid border-dialog-border text-text" ref="dialog">
		<div class="grid grid-rows-[auto_1fr_auto]">
			<DialogTitle @close="close">Share Note</DialogTitle>
			<form v-on:submit.prevent="submitDialog" class="mx-2 mt-5 mb-2 mobile:mx-8">
				<div class="grid grid-cols-[5.5rem_10rem] mobile:grid-cols-[5.5rem_auto] items-center gap-2 mx-2 mb-2">
					<div v-if="code" class="col-span-2 flex flex-col items-center">
						<div class="text-center leading-5">Share this code with {{ name }} to complete the share</div>
						<div class="text-size-header my-5 flex gap-1 items-center">
							<div class="mb-1 ml-2">{{ code }}</div>
							<div class="w-6">
								<CopyIcon v-if="!copied" title="copy" @click="copyCode" class="w-5 hover:w-6 cursor-pointer"></CopyIcon>
								<div v-if="copied" class="ml-1 mb-1 cursor-default select-none text-size-base">Copied</div>
							</div>
						</div>
						<div class="text-center leading-5">
							{{ name }} will need to accept the share using the menu item 'Accept Share'
						</div>
						<div class="info mt-4">
							<div class="text-left leading-5">
								If you lose this code, simply share the note with {{ name }} again to show the code again.
							</div>
							<div class="text-left leading-5 mt-3">
								If you wish to share this note with multiple people you will need to repeat this process for each user.
							</div>
						</div>
					</div>
					<span v-if="!code">Share with:</span>
					<input
						v-if="!code"
						ref="nameInput"
						class="basic-input"
						type="text"
						autofocus
						v-model="name"
						:class="{ invalid: invalid }"
					/>
					<div v-if="invalid || shareWithSelf || shareFailed"></div>
					<div v-if="invalid" class="text-error leading-4">You must enter a username</div>
					<div v-if="shareWithSelf" class="text-error leading-4">You cannot share with yourself.</div>
					<div v-if="shareFailed" class="text-error leading-4">
						Unable to share, please verify username and internet connection.
					</div>
					<div v-if="!code" class="col-span-2 flex flex-col items-center">
						<div class="info mt-2">
							<div class="text-left leading-5">
								Enter the username of another user in the field above to share this note.
							</div>
							<div class="text-left leading-5 mt-3">
								The recipient will then need to accept this share to begin sharing this note and all child notes.
							</div>
						</div>
					</div>
					<div v-if="code" class="col-span-2 flex justify-center gap-2 mt-4">
						<button class="primary" type="button" @click="close">Close</button>
					</div>
					<div v-if="!code" class="col-span-2 flex justify-end mobile:justify-center gap-2 mt-2 mobile:mt-8">
						<LoadingIcon v-if="loading" class="animate-spin w-8 h-8 mr-2 inline-block"></LoadingIcon>
						<button v-if="!loading" class="primary">OK</button>
						<button class="secondary" type="button" @click="close">Cancel</button>
					</div>
				</div>
			</form>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { clipboardManager, features, noteManager } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
import DialogTitle from '../elements/DialogTitle.vue'
import CopyIcon from '../../icons/copy.vue'
const dialog = ref(null)
const nameInput = ref(null)
const code = ref('')
const trimmedName = ref('')

const name = ref('')
const invalid = ref(false)
const shareWithSelf = ref(false)
const shareFailed = ref(false)
const copied = ref(false)
const loading = ref(false)

const codeEnabled = features.includes('share-code')

const hasSelectedNode = computed(() => !!noteManager.state.selectedNoteId)
const parentName = computed(() => noteManager.selectedViewModel?.title)

const copyCode = () => {
	clipboardManager.write(code.value)
	copied.value = true
	setTimeout(() => (copied.value = false), 1000)
}

const show = () => {
	name.value = ''
	code.value = ''
	loading.value = false
	invalid.value = false
	shareWithSelf.value = false
	shareFailed.value = false
	dialog.value.showModal()
	nameInput.value?.focus()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	invalid.value = false
	shareWithSelf.value = false
	shareFailed.value = false
	if (name.value.trim() === noteManager.username) {
		shareWithSelf.value = true
		nameInput.value.focus()
		return
	}
	if (!name.value.trim()) {
		invalid.value = true
		nameInput.value.focus()
		return
	}
	trimmedName.value = name.value.trim()
	try {
		loading.value = true
		const response = await noteManager.selectedNote.shareWith(trimmedName.value)
		if (codeEnabled) {
			code.value = response.code
		} else {
			close()
			name.value = ''
		}
	} catch {
		shareFailed.value = true
	} finally {
		loading.value = false
	}
}

defineExpose({
	show,
})
</script>
