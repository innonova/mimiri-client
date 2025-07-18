<template>
	<div>
		<div class="flex flex-col desktop:hidden relative h-11">
			<div class="flex p-px" tabindex="2">
				<input
					ref="searchInput"
					class="m-px w-full bg-input text-input-text"
					:value="searchManager.state.term"
					type="text"
					@keydown="keyDown"
				/>
				<CloseButton @click="close" class="w-10" />
			</div>
			<div v-if="searchManager.state.searchRunning" class="progress-bar-value absolute left-0 bottom-0 w-full h-1" />
		</div>
		<div class="hidden desktop:block bg-info-bar-accented h-7 relative">
			<div v-if="searchManager.state.searchRunning" class="progress-bar-value absolute left-0 top-0 w-full h-full" />
			<div class="flex absolute left-0 top-0 w-full justify-between items-center text-size-base! pl-1 select-none">
				<SearchIcon class="h-7 w-7 p-px mr-1" />
				<div>{{ searchManager.state.term }}</div>
				<div class="w-7 h-7 flex justify-end bg-info-bar-accented">
					<CloseButton @click="close" />
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
	import CloseButton from './elements/CloseButton.vue'

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
