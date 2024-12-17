<template>
	<div>
		<div class="flex flex-col md:hidden relative">
			<div class="flex p-px" tabindex="2">
				<input
					ref="searchInput"
					class="m-px w-full bg-input text-input-text"
					:value="searchManager.state.term"
					type="text"
					@keydown="keyDown"
				/>
				<button class="cursor-default w-8" @click="close">X</button>
			</div>
			<div
				v-if="searchManager.state.searchRunning"
				class="progress-bar-value absolute left-0 bottom-0 w-full h-1"
			></div>
		</div>
		<div class="hidden md:block bg-info-bar h-7 relative">
			<div
				v-if="searchManager.state.searchRunning"
				class="progress-bar-value absolute left-0 top-0 w-full h-full"
			></div>
			<div class="flex absolute left-0 top-0 w-full justify-start items-center text-size-base pl-1 select-none">
				<SearchIcon class="h-7 w-7 p-px mr-1"></SearchIcon>
				<div>{{ searchManager.state.term }}</div>
				<div class="w-full flex justify-end">
					<CloseIcon @click="close" class="h-7 w-7 p-1"></CloseIcon>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { showSearchBox } from '../global'
import { searchManager } from '../services/search-manager'
import SearchIcon from '../icons/search.vue'
import CloseIcon from '../icons/close.vue'

const searchInput = ref(null)

watch(showSearchBox, (newVal, _) => {
	if (newVal) {
		setTimeout(() => searchInput.value?.focus())
	}
})

const close = () => {
	showSearchBox.value = false
}

const keyDown = event => {
	if (event.key === 'Enter') {
		event.preventDefault()
		searchManager.search(event.target.value)
	} else if (event.key === 'Escape') {
		event.preventDefault()
		close()
	}
}
</script>
<style scoped>
.progress-bar-value {
	background: linear-gradient(90deg, #bf5116 0%, #ea5d1c 50%, #bf5116 100%);
	animation: indeterminateAnimation 1.3s infinite linear;
	transform-origin: 0% 50%;
}

@keyframes indeterminateAnimation {
	0% {
		transform: translateX(0) scaleX(0);
	}
	40% {
		transform: translateX(0) scaleX(0.4);
	}
	100% {
		transform: translateX(100%) scaleX(0.5);
	}
}
</style>
