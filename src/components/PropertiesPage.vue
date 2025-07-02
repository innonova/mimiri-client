<template>
	<div v-if="noteManager.state.isLoggedIn" class="flex flex-col h-full">
		<div class="flex items-center py-px px-1 bg-toolbar border-b border-solid border-toolbar min-h-9 select-none">
			<ToolbarIcon icon="back" :hoverEffect="true" title="Back" class="desktop:hidden" @click="onBack"></ToolbarIcon>
		</div>
		<div class="flex overflow-hidden pl-2 pt-2 h-full">
			<div class="w-full">
				<TextNoteProperties></TextNoteProperties>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { noteManager } from '../global'
import ToolbarIcon from './ToolbarIcon.vue'
import TextNoteProperties from './properties/TextNoteProperties.vue'

const type = computed(() => {
	return noteManager.selectedNote?.type ?? ''
})

const onBack = () => {
	window.history.back()
	noteManager.closeEditorIfMobile()
}
</script>
