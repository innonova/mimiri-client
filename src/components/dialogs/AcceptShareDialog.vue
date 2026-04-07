<template>
	<dialog
		class="bg-dialog desktop:border border-solid border-dialog-border text-text"
		ref="dialog"
		data-testid="accept-share-dialog"
		@close="isOpen = false"
	>
		<div v-if="isOpen" class="grid grid-rows-[auto_1fr_auto]">
			<DialogTitle @close="close">{{ $t('acceptShareDialog.title') }}</DialogTitle>
			<form @submit.prevent="submitDialog" class="mx-2 mt-5 mb-2 mobile:mx-8">
				<div class="grid grid-cols-[4rem_10.2rem] mobile:grid-cols-[4rem_auto] items-center gap-2 mx-2 mb-2">
					<div class="col-span-2">
						<PinInput :auto-focus="true" :length="4" v-model="code" />
					</div>

					<div class="col-span-2 flex flex-col items-center">
						<div class="info mt-2">
							<div class="text-left leading-5">{{ $t('acceptShareDialog.enterCode') }}</div>
							<div class="text-left leading-5 mt-3">{{ $t('acceptShareDialog.warning') }}</div>
						</div>
					</div>
					<div v-if="invalid" />
					<div v-if="invalid" class="text-error leading-4">{{ $t('acceptShareDialog.noShareFound') }}</div>
					<div
						v-if="limitsExceeded"
						class="text-error leading-4.5 col-span-2 whitespace-pre-line"
						data-testid="share-limits-exceeded"
					>
						{{ limitsExceeded }}
					</div>
					<div class="col-span-2 flex justify-end mobile:justify-center gap-2 mt-2 mobile:mt-8">
						<LoadingIcon v-if="loading" class="animate-spin w-8 h-8 mr-2 inline-block" />
						<button
							v-if="!loading"
							:disabled="code.length < 4"
							class="primary"
							@click="submitDialog"
							data-testid="share-ok-button"
						>
							{{ $t('acceptShareDialog.ok') }}
						</button>
						<button class="secondary" @click="close" data-testid="share-cancel-button">
							{{ $t('acceptShareDialog.cancel') }}
						</button>
					</div>
				</div>
			</form>
		</div>
	</dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, $t } from '../../global'
import DialogTitle from '../elements/DialogTitle.vue'
import type { MimerNote } from '../../services/types/mimer-note'
import LoadingIcon from '../../icons/loading.vue'
import { LimitError } from '../../services/storage/type'
import { formatBytes } from '../../services/helpers'
import { SYSTEM_NOTE_COUNT } from '../../services/storage/synchronization-service'
import PinInput from '../elements/PinInput.vue'

const dialog = ref(null)
const code = ref('')
const codeInput = ref(null)
const loading = ref(null)
const isOpen = ref(false)

const invalid = ref(false)
const limitsExceeded = ref('')
let parent: MimerNote

const show = (note?: MimerNote) => {
	parent = note
	code.value = ''
	invalid.value = false
	loading.value = false
	isOpen.value = true
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
	} catch (error) {
		if (error instanceof LimitError) {
			console.error('Error accepting share:', error.limits)
			if (error.limits.noteCount - SYSTEM_NOTE_COUNT > error.limits.maxNoteCount) {
				limitsExceeded.value = $t('acceptShareDialog.cannotAcceptNoteCount', {
					count: error.limits.noteCount - SYSTEM_NOTE_COUNT,
					max: error.limits.maxNoteCount,
				})
			} else if (error.limits.size > error.limits.maxTotalBytes) {
				limitsExceeded.value = $t('acceptShareDialog.cannotAcceptDataUsage', {
					size: formatBytes(error.limits.size),
					max: formatBytes(error.limits.maxTotalBytes),
				})
			} else {
				limitsExceeded.value = $t('acceptShareDialog.limitExceeded', { message: error.message })
			}
		} else {
			throw error
		}
	} finally {
		loading.value = false
	}
}

defineExpose({
	show,
})
</script>
