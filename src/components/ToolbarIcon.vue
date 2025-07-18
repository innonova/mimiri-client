<template>
	<button class="inline-block group" @click="onClick" @mouseenter="onMouseenter" :title="props.title">
		<component
			:is="getComponent()"
			:class="{
				'w-12 h-12 p-3': !props.keepSizeOnMobile,
				'desktop:w-6 desktop:h-6 desktop:p-0.5 desktop:m-0.5 desktop:mr-1':
					!props.keepSizeOnMobile && !mimiriPlatform.isTablet,
				'w-5 h-5 p-px': props.keepSizeOnMobile,
				'text-toolbar-disabled': props.disabled,
				'hover:bg-toolbar-hover active:bg-toolbar-hover active:p-[4px]': !props.disabled && props.hoverEffect,
				'bg-toolbar-toggled': props.toggledOn,
				'p-px text-online active:p-px': props.icon === 'online',
				'p-px text-offline active:p-px': props.icon === 'offline',
				'text-online': props.icon === 'account-online',
				'text-offline': props.icon === 'account-offline',
				'text-shared': props.icon === 'note-shared',
			}"
		/>
		<div v-if="props.icon === 'history' && props.toggledOn" class="h-0 group-hover:invisible">
			<!-- Connects the history icon with the info bar -->
			<div class="relative -top-0.5 bg-toolbar-toggled h-1 ml-0.5 mr-1" />
		</div>
	</button>
</template>

<script setup lang="ts">
	import CloudIcon from '../icons/cloud.vue'
	import AddRootIcon from '../icons/add-root.vue'
	import AddNoteIcon from '../icons/add-note.vue'
	import AddSiblingNoteIcon from '../icons/add-sibling-note.vue'
	import RenameIcon from '../icons/rename.vue'
	import DeleteIcon from '../icons/delete.vue'
	import RefreshIcon from '../icons/refresh.vue'
	import SearchAllIcon from '../icons/search-all.vue'
	import SearchIcon from '../icons/search.vue'
	import NoteIcon from '../icons/note.vue'
	import SaveIcon from '../icons/save.vue'
	import WordwrapOnIcon from '../icons/word-wrap-on.vue'
	import WordwrapOffIcon from '../icons/word-wrap-off.vue'
	import UndoIcon from '../icons/undo.vue'
	import RedoIcon from '../icons/redo.vue'
	import HistoryIcon from '../icons/history.vue'
	import BackIcon from '../icons/back.vue'
	import CheckmarkIcon from '../icons/check-mark.vue'
	import MenuIcon from '../icons/menu.vue'
	import LogoutIcon from '../icons/logout.vue'
	import LoginIcon from '../icons/login.vue'
	import HelpIcon from '../icons/help.vue'
	import AccountIcon from '../icons/account.vue'
	import NotificationIcon from '../icons/notification.vue'
	import NotificationActiveIcon from '../icons/notification-active.vue'
	import HideIcon from '../icons/hide.vue'
	import PlusIcon from '../icons/plus.vue'
	import PlusSmallIcon from '../icons/plus-small.vue'
	import AnnouncementIcon from '../icons/announcement.vue'
	import { mimiriPlatform } from '../services/mimiri-platform'
	import { debug } from '../global'

	const props = defineProps<{
		icon: string
		title?: string
		disabled?: boolean
		hoverEffect?: boolean
		toggledOn?: boolean
		keepSizeOnMobile?: boolean
	}>()

	const getComponent = () => {
		if (props.icon === 'online') {
			return CloudIcon
		}
		if (props.icon === 'offline') {
			return CloudIcon
		}
		if (props.icon === 'add-root-note') {
			return AddRootIcon
		}
		if (props.icon === 'add-note') {
			return AddNoteIcon
		}
		if (props.icon === 'add-sibling-note') {
			return AddSiblingNoteIcon
		}
		if (props.icon === 'rename-note') {
			return RenameIcon
		}
		if (props.icon === 'delete-note') {
			return DeleteIcon
		}
		if (props.icon === 'refresh') {
			return RefreshIcon
		}
		if (props.icon === 'search-all-notes') {
			return SearchAllIcon
		}
		if (props.icon === 'search-note') {
			return SearchIcon
		}
		if (props.icon === 'note') {
			return NoteIcon
		}
		if (props.icon === 'note-shared') {
			return NoteIcon
		}
		if (props.icon === 'save') {
			return SaveIcon
		}
		if (props.icon === 'wordwrap-on') {
			return WordwrapOnIcon
		}
		if (props.icon === 'wordwrap-off') {
			return WordwrapOffIcon
		}
		if (props.icon === 'undo') {
			return UndoIcon
		}
		if (props.icon === 'redo') {
			return RedoIcon
		}
		if (props.icon === 'history') {
			return HistoryIcon
		}
		if (props.icon === 'back') {
			return BackIcon
		}
		if (props.icon === 'checkmark') {
			return CheckmarkIcon
		}
		if (props.icon === 'menu') {
			return MenuIcon
		}
		if (props.icon === 'logout') {
			return LogoutIcon
		}
		if (props.icon === 'login') {
			return LoginIcon
		}
		if (props.icon === 'help') {
			return HelpIcon
		}
		if (props.icon === 'account' || props.icon === 'account-online' || props.icon === 'account-offline') {
			return AccountIcon
		}
		if (props.icon === 'notifications') {
			return NotificationIcon
		}
		if (props.icon === 'notifications-active') {
			return NotificationActiveIcon
		}
		if (props.icon === 'hide') {
			return HideIcon
		}
		if (props.icon === 'plus') {
			return PlusIcon
		}
		if (props.icon === 'plus-small') {
			return PlusSmallIcon
		}
		if (props.icon === 'announcement') {
			return AnnouncementIcon
		}
	}

	const emit = defineEmits(['click', 'mouseenter'])

	const onClick = event => {
		emit('click', event)
	}

	const onMouseenter = event => {
		emit('mouseenter', event)
	}
</script>
