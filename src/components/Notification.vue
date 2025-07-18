<template>
	<div class="p-2 flex flex-col hover:bg-button-secondary rounded-sm" @click="clicked">
		<div class="text-right text-size-menu text-menu-disabled">
			{{ formatNotificationTimestamp(notification.timestamp) }}
		</div>
		<div class="flex items-center gap-1">
			<component :is="getIcon()" class="h-5 mr-1.5" :class="{ 'text-shared': props.notification.icon === 'share' }" />
			<div :class="{ 'font-bold': !props.notification.read }">{{ props.notification.title }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { notificationManager } from '../global'
import UpdateIcon from '../icons/update.vue'
import AnnouncementIcon from '../icons/announcement.vue'
import ShareIcon from '../icons/share.vue'
import type { MimiriNotification } from '../services/notification-manager'
import { formatNotificationTimestamp } from '../services/helpers'

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
	if (props.notification.icon === 'announcement') {
		return AnnouncementIcon
	}
	return ShareIcon
}
</script>
