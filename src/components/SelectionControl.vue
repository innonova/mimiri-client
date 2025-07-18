<template>
	<div ref="containerElement" class="relative">
		<div ref="menuElement" class="menu-pos bg-toolbar w-full h-30 absolute flex flex-col">
			<div class="text-center p-3 active:bg-toolbar-hover" @click="selectAll">Select All</div>
			<div class="text-center p-3 active:bg-toolbar-hover" @click="cut">Cut</div>
			<div class="text-center p-3 active:bg-toolbar-hover" @click="copy">Copy</div>
			<div class="text-center p-3 active:bg-toolbar-hover" @click="paste">Paste</div>
		</div>
		<div ref="toolbarElement" class="toolbar-pos bg-toolbar flex justify-between w-full absolute h-14">
			<LineUp @click="lineUp" class="active:bg-toolbar-hover" />
			<ExpandLeft @click="expandLeft" class="active:bg-toolbar-hover" />
			<ShrinkLeft @click="shrinkLeft" class="active:bg-toolbar-hover" />
			<MenuIcon @click="menu" class="active:bg-toolbar-hover" />
			<ShrinkRight @click="shrinkRight" class="active:bg-toolbar-hover" />
			<ExpandRight @click="expandRight" class="active:bg-toolbar-hover" />
			<LineDown @click="lineDown" class="active:bg-toolbar-hover" />
		</div>
	</div>
</template>

<script setup lang="ts">
import LineUp from '../icons/line-up.vue'
import ExpandLeft from '../icons/expand-left.vue'
import ShrinkLeft from '../icons/shrink-left.vue'
import MenuIcon from '../icons/menu.vue'
import ShrinkRight from '../icons/shrink-right.vue'
import ExpandRight from '../icons/expand-right.vue'
import LineDown from '../icons/line-down.vue'
import { mimiriEditor } from '../global'
import { SelectionExpansion } from '../services/editor/type'
import { ref } from 'vue'
import { mimiriPlatform } from '../services/mimiri-platform'

const containerElement = ref(null)
const menuElement = ref(null)
const toolbarElement = ref(null)
const menuTop = ref('0px')
const toolbarTop = ref('0px')
const menuVisibility = ref('hidden')
const toolbarVisibility = ref('hidden')

if (!mimiriPlatform.isDesktop) {
	visualViewport.addEventListener('resize', () => {
		const isPortrait = window.innerHeight > window.innerWidth
		const viewPortHeight = visualViewport.height * visualViewport.scale
		const screenHeight =
			isPortrait || mimiriPlatform.isAndroidApp ? window.screen.availHeight : window.screen.availWidth
		if (viewPortHeight < screenHeight * 0.85) {
			toolbarVisibility.value = 'visible'
			const rect = containerElement.value.getBoundingClientRect()
			toolbarTop.value = `${visualViewport.height - toolbarElement.value.offsetHeight - rect.top}px`
		} else {
			toolbarVisibility.value = 'hidden'
		}
	})
}

const lineUp = () => {
	mimiriEditor.expandSelection(SelectionExpansion.LineUp)
}

const expandLeft = () => {
	mimiriEditor.expandSelection(SelectionExpansion.ExpandLeft)
}

const shrinkLeft = () => {
	mimiriEditor.expandSelection(SelectionExpansion.ShrinkLeft)
}

const shrinkRight = () => {
	mimiriEditor.expandSelection(SelectionExpansion.ShrinkRight)
}

const expandRight = () => {
	mimiriEditor.expandSelection(SelectionExpansion.ExpandRight)
}

const lineDown = () => {
	mimiriEditor.expandSelection(SelectionExpansion.LineDown)
}

const selectAll = () => {
	menuVisibility.value = 'hidden'
	mimiriEditor.selectAll()
}

const cut = () => {
	menuVisibility.value = 'hidden'
	mimiriEditor.cut()
}

const copy = () => {
	menuVisibility.value = 'hidden'
	mimiriEditor.copy()
}

const paste = () => {
	menuVisibility.value = 'hidden'
	void mimiriEditor.paste()
}

const menu = () => {
	if (menuVisibility.value === 'hidden') {
		menuVisibility.value = 'visible'
		menuTop.value = `${toolbarElement.value.offsetTop - menuElement.value.offsetHeight}px`
	} else {
		menuVisibility.value = 'hidden'
	}
	mimiriEditor.focus()
}
</script>
<style scoped>
.menu-pos {
	top: v-bind(menuTop);
	left: 0;
	visibility: v-bind(menuVisibility);
}
.toolbar-pos {
	top: v-bind(toolbarTop);
	left: 0;
	visibility: v-bind(toolbarVisibility);
}
</style>
