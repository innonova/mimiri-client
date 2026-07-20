<template>
	<div
		v-if="findState.visible"
		class="absolute top-0 right-3.5 z-10 flex items-stretch bg-editor-widget text-editor-widget-text rounded-b shadow-[0_0_8px_2px_var(--color-editor-widget-shadow)] pr-1 py-1"
		data-testid="editor-find-bar"
		@mousedown.stop
	>
		<button
			type="button"
			class="w-4 mx-0.5 rounded-sm hover:bg-toolbar-hover flex items-center justify-center"
			:class="{ 'text-toolbar-disabled': !findState.canReplace }"
			:title="$t('noteEditor.toggleReplace')"
			data-testid="editor-find-toggle-replace"
			@mousedown.prevent
			@click="toggleReplace"
		>
			<svg
				width="12"
				height="12"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				:class="{ 'rotate-90': findState.replaceVisible }"
			>
				<path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</button>
		<div class="flex flex-col gap-1">
			<div class="flex items-center gap-0.5">
				<div
					class="flex items-center w-60 bg-editor-widget-input rounded-sm pr-0.5 border border-solid border-transparent focus-within:border-editor-selection-outline"
				>
					<input
						ref="inputElement"
						:value="findState.term"
						type="text"
						class="flex-1 min-w-0 bg-transparent text-size-menu px-1 py-0.5 outline-none"
						:placeholder="$t('noteEditor.findPlaceholder')"
						data-testid="editor-find-input"
						@input="onInput"
						@keydown="onKeyDown"
					/>
					<button
						type="button"
						class="w-5 h-5 shrink-0 rounded-sm text-size-menu select-none hover:bg-toolbar-hover"
						:class="{ 'bg-editor-selection-bg': findState.caseSensitive }"
						:title="$t('noteEditor.matchCase')"
						data-testid="editor-find-case"
						@mousedown.prevent
						@click="toggleCase"
					>
						Aa
					</button>
					<button
						type="button"
						class="w-5 h-5 shrink-0 rounded-sm text-size-menu select-none hover:bg-toolbar-hover"
						:class="{ 'bg-editor-selection-bg': findState.wholeWord }"
						:title="$t('noteEditor.wholeWord')"
						data-testid="editor-find-whole-word"
						@mousedown.prevent
						@click="toggleWholeWord"
					>
						<span class="underline underline-offset-2">ab</span>
					</button>
					<button
						type="button"
						class="w-5 h-5 shrink-0 rounded-sm text-size-menu select-none hover:bg-toolbar-hover"
						:class="{ 'bg-editor-selection-bg': findState.regexp }"
						:title="$t('noteEditor.useRegex')"
						data-testid="editor-find-regex"
						@mousedown.prevent
						@click="toggleRegexp"
					>
						.*
					</button>
				</div>
				<div
					class="text-size-menu px-1.5 min-w-18 cursor-default whitespace-nowrap"
					data-testid="editor-find-count"
				>
					{{ countText }}
				</div>
				<button
					type="button"
					class="w-6 h-6 p-1 rounded-sm hover:bg-toolbar-hover"
					:class="{ 'text-toolbar-disabled': findState.total === 0 }"
					:title="$t('noteEditor.findPrevious')"
					data-testid="editor-find-prev"
					@mousedown.prevent
					@click="findPrev"
				>
					<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M12 19V5M6 11l6-6 6 6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="w-6 h-6 p-1 rounded-sm hover:bg-toolbar-hover"
					:class="{ 'text-toolbar-disabled': findState.total === 0 }"
					:title="$t('noteEditor.findNext')"
					data-testid="editor-find-next"
					@mousedown.prevent
					@click="findNext"
				>
					<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M12 5v14M6 13l6 6 6-6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					class="w-6 h-6 p-1 rounded-sm hover:bg-toolbar-hover"
					:title="$t('noteEditor.closeFind')"
					data-testid="editor-find-close"
					@mousedown.prevent
					@click="close"
				>
					<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
				</button>
			</div>
			<div v-if="findState.replaceVisible" class="flex items-center gap-0.5">
				<div
					class="flex items-center w-60 bg-editor-widget-input rounded-sm border border-solid border-transparent focus-within:border-editor-selection-outline"
				>
					<input
						ref="replaceInputElement"
						:value="findState.replaceTerm"
						type="text"
						class="flex-1 min-w-0 bg-transparent text-size-menu px-1 py-0.5 outline-none"
						:placeholder="$t('noteEditor.replacePlaceholder')"
						data-testid="editor-find-replace-input"
						@input="onReplaceInput"
						@keydown="onReplaceKeyDown"
					/>
				</div>
				<button
					type="button"
					class="w-6 h-6 p-1 rounded-sm hover:bg-toolbar-hover"
					:class="{ 'text-toolbar-disabled': !canReplaceNow }"
					:title="$t('noteEditor.replaceNext')"
					data-testid="editor-find-replace"
					@mousedown.prevent
					@click="replaceNext"
				>
					<ReplaceIcon />
				</button>
				<button
					type="button"
					class="w-6 h-6 p-1 rounded-sm hover:bg-toolbar-hover"
					:class="{ 'text-toolbar-disabled': !canReplaceNow }"
					:title="$t('noteEditor.replaceAll')"
					data-testid="editor-find-replace-all"
					@mousedown.prevent
					@click="replaceAll"
				>
					<ReplaceAllIcon />
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { mimiriEditor, $t } from '../global'
import ReplaceIcon from '../icons/replace.vue'
import ReplaceAllIcon from '../icons/replace-all.vue'

const findState = mimiriEditor.findState
const inputElement = ref<HTMLInputElement | null>(null)
const replaceInputElement = ref<HTMLInputElement | null>(null)

const canReplaceNow = computed(() => findState.canReplace && findState.total > 0)

const countText = computed(() => {
	if (!findState.term) {
		return ''
	}
	if (findState.total === 0) {
		return $t('noteEditor.findNoResults')
	}
	return $t('noteEditor.findMatchCount', { index: `${findState.index}`, total: `${findState.total}` })
})

watch(
	() => findState.visible,
	visible => {
		if (visible) {
			void nextTick(() => {
				inputElement.value?.focus()
				inputElement.value?.select()
			})
		}
	},
)

const onInput = (event: Event) => {
	mimiriEditor.setFindTerm((event.target as HTMLInputElement).value)
}

const onReplaceInput = (event: Event) => {
	mimiriEditor.setReplaceTerm((event.target as HTMLInputElement).value)
}

const findNext = () => {
	mimiriEditor.findNext()
}

const findPrev = () => {
	mimiriEditor.findPrev()
}

const replaceNext = () => {
	if (canReplaceNow.value) {
		mimiriEditor.replaceNext()
	}
}

const replaceAll = () => {
	if (canReplaceNow.value) {
		mimiriEditor.replaceAll()
	}
}

const toggleCase = () => {
	mimiriEditor.setFindCaseSensitive(!findState.caseSensitive)
	inputElement.value?.focus()
}

const toggleWholeWord = () => {
	mimiriEditor.setFindWholeWord(!findState.wholeWord)
	inputElement.value?.focus()
}

const toggleRegexp = () => {
	mimiriEditor.setFindRegexp(!findState.regexp)
	inputElement.value?.focus()
}

const toggleReplace = () => {
	if (!findState.canReplace) {
		return
	}
	mimiriEditor.setReplaceVisible(!findState.replaceVisible)
	if (findState.replaceVisible) {
		void nextTick(() => replaceInputElement.value?.focus())
	} else {
		inputElement.value?.focus()
	}
}

const close = () => {
	mimiriEditor.closeFind()
}

const onKeyDown = (event: KeyboardEvent) => {
	if (event.key === 'Enter' || event.key === 'F3') {
		event.preventDefault()
		if (event.shiftKey) {
			findPrev()
		} else {
			findNext()
		}
	} else if (event.key === 'Escape') {
		event.preventDefault()
		close()
	} else if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
		event.preventDefault()
		inputElement.value?.select()
	} else if (event.key === 'h' && (event.ctrlKey || event.metaKey)) {
		event.preventDefault()
		if (!findState.replaceVisible) {
			toggleReplace()
		} else {
			replaceInputElement.value?.focus()
		}
	}
}

const onReplaceKeyDown = (event: KeyboardEvent) => {
	if (event.key === 'Enter') {
		event.preventDefault()
		if (event.ctrlKey || event.metaKey) {
			replaceAll()
		} else {
			replaceNext()
		}
	} else if (event.key === 'Escape') {
		event.preventDefault()
		close()
	} else if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
		event.preventDefault()
		inputElement.value?.focus()
		inputElement.value?.select()
	}
}
</script>
