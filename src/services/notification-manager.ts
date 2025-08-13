import { reactive } from 'vue'
import { noteManager, notificationList } from '../global'
import { settingsManager, UpdateMode } from './settings-manager'
import type { Guid } from './types/guid'

export interface NotificationManagerState {
	unread: number
	count: number
	strong: boolean
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
	strong: boolean
}

export class NotificationManager {
	private nextId = 1
	public readonly state: NotificationManagerState = reactive({
		unread: 0,
		count: 0,
		strong: false,
		notifications: [],
	})

	public readonly

	constructor() {}

	private updateCounts() {
		this.state.count = this.state.notifications.length
		this.state.unread = this.state.notifications.filter(item => !item.read).length
		this.state.strong = this.state.notifications.some(item => !item.read && item.strong)
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
			notificationList.value.close()
			noteManager.tree.openNote('settings-update' as Guid)
		}
		if (notification.type === 'blog') {
			notificationList.value.close()
			noteManager.tree.openNote('settings-blog' as Guid)
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
			strong: settingsManager.updateMode === UpdateMode.StrongNotify,
		})
		this.updateCounts()
	}

	public blogAvailable(releaseDate: Date) {
		if (this.state.notifications.length > 0 && this.state.notifications[0].type === 'blog') {
			this.state.notifications.shift()
		}
		this.state.notifications.unshift({
			id: this.nextId++,
			type: 'blog',
			title: `New blog post`,
			icon: 'announcement',
			timestamp: releaseDate,
			read: false,
			strong: settingsManager.blogPostNotificationLevel === 'clearly',
		})
		this.updateCounts()
	}

	public blogRead() {
		this.state.notifications = this.state.notifications.filter(item => item.type !== 'blog')
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

	public get strong() {
		return this.state.strong
	}

	public get showing() {
		return notificationList.value.isShowing()
	}
}
