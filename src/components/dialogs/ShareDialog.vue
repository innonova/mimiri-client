<template>
	<dialog
		class="bg-dialog desktop:border border-solid border-dialog-border text-text"
		ref="dialog"
		data-testid="share-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto]">
			<DialogTitle @close="close">{{ $t('shareDialog.title') }}</DialogTitle>
			<form @submit.prevent="submitDialog" class="mx-2 mt-5 mb-2 mobile:mx-8">
				<div class="grid grid-cols-[5.5rem_10rem] mobile:grid-cols-[5.5rem_auto] items-center gap-2 mx-2 mb-2">
					<div v-if="code" class="col-span-2 flex flex-col items-center">
						<div class="text-center leading-5">
							{{ $t('shareDialog.codeInstruction', { name, noteName }) }}
						</div>
						<div class="text-size-header my-5 flex gap-1 items-center">
							<div class="mb-1 ml-2" data-testid="share-code">{{ code }}</div>
							<div class="w-6 ml-px">
								<CopyIcon
									v-if="!copied"
									:title="$t('shareDialog.copy')"
									@click="copyCode"
									class="w-5 hover:w-6 cursor-pointer"
								/>
								<div v-if="copied" class="ml-1 mb-1 cursor-default select-none text-size-base">
									{{ $t('shareDialog.copied') }}
								</div>
							</div>
						</div>
						<div class="text-center leading-5">
							{{ $t('shareDialog.acceptInstruction', { name }) }}
						</div>
						<div class="info mt-4">
							<div class="text-left leading-5">
								{{ $t('shareDialog.loseCodeHint', { noteName, name }) }}
							</div>
							<div class="text-left leading-5 mt-3">
								{{ $t('shareDialog.multipleUsersHint') }}
							</div>
						</div>
					</div>
					<div v-if="!code" class="col-span-2 mb-1">{{ $t('shareDialog.shareWith', { noteName }) }}</div>
					<input
						v-if="!code"
						ref="nameInput"
						class="basic-input col-span-2"
						type="text"
						autofocus
						v-model="name"
						:class="{ invalid: invalid }"
						data-testid="share-username-input"
					/>
					<div v-if="invalid || shareWithSelf || shareFailed" />
					<div v-if="invalid" class="text-error leading-4">{{ $t('shareDialog.invalidUsername') }}</div>
					<div v-if="shareWithSelf" class="text-error leading-4">{{ $t('shareDialog.shareWithSelf') }}</div>
					<div v-if="shareFailed" class="text-error leading-4">
						{{ $t('shareDialog.shareFailed') }}
					</div>
					<div v-if="!code" class="col-span-2 flex flex-col items-center">
						<div class="info mt-2">
							<div class="text-left leading-5">
								{{ $t('shareDialog.enterUsernameHint', { noteName }) }}
							</div>
							<div class="text-left leading-5 mt-3">
								{{ $t('shareDialog.codeHint') }}
							</div>
						</div>
					</div>
					<div v-if="code" class="col-span-2 flex justify-center gap-2 mt-4">
						<button class="primary" type="button" @click="close" data-testid="share-close-button">
							{{ $t('shareDialog.close') }}
						</button>
					</div>
					<div v-if="!code" class="col-span-2 flex justify-end mobile:justify-center gap-2 mt-2 mobile:mt-8">
						<LoadingIcon v-if="loading" class="animate-spin w-8 h-8 mr-2 inline-block" />
						<button v-if="!loading" class="primary" data-testid="share-ok-button">{{ $t('shareDialog.ok') }}</button>
						<button class="secondary" type="button" @click="close" data-testid="share-cancel-button">
							{{ $t('shareDialog.cancel') }}
						</button>
					</div>
				</div>
			</form>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { clipboardManager, env, noteManager } from '../../global'
import LoadingIcon from '../../icons/loading.vue'
import DialogTitle from '../elements/DialogTitle.vue'
import CopyIcon from '../../icons/copy.vue'
import { mimiriApi } from '../../services/storage/mimiri-api'
const dialog = ref(null)
const nameInput = ref(null)
const code = ref('')
const trimmedName = ref('')
const isOpen = ref(false)

const noteName = ref('')
const name = ref('')
const invalid = ref(false)
const shareWithSelf = ref(false)
const shareFailed = ref(false)
const copied = ref(false)
const loading = ref(false)

// const hasSelectedNode = computed(() => !!noteManager.state.selectedNoteId)
// const parentName = computed(() => noteManager.tree.selectedViewModel()?.title)

const copyCode = () => {
	clipboardManager.write(code.value)
	copied.value = true
	setTimeout(() => (copied.value = false), 1000)
}

if (env.DEV) {
	watch(mimiriApi.state, () => {
		if (mimiriApi.state.shareCode) {
			code.value = mimiriApi.state.shareCode
		}
	})
}

const show = async () => {
	noteName.value = noteManager.tree.selectedNote()?.title
	name.value = ''
	code.value = ''
	loading.value = false
	invalid.value = false
	shareWithSelf.value = false
	shareFailed.value = false
	isOpen.value = true
	dialog.value.showModal()
	await nextTick()
	nameInput.value?.focus()
}

const close = () => {
	dialog.value.close()
}

const submitDialog = async () => {
	invalid.value = false
	shareWithSelf.value = false
	shareFailed.value = false
	if (name.value.trim() === noteManager.state.username) {
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
		const response = await noteManager.tree.selectedNote().shareWith(trimmedName.value)
		code.value = response.code
	} catch (ex) {
		console.error('Error sharing note:', ex)
		shareFailed.value = true
	} finally {
		loading.value = false
	}
}

defineExpose({
	show,
})
</script>
