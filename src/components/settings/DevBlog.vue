<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Dev Blog']"></TabBar>
		<div class="w-full h-full">
			<!-- <iframe class="w-full h-full" src="https://blog.mimiri.io/"></iframe> -->
			<iframe
				ref="blogFrame"
				class="w-full h-full"
				:src="`https://blog.mimiri.io/integrated/?color-scheme=${
					settingsManager.darkMode ? 'dark' : 'light'
				}&username=${
					noteManager.username.startsWith('mimiri_a_') ? 'Anonymous' : noteManager.username
				}&postId=${postId}`"
			></iframe>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { env, noteManager } from '../../global'
import { settingsManager } from '../../services/settings-manager'
import TabBar from '../elements/TabBar.vue'
import { useEventListener } from '@vueuse/core'
import { newGuid } from '../../services/types/guid'

const blogFrame = ref<HTMLIFrameElement>(null)
let postId = newGuid()

const updatePosts = async () => {
	const { posts } = await noteManager.getLatestBlogPosts(1, true)
	blogFrame.value.contentWindow?.postMessage(
		{
			type: 'post',
			post: posts[0],
		},
		'*',
	)
	return posts[0].id
}
const updateHistory = async () => {
	const { posts } = await noteManager.getLatestBlogPosts(10, false)
	blogFrame.value.contentWindow?.postMessage(
		{
			type: 'history',
			posts,
		},
		'*',
	)
}

const updateMessages = async () => {
	const response = await noteManager.getComments(postId)
	blogFrame.value.contentWindow?.postMessage(
		{
			type: 'init',
			comments: response.comments,
		},
		'*',
	)
}

const updateConfig = () => {
	let notificationLevel
	if (settingsManager.blogPostNotificationLevel === 'clearly') {
		notificationLevel = 'notify-clearly'
	} else if (settingsManager.blogPostNotificationLevel === 'discreetly') {
		notificationLevel = 'notify-discreetly'
	} else {
		notificationLevel = 'notify-never'
	}
	blogFrame.value.contentWindow?.postMessage(
		{
			type: 'config',
			config: {
				notificationLevel,
			},
		},
		'*',
	)
}

const onMessage = async (event: MessageEvent) => {
	if (event.origin === 'https://blog.mimiri.io' || env.DEV) {
		if (event.data.type === 'ready') {
			postId = await updatePosts()
			updateConfig()
			await updateMessages()
			await updateHistory()
		} else if (event.data.type === 'comment') {
			await noteManager.addComment(postId, event.data.username, event.data.comment)
			await updateMessages()
		} else if (event.data.type === 'select-post') {
			const { posts } = await noteManager.getBlogPost(event.data.postId)
			blogFrame.value.contentWindow?.postMessage(
				{
					type: 'post',
					post: posts[0],
				},
				'*',
			)
		} else if (event.data.type === 'set-config') {
			if (event.data.config.notificationLevel === 'notify-clearly') {
				settingsManager.blogPostNotificationLevel = 'clearly'
			} else if (event.data.config.notificationLevel === 'notify-discreetly') {
				settingsManager.blogPostNotificationLevel = 'discreetly'
			} else if (event.data.config.notificationLevel === 'notify-never') {
				settingsManager.blogPostNotificationLevel = 'never'
			}
		}
	}
}

useEventListener(window, 'message', onMessage)
</script>
