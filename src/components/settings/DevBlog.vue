<template>
	<div class="flex flex-col h-full">
		<TabBar :items="['Dev Blog']"></TabBar>
		<div class="w-full h-full">
			<iframe
				ref="blogFrame"
				class="w-full h-full"
				:src="`https://blog.mimiri.io/integrated/?q=${Date.now()}&color-scheme=${
					settingsManager.darkMode ? 'dark' : 'light'
				}&username=${noteManager.username.startsWith('mimiri_a_') ? 'Anonymous' : noteManager.username}`"
			></iframe>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, toRaw } from 'vue'
import { blogManager, env, noteManager } from '../../global'
import TabBar from '../elements/TabBar.vue'
import { useEventListener } from '@vueuse/core'
import { settingsManager } from '../../services/settings-manager'
import type { BlogConfig } from '../../services/blog-manager'

const blogFrame = ref<HTMLIFrameElement>(null)

const postMessageToFrame = (message: any) => {
	blogFrame.value?.contentWindow?.postMessage(message, '*')
}

const updateConfig = () => {
	postMessageToFrame({
		type: 'config',
		config: blogManager.getConfig(),
	})
}

const updateCurrentPost = () => {
	postMessageToFrame({
		type: 'post',
		post: toRaw(blogManager.currentPost.value),
	})
}

const updateComments = () => {
	postMessageToFrame({
		type: 'comments',
		comments: toRaw(blogManager.comments.value),
	})
}

const updateHistory = () => {
	postMessageToFrame({
		type: 'history',
		posts: toRaw(blogManager.posts.value),
	})
}

watch(blogManager.currentPost, () => {
	updateCurrentPost()
})

watch(blogManager.comments, () => {
	updateComments()
})

watch(blogManager.posts, () => {
	updateHistory()
})

watch(settingsManager.state, () => {
	updateConfig()
})

const onMessage = async (event: MessageEvent) => {
	if (event.origin === 'https://blog.mimiri.io' || env.DEV) {
		const { data } = event
		switch (data.type) {
			case 'ready':
				if (blogManager.isInitialized.value) {
					updateCurrentPost()
					updateComments()
					updateHistory()
				} else {
					await blogManager.initialize()
				}
				updateConfig()
				blogManager.markAsRead()
				break
			case 'comment':
				await blogManager.addComment(data.username, data.comment)
				break
			case 'select-post':
				await blogManager.selectPost(data.postId)
				break
			case 'set-config':
				blogManager.applyConfig(data.config as BlogConfig)
				break
		}
	}
}

useEventListener(window, 'message', onMessage)
</script>
