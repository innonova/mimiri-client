<template>
	<div v-if="!settingsManager.disableDevBlog" class="flex flex-col h-full">
		<TabBar :items="['Dev Blog']" />
		<div class="w-full h-full">
			<iframe
				ref="blogFrame"
				class="w-full h-full"
				:src="`https://blog.mimiri.io/integrated/?q=${Date.now()}&color-scheme=${
					settingsManager.darkMode ? 'dark' : 'light'
				}&username=${noteManager.state.username.startsWith('mimiri_a_') ? 'Anonymous' : noteManager.state.username}`"
			/>

			<!-- <iframe
				ref="blogFrame"
				class="w-full h-full"
				:src="`http://localhost:5175/integrated/?q=${Date.now()}&color-scheme=${
					settingsManager.darkMode ? 'dark' : 'light'
				}&username=${noteManager.username.startsWith('mimiri_a_') ? 'Anonymous' : noteManager.username}`"
			></iframe> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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

watch(settingsManager.state, () => {
	updateConfig()
})

const onMessage = async (event: MessageEvent) => {
	if (event.origin === 'https://blog.mimiri.io' || env.DEV) {
		const { data } = event
		switch (data.type) {
			case 'ready':
				updateConfig()
				blogManager.markAsRead()
				break
			case 'comment':
				try {
					await blogManager.addComment(data.postId, data.username, data.comment)
					postMessageToFrame({ type: 'comment-posted' })
				} catch (error) {
					postMessageToFrame({ type: 'comment-error', error: error.message })
				}
				break
			case 'set-config':
				blogManager.applyConfig(data.config as BlogConfig)
				break
		}
	}
}

useEventListener(window, 'message', onMessage)
</script>
