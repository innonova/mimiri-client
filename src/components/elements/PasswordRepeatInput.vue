<template>
	<div class="text-right relative desktop:flex">
		<input
			v-model="passwordRepeat"
			tabindex="3"
			type="password"
			class="basic-input"
			data-testid="repeat-input"
			@keydown="pwKeyDown"
		>
		<div v-if="value" class="desktop:w-0 desktop:h-0 pt-0.5 overflow-visible">
			<div v-if="passwordMatch" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<AvailableIcon class="w-5 h-5 mr-1 inline-block" /> Matching
			</div>
			<div v-if="!passwordMatch" class="flex items-center w-52 desktop:ml-2 mt-1.5 desktop:mt-0.5">
				<UnavailableIcon class="w-5 h-5 mr-1 inline-block" /> Not matching
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AvailableIcon from '../../icons/available.vue'
import UnavailableIcon from '../../icons/unavailable.vue'

const props = defineProps<{
	value: string
}>()

const passwordMatch = defineModel<boolean>('match')
const passwordRepeat = ref('')
const pwKeyDown = event => {}

watch([passwordRepeat, props], value => {
	checkPasswordMatch()
})

const checkPasswordMatch = () => {
	passwordMatch.value = props.value === passwordRepeat.value
}
</script>
