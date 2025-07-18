<template>
	<div class="text-right">
		<button :disabled="loading || !enabled" class="secondary" type="button" @click="$emit('click')">
			<div v-if="loading" class="h-[18px]">
				<LoadingIcon class="animate-spin w-6 h-6 mt-[-3px] inline-block" />
			</div>
			<slot v-if="!loading" />
		</button>
	</div>
</template>

<script setup lang="ts">
	import LoadingIcon from '../../icons/loading.vue'

	const emit = defineEmits(['click'])

	const props = defineProps<{
		enabled: boolean
		loading: boolean
	}>()
</script>
