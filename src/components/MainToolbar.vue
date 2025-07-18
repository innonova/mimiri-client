<template>
	<div
		ref="toolbar"
		class="flex items-center py-px px-1.5 bg-toolbar border-b border-solid border-toolbar mobile:justify-between"
		data-testid="main-toolbar"
	>
		<ToolbarIcon
			v-if="!mimiriPlatform.isDesktop"
			icon="menu"
			@click="showMobileMenu"
			data-testid="toolbar-mobile-menu"
		/>
		<div
			v-if="!mimiriPlatform.isDesktop"
			class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"
		/>
		<ToolbarIcon
			icon="plus-small"
			:hoverEffect="true"
			title="New Root Note"
			@click="showCreateMenu"
			data-testid="toolbar-create-menu"
		/>
		<ToolbarIcon
			:icon="settingsManager.lastNoteCreateType === 'child' ? 'add-note' : 'add-sibling-note'"
			:disabled="
				!noteManager.tree.selectedNoteRef().value ||
				noteManager.tree.selectedNoteRef().value.isSystem ||
				noteManager.tree.selectedNoteRef().value.isInRecycleBin
			"
			:hoverEffect="true"
			:title="settingsManager.lastNoteCreateType === 'child' ? 'New Child Note' : 'New Sibling Note'"
			@click="createChildNote"
			data-testid="toolbar-create-sub-note"
		/>
		<div class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5" />
		<ToolbarIcon
			class="desktop:hidden"
			icon="search-all-notes"
			:hoverEffect="true"
			title="Search All Notes"
			@click="toggleSearchAllNotes"
			data-testid="toolbar-toggle-search"
		/>
		<ToolbarIcon
			class="hidden! desktop:block!"
			icon="search-all-notes"
			:hoverEffect="true"
			title="Search All Notes"
			@click="gotoSearchAllNotes"
			data-testid="toolbar-goto-search"
		/>
		<div
			v-if="mimiriPlatform.isPhone"
			class="inline-block h-4/5 w-0 border border-solid border-toolbar-separator m-0.5"
		/>
		<ToolbarIcon
			v-if="mimiriPlatform.isPhone"
			:icon="notificationManager.unread > 0 ? 'notifications-active' : 'notifications'"
			:class="{ 'mt-0.5': notificationManager.unread === 0 }"
			:hoverEffect="true"
			:disabled="notificationManager.count === 0"
			title="Notifications"
			@click="notificationsClick"
			data-testid="toolbar-notifications"
		/>
		<ToolbarIcon
			v-if="mimiriPlatform.isPhone"
			:icon="accountIcon"
			:hoverEffect="true"
			title="Account"
			@click="accountClick"
			data-testid="toolbar-account"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { noteManager, showSearchBox, ipcClient, searchInput } from '../global'
import ToolbarIcon from './ToolbarIcon.vue'
import { MenuItems, menuManager } from '../services/menu-manager'
import { mimiriPlatform } from '../services/mimiri-platform'
import { notificationManager } from '../global'
import { settingsManager } from '../services/settings-manager'

const toolbar = ref(null)
const accountIcon = computed(() => {
	if (!ipcClient.isAvailable) {
		return 'account'
	}
	if (noteManager.state.isOnline && noteManager.state.isLoggedIn) {
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
		...(noteManager.state.isAnonymous ? [MenuItems.CreatePassword, MenuItems.Login] : [MenuItems.Logout]),
		MenuItems.Separator,
		MenuItems.WorkOffline,
	])
}

const createChildNote = () => {
	if (settingsManager.lastNoteCreateType === 'sibling') {
		if (noteManager.tree.selectedNote().parent.isRoot) {
			noteManager.ui.newRootNote()
			return
		}
		noteManager.tree.selectedNote().parent.select()
	}
	noteManager.ui.newNote()
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

const showCreateMenu = () => {
	const createMenu = [MenuItems.NewRootNote, MenuItems.NewChildNote, MenuItems.NewSiblingNote]

	const rect = toolbar.value.getBoundingClientRect()

	menuManager.showMenu({ x: 10, y: rect.bottom }, noteManager.tree.selectedNote() ? createMenu : createMenu)
}

const showMobileMenu = () => {
	const isSystem = !!noteManager.tree.selectedNote()?.isSystem
	const isRecycleBin = !!noteManager.tree.selectedNote()?.isRecycleBin
	const isInRecycleBin = !!noteManager.tree.selectedNote()?.isInRecycleBin

	let showShare = true
	let showAcceptShare = true
	if (!!noteManager.tree.selectedNote()?.isShared) {
		const note = noteManager.tree.selectedNote()
		showShare = note.isShareRoot
		showAcceptShare = false
	}
	if (!noteManager.state.isOnline) {
		showShare = false
		showAcceptShare = false
	}

	const whenSelectedNote = [
		MenuItems.About,
		MenuItems.DarkMode,
		...(isRecycleBin ? [MenuItems.Separator, MenuItems.EmptyRecycleBin] : []),
		...(!isSystem && !isInRecycleBin
			? [
					MenuItems.Separator,
					MenuItems.NewNote,
					MenuItems.NewRootNote,
					MenuItems.Separator,
					MenuItems.Duplicate,
					MenuItems.Cut,
					MenuItems.Copy,
					MenuItems.Paste,
				]
			: []),

		...(!isSystem && isInRecycleBin ? [MenuItems.Separator, MenuItems.Cut, MenuItems.Copy] : []),
		MenuItems.Separator,
		...(!isSystem && !isInRecycleBin && showShare ? [MenuItems.Share] : []),
		...(!isSystem && !isInRecycleBin && showAcceptShare ? [MenuItems.ReceiveShare] : []),
		MenuItems.Refresh,
		...(!isSystem && !isInRecycleBin ? [MenuItems.Separator, MenuItems.Rename, MenuItems.Recycle] : []),
		...(!isSystem && isInRecycleBin ? [MenuItems.Separator, MenuItems.Delete] : []),
		...(!isSystem ? [MenuItems.Separator, MenuItems.Properties] : []),
	]
	const whenNoSelectedNote = [MenuItems.About, MenuItems.DarkMode]

	const rect = toolbar.value.getBoundingClientRect()

	menuManager.showMenu(
		{ x: 10, y: rect.bottom },
		noteManager.tree.selectedNote() ? whenSelectedNote : whenNoSelectedNote,
	)
}

defineExpose({
	searchAllNotes,
})
</script>
