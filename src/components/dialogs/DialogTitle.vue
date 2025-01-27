<template>
	<header class="flex items-center bg-title-bar select-none">
		<div
			ref="titleBar"
			class="pl-2 text-size-title w-full h-full flex items-center"
			@pointerdown="down"
			@pointerup="up"
			@pointermove="move"
		>
			<slot></slot>
		</div>
		<button class="cursor-default w-8 outline-none m-1" @click="close">X</button>
	</header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DialogTitle from './DialogTitle.vue'
const titleBar = ref(null)

let dialog
let captured = false
let startX = 0
let startY = 0
let lastX = 0
let lastY = 0
let offsetY = 0
let offsetX = 0
let offsetHeight = 0

const findDialog = (elm: HTMLElement) => {
	if (elm.tagName === 'DIALOG') {
		return elm
	}
	if (elm.parentElement) {
		return findDialog(elm.parentElement)
	}
	return undefined
}

const emit = defineEmits(['close'])

const down = (e: PointerEvent) => {
	offsetY = e.offsetY
	offsetX = e.offsetX
	offsetHeight = titleBar.value.offsetHeight
	startX = e.clientX - lastX
	startY = e.clientY - lastY
	captured = true
	titleBar.value.setPointerCapture(e.pointerId)
}

const up = (e: PointerEvent) => {
	captured = false
	titleBar.value.releasePointerCapture(e.pointerId)
}

const move = (e: PointerEvent) => {
	if (captured) {
		let clientX = e.clientX
		let clientY = e.clientY
		if (clientX < offsetHeight) {
			clientX = offsetHeight
		}
		if (clientY < offsetY) {
			clientY = offsetY
		}
		if (clientX > window.innerWidth - offsetHeight + offsetX) {
			clientX = window.innerWidth - offsetHeight + offsetX
		}
		if (clientY > window.innerHeight - offsetHeight + offsetY) {
			clientY = window.innerHeight - offsetHeight + offsetY
		}

		const x = Math.round(clientX - startX)
		const y = Math.round(clientY - startY)
		if (Math.abs(lastX - x) > 1 || Math.abs(lastY - y) > 1) {
			if (!dialog) {
				dialog = findDialog(titleBar.value)
			}
			lastX = x
			lastY = y
			if (dialog) {
				dialog.style.transform = `translate(${x}px,${y}px)`
			}
		}
	}
}

const close = event => {
	emit('close', event)
}
</script>
