<template>
	<div
		v-show="isVisible"
		ref="root"
		class="absolute bg-menu border border-solid border-border py-1 z-10 flex flex-col cursor-pointer min-w-[150px]"
		:style="{ top: top + 'px', left: left + 'px' }"
		data-testid="editor-prosemirror-popup"
	>
		<input
			ref="inputRef"
			v-model="searchQuery"
			type="text"
			:placeholder="placeholder"
			class="w-full box-border px-1 mb-1 outline-0 bg-transparent"
			@keydown="onKeydown"
			@blur="onBlur"
		/>
		<div
			v-for="(item, index) in filteredItems"
			:key="item"
			class="px-1"
			:class="{ 'bg-menu-hover': index === selectedIndex }"
			@click="selectItem(item)"
			@mouseenter="selectedIndex = index"
		>
			{{ item }}
		</div>
		<div v-if="filteredItems.length === 0" class="px-1 opacity-50 cursor-default italic">No results</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

withDefaults(
	defineProps<{
		placeholder?: string
	}>(),
	{
		placeholder: 'Search...',
	},
)

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const root = ref<HTMLElement | null>(null)
const filterCallback = ref<((query: string) => string[]) | null>(null)
const onSelectCallback = ref<((item: string) => void) | null>(null)
const onCloseCallback = ref<(() => void) | null>(null)

const filteredItems = computed(() => {
	if (filterCallback.value) {
		return filterCallback.value(searchQuery.value)
	}
	return []
})

watch(searchQuery, () => {
	selectedIndex.value = 0
})

function selectItem(item: string) {
	if (onSelectCallback.value) {
		onSelectCallback.value(item)
	}
	searchQuery.value = ''
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === 'ArrowDown') {
		e.preventDefault()
		selectedIndex.value = (selectedIndex.value + 1) % filteredItems.value.length
	} else if (e.key === 'ArrowUp') {
		e.preventDefault()
		selectedIndex.value = (selectedIndex.value - 1 + filteredItems.value.length) % filteredItems.value.length
	} else if (e.key === 'Enter') {
		e.preventDefault()
		if (filteredItems.value.length > 0) {
			selectItem(filteredItems.value[selectedIndex.value])
		}
	} else if (e.key === 'Escape') {
		e.preventDefault()
		if (onCloseCallback.value) {
			onCloseCallback.value()
		}
	}
}

function onBlur() {
	// Optional: emit close on blur, but might conflict with clicking items
	// Using mousedown.prevent on root prevents blur when clicking items
	// But if user clicks outside, we might want to close.
	// For now, let parent handle outside click or rely on explicit close.
}

const isVisible = ref(false)
const top = ref(0)
const left = ref(0)

function show(
	x: number,
	y: number,
	initialQuery: string,
	filterFn: (query: string) => string[],
	onSelect: (item: string) => void,
	onClose: () => void,
	showAbove: boolean = false,
) {
	left.value = x
	isVisible.value = true
	searchQuery.value = initialQuery
	selectedIndex.value = 0
	filterCallback.value = filterFn
	onSelectCallback.value = onSelect
	onCloseCallback.value = onClose

	void nextTick(() => {
		if (showAbove && root.value) {
			// Position above: y is the top of the trigger element, so move up by dropdown height
			const dropdownHeight = root.value.offsetHeight
			top.value = y - dropdownHeight
		} else {
			// Position below: y is already the bottom of the trigger element
			top.value = y
		}

		inputRef.value?.focus()
		inputRef.value?.select()
	})
}

function hide() {
	isVisible.value = false
}

defineExpose({
	root,
	show,
	hide,
})
</script>
