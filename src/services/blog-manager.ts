import { reactive, computed } from 'vue'
import { settingsManager } from './settings-manager'
import { emptyGuid } from './types/guid'
import type { Guid } from './types/guid'
import type { BlogPost } from './types/responses'
import { env, notificationManager, updateManager } from '../global'
import type { MimiriStore } from './storage/mimiri-store'

export interface BlogConfig {
	notificationLevel: 'notify-clearly' | 'notify-discreetly' | 'notify-never'
}

export interface BlogState {
	isInitialized: boolean
	latestPostId: Guid
	latestPostDate?: Date
}

export class BlogManager {
	private noteManager: MimiriStore
	public state: BlogState

	constructor(noteManager: MimiriStore) {
		this.noteManager = noteManager
		this.state = reactive<BlogState>({
			latestPostId: emptyGuid(),
			isInitialized: false,
		})
	}

	private async updateLatestBlogPost(): Promise<void> {
		try {
			const blogPost = (await fetch(`${env.VITE_MIMIRI_API_HOST}/blog/latest/metadata`, {
				method: 'GET',
				headers: {
					'X-Mimiri-Version': `${updateManager.platformString}`,
				},
			}).then(res => res.json())) as BlogPost
			this.state.latestPostId = blogPost.id
			this.state.latestPostDate = blogPost.publishDate ? new Date(blogPost.publishDate) : undefined
			if (
				settingsManager.blogPostNotificationLevel !== 'never' &&
				this.state.latestPostId !== settingsManager.lastReadBlogPostId &&
				this.state.latestPostId !== emptyGuid()
			) {
				notificationManager.blogAvailable(new Date(this.state.latestPostDate))
			}
		} catch {
			this.state.latestPostId = emptyGuid()
			this.state.latestPostDate = undefined
		}
	}

	public async addComment(postId: Guid, username: string, comment: string): Promise<void> {
		if (settingsManager.disableDevBlog) {
			return
		}
		await this.noteManager.feedback.addComment(postId, username, comment)
	}

	public async initialize(): Promise<boolean> {
		if (settingsManager.disableDevBlog) {
			return false
		}
		if (this.state.isInitialized) {
			return false
		}

		await this.updateLatestBlogPost()
		this.state.isInitialized = true
		return true
	}

	public getConfig(): BlogConfig {
		let notificationLevel: BlogConfig['notificationLevel']

		switch (settingsManager.blogPostNotificationLevel) {
			case 'clearly':
				notificationLevel = 'notify-clearly'
				break
			case 'discreetly':
				notificationLevel = 'notify-discreetly'
				break
			default:
				notificationLevel = 'notify-never'
				break
		}

		return { notificationLevel }
	}

	public applyConfig(config: BlogConfig): void {
		switch (config.notificationLevel) {
			case 'notify-clearly':
				settingsManager.blogPostNotificationLevel = 'clearly'
				break
			case 'notify-discreetly':
				settingsManager.blogPostNotificationLevel = 'discreetly'
				break
			case 'notify-never':
				settingsManager.blogPostNotificationLevel = 'never'
				break
		}
	}

	public async refreshAll(): Promise<void> {
		if (settingsManager.disableDevBlog) {
			return
		}
		if (!(await this.initialize())) {
			await this.updateLatestBlogPost()
		}
	}

	public markAsRead(): void {
		settingsManager.lastReadBlogPostId = this.state.latestPostId
		notificationManager.blogRead()
	}

	public get hasNewPost() {
		return computed(
			() => this.state.latestPostId !== emptyGuid() && this.state.latestPostId !== settingsManager.lastReadBlogPostId,
		)
	}
}
