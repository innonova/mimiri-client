<template>
	<div
		:class="{ invisible: !visible }"
		class="block absolute h-full w-full left-0 top-back-drop select-none no-drag"
		@mouseup="close"
		data-testid="context-menu-backdrop"
	>
		<div
			ref="contextMenu"
			class="block absolute left-menu top-menu text-size-menu cursor-default rounded shadow py-2 px-0.5 bg-menu text-menu-text"
		>
			<template v-for="item of config.items" :key="item.id">
				<div
					v-if="item.visible !== false"
					class="flex justify-between py-1 pr-5 rounded"
					:class="{
						'hover:bg-menu-hover': item.enabled !== false,
						'text-menu-disabled': item.enabled === false,
					}"
					:data-testid="`menu-${item.id}`"
					@mouseup="activateItem(item)"
				>
					<div class="flex items-center w-full h-7">
						<div class="min-w-8 pl-0.5 leading-3">
							<ToolbarIcon v-if="item.icon" :keep-size-on-mobile="true" :icon="item.icon"></ToolbarIcon>
						</div>
						<!-- <img v-if="item.icon" class="toolbar-icon" :src="item.icon" draggable="false" /> -->
						<div class="w-full whitespace-nowrap text-left">{{ item.title }}</div>
						<div class="w-full whitespace-nowrap text-right pl-20">{{ item.shortcut }}</div>
					</div>
				</div>
				<div
					v-if="item.separatorAfter && item.visible !== false && isVisibleAfter(item)"
					class="inline-block h-0 w-full border border-solid border-menu-separator mb-0.5"
				></div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue'
import type { ContextMenu, ContextMenuItem, ContextMenuPosition } from '../services/types/context-menu'
import ToolbarIcon from './ToolbarIcon.vue'

const visible = ref(false)
const top = ref('0px')
const left = ref('0px')
const backdropTop = ref('0px')
const config = ref<ContextMenu>({ items: [] })
let activationCallback: (item?: ContextMenuItem) => void = undefined
const contextMenu = ref(null)
let showTime = Date.now()

const close = e => {
	if (Date.now() - showTime < 1000 && e?.button === 2) {
		return // ignore right mouse up after context menu on some platforms
	}
	visible.value = false
	try {
		activationCallback?.()
	} catch (ex) {
		console.log(ex)
	}
	activationCallback = undefined
}

const isVisibleAfter = (item: ContextMenuItem) => {
	const items = config.value.items
	const index = items.indexOf(item)
	for (let i = index + 1; i < items.length; i++) {
		if (items[i].visible !== false) {
			return true
		}
	}
	return false
}

const adjustPosition = (position: ContextMenuPosition, windowWidth: number, windowHeight: number) => {
	const rect = contextMenu.value.getBoundingClientRect()
	const deltaTop = rect.bottom - windowHeight
	const deltaLeft = rect.right - windowWidth
	if (deltaTop > 0) {
		top.value = `${position.y - deltaTop}px`
	}
	if (position.alignRight) {
		left.value = `${position.x - rect.width}px`
	} else if (deltaLeft > 0) {
		left.value = `${position.x - deltaLeft}px`
	}
	visible.value = true
}

const show = (position: ContextMenuPosition, conf: ContextMenu, callback: (item: ContextMenuItem) => void) => {
	const windowHeight = window.innerHeight - 10
	const windowWidth = window.innerWidth - 10
	activationCallback = callback
	top.value = `${position.y}px`
	left.value = `${position.x}px`
	if (position.alignRight) {
		const rect = contextMenu.value.getBoundingClientRect()
		left.value = `${position.x - rect.width}px`
	}
	backdropTop.value = `${position.backdropTop ?? 0}px`
	config.value = conf
	setTimeout(() => adjustPosition(position, windowWidth, windowHeight))
	showTime = Date.now()
}

const activateItem = (item: ContextMenuItem) => {
	try {
		activationCallback?.(toRaw(item))
	} catch (ex) {
		console.log(ex)
	}
	activationCallback = undefined
}

defineExpose({
	show,
	close,
})
</script>

<style scoped>
.top-back-drop {
	top: v-bind(backdropTop);
}

.left-menu {
	left: v-bind(left);
}

.top-menu {
	top: v-bind(top);
}

.no-drag {
	-webkit-app-region: no-drag;
}
</style>
