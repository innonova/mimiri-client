<template>
	<div
		ref="toolbar"
		class="flex items-center py-px px-1.5 bg-toolbar border-b border-solid border-toolbar"
		:class="{ 'justify-between': mimiriPlatform.isPhone }"
		data-testid="main-toolbar"
	>
		<ToolbarIcon v-if="!mimiriPlatform.isPc" icon="menu" @click="showMobileMenu"></ToolbarIcon>
		<div
			v-if="!mimiriPlatform.isPc"
			class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"
		></div>
		<ToolbarIcon icon="add-root-note" :hoverEffect="true" title="New Root Note" @click="createRootNote"></ToolbarIcon>
		<ToolbarIcon
			icon="add-note"
			:disabled="!noteManager.selectedNote || noteManager.selectedNote.isRecycleBin"
			:hoverEffect="true"
			title="New Note"
			@click="createChildNote"
		></ToolbarIcon>
		<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"></div>
		<ToolbarIcon
			class="md:hidden"
			icon="search-all-notes"
			:hoverEffect="true"
			title="Search All Notes"
			@click="toggleSearchAllNotes"
		></ToolbarIcon>
		<ToolbarIcon
			class="hidden md:block"
			icon="search-all-notes"
			:hoverEffect="true"
			title="Search All Notes"
			@click="gotoSearchAllNotes"
		></ToolbarIcon>
		<div
			v-if="mimiriPlatform.isPhone"
			class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"
		></div>
		<ToolbarIcon
			v-if="mimiriPlatform.isPhone"
			:icon="notificationManager.unread > 0 ? 'notifications-active' : 'notifications'"
			:class="{ 'mt-0.5': notificationManager.unread === 0 }"
			:hoverEffect="true"
			:disabled="notificationManager.count === 0"
			title="Notifications"
			@click="notificationsClick"
		></ToolbarIcon>
		<ToolbarIcon
			v-if="mimiriPlatform.isPhone"
			:icon="accountIcon"
			:hoverEffect="true"
			title="Account"
			@click="accountClick"
		></ToolbarIcon>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { noteManager, showShareOffers, showSearchBox, ipcClient, searchInput } from '../global'
import ToolbarIcon from './ToolbarIcon.vue'
import { MenuItems, menuManager } from '../services/menu-manager'
import { mimiriPlatform } from '../services/mimiri-platform'
import { notificationManager } from '../global'

const toolbar = ref(null)
const accountIcon = computed(() => {
	if (!ipcClient.isAvailable) {
		return 'account'
	}
	if (noteManager.state.online && noteManager.state.authenticated) {
		return 'account-online'
	}
	return 'account-offline'
})

const notificationsClick = () => {
	console.log(notificationManager.count)

	if (notificationManager.count > 0) {
		notificationManager.show()
	}
}
const accountClick = () => {
	const rect = toolbar.value.getBoundingClientRect()
	menuManager.showMenu({ x: screen.width, y: rect.bottom, alignRight: true }, [
		MenuItems.ChangeUsername,
		MenuItems.ChangePassword,
		MenuItems.DeleteAccount,
		MenuItems.Separator,
		MenuItems.Logout,
	])
}

const createRootNote = () => {
	noteManager.newRootNote()
}

const createChildNote = () => {
	noteManager.newNote()
}

const searchAllNotes = () => {
	showSearchBox.value = true
}

const toggleSearchAllNotes = () => {
	showSearchBox.value = !showSearchBox.value
}

const gotoSearchAllNotes = () => {
	searchInput.value.focus()
	searchInput.value.classList.add('animate-ping')
	setTimeout(() => {
		searchInput.value.classList.remove('animate-ping')
	}, 600)
}

const showMobileMenu = () => {
	const whenSelectedNote = [
		MenuItems.About,
		MenuItems.DarkMode,
		MenuItems.Separator,
		MenuItems.NewNote,
		MenuItems.NewRootNote,
		MenuItems.Separator,
		MenuItems.Duplicate,
		MenuItems.Cut,
		MenuItems.Copy,
		MenuItems.Paste,
		MenuItems.Separator,
		MenuItems.Share,
		MenuItems.Refresh,
		MenuItems.Separator,
		MenuItems.Rename,
		MenuItems.Delete,
	]
	const whenNoSelectedNote = [MenuItems.About, MenuItems.DarkMode]

	const rect = toolbar.value.getBoundingClientRect()

	menuManager.showMenu({ x: 10, y: rect.bottom }, noteManager.selectedNote ? whenSelectedNote : whenNoSelectedNote)
}

defineExpose({
	searchAllNotes,
})
</script>
