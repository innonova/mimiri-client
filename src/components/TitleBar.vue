<template>
	<div
		id="title-bar"
		class="w-full hidden desktop:flex flex-row items-center select-none bg-title-bar text-size-menu"
		:class="{
			'text-title-text': hasFocus,
			'text-title-text-blur': !hasFocus,
			drag: !menuManager.state.menuShowing,
			'h-[36px] pr-[138px] pl-px': mimiriPlatform.isWindows,
			'h-[36px] pr-[95px] pl-px': mimiriPlatform.isLinux,
			'h-[36px] pr-[5px] pl-[65px]': mimiriPlatform.isMac,
			'h-14': !mimiriPlatform.isDesktop,
		}"
		@click="titleBarClick"
		data-testid="title-bar"
	>
		<img
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="ml-1.5 mr-1 mt-px p-1 min-w-7 w-7 h-7"
			src="/img/logo.png"
		/>
		<div
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="hover:bg-title-hover cursor-default rounded-sm px-2 no-drag"
			data-testid="title-menu-file"
			@click="menuClick($event, 'file')"
			@mouseenter="menuHover($event, 'file')"
		>
			File
		</div>
		<div
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="hover:bg-title-hover cursor-default rounded-sm px-2 no-drag"
			data-testid="title-menu-edit"
			@click="menuClick($event, 'edit')"
			@mouseenter="menuHover($event, 'edit')"
		>
			Edit
		</div>
		<div
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="hover:bg-title-hover cursor-default rounded-sm px-2 no-drag"
			data-testid="title-menu-view"
			@click="menuClick($event, 'view')"
			@mouseenter="menuHover($event, 'view')"
		>
			View
		</div>
		<div
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="hover:bg-title-hover cursor-default rounded-sm px-2 no-drag"
			data-testid="title-menu-tools"
			@click="menuClick($event, 'tools')"
			@mouseenter="menuHover($event, 'tools')"
		>
			Tools
		</div>
		<div
			v-if="mimiriPlatform.isDesktop && !mimiriPlatform.isMac"
			class="hover:bg-title-hover cursor-default rounded-sm px-2 no-drag"
			data-testid="title-menu-help"
			@click="menuClick($event, 'help')"
			@mouseenter="menuHover($event, 'help')"
		>
			Help
		</div>
		<div
			class="w-full flex mr-30 h-full py-[5px]"
			:class="{
				'justify-around': mimiriPlatform.isDesktop,
				'justify-start pl-1': !mimiriPlatform.isDesktop,
			}"
		>
			<input
				ref="searchInput"
				type="text"
				placeholder="Search Notes"
				:value="searchManager.state.term"
				:disabled="!noteManager.state.authenticated"
				class="bg-input rounded-md text-center no-drag text-size-base h-full pb-1 outline-none"
				:class="{
					'w-2/3 max-w-80': mimiriPlatform.isDesktop,
					'w-full': !mimiriPlatform.isDesktop,
				}"
				@blur="endEdit"
				@keydown="checkSearch"
			/>
		</div>
		<div
			v-if="mimiriPlatform.isWindows || mimiriPlatform.isMac"
			class="h-full min-w-[44px] w-[55px] flex items-center justify-center hover:bg-toolbar-hover active:bg-toolbar-hover"
			@click="toggleScreenSharing()"
			:title="
				settingsManager.allowScreenSharing
					? 'Warning: Visible to screen sharing/shot!'
					: 'Invisible to screen sharing/shot'
			"
		>
			<ScreenShareEnabledIcon
				v-if="settingsManager.allowScreenSharing"
				class="w-9 h-6 p-0.5 px-1 no-drag pointer-events-none text-warning"
			></ScreenShareEnabledIcon>
			<ScreenShareDisabledIcon
				v-if="!settingsManager.allowScreenSharing"
				class="w-9 h-6 p-0.5 px-1 no-drag pointer-events-none text-title-text-blur"
			></ScreenShareDisabledIcon>
		</div>
		<div
			class="h-full flex items-center justify-center relative"
			:class="{
				'hover:bg-toolbar-hover active:bg-toolbar-hover': notificationManager.count > 0,
				'min-w-[28px] w-[28px]': mimiriPlatform.isDesktop,
				'w-14 ml-2': !mimiriPlatform.isDesktop,
			}"
			@click="notificationsClick()"
			title="Notifications"
		>
			<NotificationIcon
				v-if="notificationManager.unread === 0"
				class="w-9 h-6 p-px mt-0.5 no-drag pointer-events-none"
				:class="{
					'text-title-text-blur': notificationManager.count <= 0,
				}"
			></NotificationIcon>
			<NotificationActiveIcon
				v-if="notificationManager.unread > 0"
				class="w-9 h-6 p-px no-drag pointer-events-none"
			></NotificationActiveIcon>
			<div
				v-if="
					notificationManager.unread > 0 &&
					updateManager.isUpdateAvailable &&
					settingsManager.updateMode === UpdateMode.StrongNotify
				"
				class="absolute bottom-1 left-px w-2 h-2 rounded-sm bg-bad"
			></div>
		</div>
		<div
			class="h-full flex items-center justify-center"
			:class="{
				'hover:bg-toolbar-hover active:bg-toolbar-hover': noteManager.isLoggedIn,
				'min-w-[44px] w-[55px]': mimiriPlatform.isDesktop,
				'w-16': !mimiriPlatform.isDesktop,
			}"
			data-testid="account-button"
			title="Account"
			@click="menuClick($event, 'account')"
			@mouseenter="menuHover($event, 'account')"
		>
			<AccountIcon
				class="w-9 h-6 p-0.5 px-1 no-drag pointer-events-none"
				:class="{
					'text-title-text-blur': !noteManager.state.authenticated,
					'p-px text-online active:p-px': noteManager.state.online && noteManager.state.authenticated,
					'p-px text-offline active:p-px': !noteManager.state.online && noteManager.state.authenticated,
				}"
			></AccountIcon>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { noteManager, searchInput, showSearchBox, ipcClient, notificationManager, updateManager } from '../global'
import ScreenShareEnabledIcon from '../icons/screen-sharing-enabled.vue'
import ScreenShareDisabledIcon from '../icons/screen-sharing-disabled.vue'
import AccountIcon from '../icons/account.vue'
import NotificationIcon from '../icons/notification.vue'
import NotificationActiveIcon from '../icons/notification-active.vue'
import { searchManager } from '../services/search-manager'
import { MenuItems, menuManager } from '../services/menu-manager'
import { settingsManager, UpdateMode } from '../services/settings-manager'
import { mimiriPlatform } from '../services/mimiri-platform'
import { useEventListener } from '@vueuse/core'

const hasFocus = ref(true)

const updateTitleBar = () => {
	hasFocus.value = document.hasFocus()
	if (!document.hasFocus() && menuManager.state.menuShowing) {
		menuManager.close()
	}
}

updateTitleBar()

useEventListener(window, 'blur-sm', () => updateTitleBar())
useEventListener(window, 'focus', () => updateTitleBar())

const toggleScreenSharing = () => {
	settingsManager.allowScreenSharing = !settingsManager.allowScreenSharing
}

const searchAllNotes = () => {
	searchInput.value.focus()
}

const checkSearch = e => {
	e.stopPropagation()
	if (e.key === 'Escape') {
		searchInput.value.blur()
	}
	if (e.key === 'Enter') {
		showSearchBox.value = true
		searchManager.search(searchInput.value.value)
	}
}

const endEdit = e => {
	searchManager.updateTerm(searchInput.value.value)
}

const notificationsClick = () => {
	if (notificationManager.count > 0) {
		menuManager.close()
		notificationManager.show()
	}
}

const menuHover = (event, menu: string) => {
	if (menuManager.state.menuShowing) {
		event.stopPropagation()
		event.preventDefault()
		const rect = event.target.getBoundingClientRect()
		showMenu(rect, menu)
	}
}

const menuClick = (event, menu: string) => {
	if (!menuManager.state.menuShowing) {
		event.stopPropagation()
		event.preventDefault()
		const rect = event.target.getBoundingClientRect()
		showMenu(rect, menu)
	} else {
		menuManager.close()
	}
}

const titleBarClick = () => {
	if (menuManager.state.menuShowing) {
		menuManager.close()
	}
}

const showMenu = (rect, menu) => {
	if (menu === 'file') {
		menuManager.showMenu({ x: rect.left, y: rect.bottom - 30, backdropTop: 32 }, menuManager.fileMenu)
	}
	if (menu === 'edit') {
		menuManager.showMenu({ x: rect.left, y: rect.bottom - 30, backdropTop: 32 }, menuManager.editMenu)
	}
	if (menu === 'view') {
		menuManager.showMenu({ x: rect.left, y: rect.bottom - 30, backdropTop: 32 }, menuManager.viewMenu)
	}
	if (menu === 'tools') {
		menuManager.showMenu({ x: rect.left, y: rect.bottom - 30, backdropTop: 32 }, menuManager.toolsMenu)
	}
	if (menu === 'help') {
		menuManager.showMenu({ x: rect.left, y: rect.bottom - 30, backdropTop: 32 }, menuManager.helpMenu)
	}
	if (menu === 'account') {
		menuManager.showMenu({ x: rect.right, y: rect.bottom - 30, backdropTop: 32, alignRight: true }, [
			...(noteManager.isAnonymous
				? [MenuItems.CreatePassword, MenuItems.DeleteAccount]
				: [
						MenuItems.ChangeUsername,
						MenuItems.ChangePassword,
						...(mimiriPlatform.isElectron ? [MenuItems.SetPin] : []),
						MenuItems.DeleteAccount,
					]),
			...(mimiriPlatform.isDesktop ? [MenuItems.Separator, MenuItems.ManageSubscription] : []),
			...(!noteManager.isAnonymous && ipcClient.isAvailable ? [MenuItems.Separator] : []),
			...(noteManager.isAnonymous ? [MenuItems.Login] : [MenuItems.Logout]),
			...(ipcClient.isAvailable ? [MenuItems.Separator, MenuItems.GoOnline] : []),
		])
	}
}

defineExpose({
	searchAllNotes,
})
</script>
