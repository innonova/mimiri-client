<template>
	<div class="text-right relative desktop:flex">
		<input
			v-model="password"
			tabindex="2"
			type="text"
			class="basic-input"
			data-testid="password-input"
			@keydown="pwKeyDown"
		/>
		<div class="desktop:w-0 desktop:h-0 overflow-visible">
			<div class="absolute right-1.5 invisible desktop:visible" @click="emit('refresh')">
				<RefreshIcon class="w-5 h-5 mt-1" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RefreshIcon from '../../icons/refresh.vue'

const emit = defineEmits(['refresh'])

const password = defineModel<string>('value')
const capsLockOn = ref(false)

const pwKeyDown = event => {
	capsLockOn.value = event.getModifierState('CapsLock')
}
</script>
