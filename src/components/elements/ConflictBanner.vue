<template>
	<div
		v-show="isVisible"
		class="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-warning border-b border-solid border-border shadow-md"
		data-testid="conflict-resolution-banner"
	>
		<div class="flex items-center gap-3 text-black">
			<span class="text-xl flex-shrink-0">⚠️</span>
			<span class="font-medium">
				{{ $t('conflictBanner.conflicts', { count: conflictCount }) }}
			</span>
		</div>
		<div class="flex items-center gap-3 flex-shrink-0">
			<button
				class="px-3 py-1.5 bg-black/80 text-white border border-black/20 rounded text-sm font-medium cursor-pointer hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				:disabled="conflictCount <= 1"
				@click="navigate('prev')"
				data-testid="conflict-prev-btn"
			>
				{{ $t('conflictBanner.previous') }}
			</button>
			<span class="text-sm font-semibold min-w-[60px] text-center text-black">{{
				$t('conflictBanner.counter', { current: currentIndex + 1, total: conflictCount })
			}}</span>
			<button
				class="px-3 py-1.5 bg-black/80 text-white border border-black/20 rounded text-sm font-medium cursor-pointer hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				:disabled="conflictCount <= 1"
				@click="navigate('next')"
				data-testid="conflict-next-btn"
			>
				{{ $t('conflictBanner.next') }}
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
	navigate: [direction: 'prev' | 'next']
}>()

const isVisible = ref(false)
const conflictCount = ref(0)
const currentIndex = ref(0)

function navigate(direction: 'prev' | 'next') {
	emit('navigate', direction)
}

function update(count: number, index: number) {
	conflictCount.value = count
	currentIndex.value = index

	if (count === 0) {
		isVisible.value = false
	} else {
		isVisible.value = true
	}
}

function hide() {
	isVisible.value = false
}

function show() {
	isVisible.value = true
}

defineExpose({
	update,
	hide,
	show,
	isVisible,
})
</script>
