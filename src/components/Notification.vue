<template>
	<div class="p-2 flex flex-col hover:bg-button-secondary rounded" @click="clicked">
		<div class="text-right text-size-menu text-menu-disabled">2024.10.18 12:46:10</div>
		<div class="flex items-center">
			<component
				:is="getIcon()"
				class="h-5 mr-1.5"
				:class="{ 'text-shared': props.notification.icon === 'share' }"
			></component>
			<div :class="{ 'font-bold': !props.notification.read }">{{ props.notification.title }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { notificationManager } from '../global'
import UpdateIcon from '../icons/file/download_2.vue'
import ShareIcon from '../icons/file/link_3.vue'
import type { MimiriNotification } from '../services/notification-manager'

const props = defineProps<{
	notification: MimiriNotification
}>()

const clicked = () => {
	notificationManager.activateNotification(props.notification.id)
}

const getIcon = () => {
	if (props.notification.icon === 'update') {
		return UpdateIcon
	}
	return ShareIcon
}
</script>
