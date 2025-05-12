import { reactive } from 'vue'
import { noteManager, notificationList } from '../global'
import { settingsManager } from './settings-manager'
import type { Guid } from './types/guid'
import { mimiriPlatform } from './mimiri-platform'

export interface NotificationManagerState {
	unread: number
	count: number
	notifications: MimiriNotification[]
}

export interface MimiriNotification {
	id: number
	type: string
	title: string
	timestamp: Date
	icon: string
	read: boolean
	version?: string
}

export class NotificationManager {
	private nextId = 1
	public readonly state: NotificationManagerState = reactive({
		unread: 0,
		count: 0,
		notifications: [],
	})

	public readonly

	constructor() {}

	private updateCounts() {
		this.state.count = this.state.notifications.length
		this.state.unread = this.state.notifications.filter(item => !item.read).length
	}

	public show() {
		notificationList.value.show(settingsManager.state.titleBarHeight)
	}

	public hide() {
		notificationList.value.close()
	}

	public activateNotification(id: number) {
		const notification = this.state.notifications.find(item => item.id === id)
		if (notification.type === 'update') {
			noteManager.getNoteById('settings-update' as Guid)?.select()
			notificationList.value.close()
			if (mimiriPlatform.isPhone) {
				noteManager.openNote()
			}
		}
	}

	public updateAvailable(version: string, releaseDate: Date) {
		if (this.state.notifications.length > 0 && this.state.notifications[0].type === 'update') {
			if (this.state.notifications[0].version === version) {
				return
			} else {
				this.state.notifications.shift()
			}
		}
		this.state.notifications.unshift({
			id: this.nextId++,
			type: 'update',
			title: `Update to ${version}`,
			icon: 'update',
			timestamp: releaseDate,
			read: false,
			version,
		})
		this.updateCounts()
	}

	public markAllAsRead() {
		this.state.notifications.forEach(item => (item.read = true))
		this.updateCounts()
	}

	public get unread() {
		return this.state.unread
	}

	public get count() {
		return this.state.count
	}

	public get showing() {
		return notificationList.value.isShowing()
	}
}
