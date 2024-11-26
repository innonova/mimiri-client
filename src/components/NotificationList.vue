<template>
	<div
		:class="{ invisible: !visible }"
		class="block absolute h-full w-full left-0 top-back-drop select-none no-drag"
		@mouseup="close"
	>
		<div
			class="absolute right-0 top-menu w-80 cursor-default rounded shadow py-2 px-2 bg-menu text-menu-text"
			:class="{ invisible: !visible }"
			@mouseup="stopPropagation"
		>
			<template v-for="item of notificationManager.state.notifications" :key="item.id">
				<Notification :notification="item"></Notification>
			</template>
			<div
				class="w-full text-center mt-2 py-2 bg-button-secondary hover:opacity-80 rounded"
				@click="markAllRead"
				@mouseup="stopPropagation"
			>
				Mark All Read
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Notification from './Notification.vue'
import { notificationManager } from '../global'

const visible = ref(false)
const top = ref('36px')

const stopPropagation = e => {
	e.stopPropagation()
}

const markAllRead = e => {
	e.stopPropagation()
	notificationManager.markAllAsRead()
}

const close = () => {
	console.log('close')

	visible.value = false
}

const show = (topOffset: number) => {
	visible.value = true
	top.value = `${topOffset}px`
}

const isShowing = () => {
	return visible.value
}

defineExpose({
	show,
	close,
	isShowing,
})
</script>

<style scoped>
.top-menu {
	top: v-bind(top);
}
</style>
