<template>
	<div class="inline-block" @click="onClick" @mouseenter="onMouseenter" :title="props.title">
		<component
			:is="getComponent()"
			:class="{
				'w-14 h-14 p-3': !props.keepSizeOnMobile,
				'md:w-7 md:h-7 md:p-0.5 md:m-0.5 md:mr-1': !props.keepSizeOnMobile && !mimiriPlatform.isTablet,
				'w-6 h-6 p-[1px]': props.keepSizeOnMobile,
				'text-toolbar-disabled': props.disabled,
				'hover:bg-toolbar-hover active:bg-toolbar-hover active:p-[4px]': !props.disabled && props.hoverEffect,
				'p-px text-online active:p-[1px]': props.icon === 'online',
				'p-px text-offline active:p-[1px]': props.icon === 'offline',
				'text-online': props.icon === 'account-online',
				'text-offline': props.icon === 'account-offline',
				'text-shared': props.icon === 'note-shared',
			}"
		></component>
	</div>
</template>

<script setup lang="ts">
import CloudIcon from '../icons/weather/cloud.vue'
import AddRootIcon from '../icons/file/new_folder.vue'
import AddNoteIcon from '../icons/file/file_new.vue'
import RenameIcon from '../icons/editor/edit_4.vue'
import DeleteIcon from '../icons/file/xls.vue'
import RefreshIcon from '../icons/system/refresh_3.vue'
import SearchAllIcon from '../icons/editor/list_search.vue'
import SearchIcon from '../icons/file/search_2.vue'
import NoteIcon from '../icons/file/document_2.vue'
import SaveIcon from '../icons/file/save_2.vue'
import WordwrapOnIcon from '../icons/file/document_3.vue'
import WordwrapOffIcon from '../icons/file/docment.vue'
import UndoIcon from '../icons/arrow/back_2.vue'
import RedoIcon from '../icons/arrow/forward_2.vue'
import HistoryIcon from '../icons/business/calendar_time_add.vue'
import BackIcon from '../icons/arrow/arrow_left.vue'
import CheckmarkIcon from '../icons/system/choice.vue'
import MenuIcon from '../icons/editor/menu.vue'
import LogoutIcon from '../icons/system/exit.vue'
import HelpIcon from '../icons/system/question.vue'
import AccountIcon from '../icons/user/user_1.vue'
import NotificationIcon from '../icons/media/notification.vue'
import NotificationActiveIcon from '../icons/media/bell_ringing.vue'
import HideIcon from '../icons/system/eye_close.vue'
import { mimiriPlatform } from '../services/mimiri-platform'

const props = defineProps<{
	icon: string
	title?: string
	disabled?: boolean
	hoverEffect?: boolean
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
}

const emit = defineEmits(['click', 'mouseenter'])

const onClick = event => {
	emit('click', event)
}

const onMouseenter = event => {
	emit('mouseenter', event)
}
</script>
