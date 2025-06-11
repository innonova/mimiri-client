import { reactive, computed } from 'vue'
import { settingsManager } from './settings-manager'
import { newGuid } from './types/guid'
import type { Guid } from './types/guid'
import type { BlogPost, Comment } from './types/responses'

export interface BlogConfig {
	notificationLevel: 'notify-clearly' | 'notify-discreetly' | 'notify-never'
}

export interface BlogState {
	currentPostId: Guid
	currentPost: BlogPost | null
	posts: BlogPost[]
	comments: Comment[]
	isLoading: boolean
	isInitialized: boolean
}

export class BlogManager {
	private noteManager: any
	public state: BlogState

	constructor(noteManager: any) {
		this.noteManager = noteManager
		this.state = reactive<BlogState>({
			currentPostId: newGuid(),
			currentPost: null,
			posts: [],
			comments: [],
			isLoading: false,
			isInitialized: false,
		})
	}

	private async loadLatestPost(): Promise<void> {
		this.state.isLoading = true
		try {
			const { posts } = await this.noteManager.getLatestBlogPosts(1, true)
			if (posts && posts.length > 0) {
				this.state.currentPost = posts[0]
				this.state.currentPostId = posts[0].id
			}
		} finally {
			this.state.isLoading = false
		}
	}

	private async loadPostHistory(): Promise<void> {
		this.state.isLoading = true
		try {
			const { posts } = await this.noteManager.getLatestBlogPosts(10, false)
			this.state.posts = posts || []
		} finally {
			this.state.isLoading = false
		}
	}

	private async loadComments(): Promise<void> {
		this.state.isLoading = true
		try {
			const response = await this.noteManager.getComments(this.state.currentPostId)
			this.state.comments = response.comments || []
		} finally {
			this.state.isLoading = false
		}
	}

	public async selectPost(postId: Guid): Promise<void> {
		this.state.isLoading = true
		try {
			const { posts } = await this.noteManager.getBlogPost(postId)
			if (posts && posts.length > 0) {
				this.state.currentPost = posts[0]
				this.state.currentPostId = postId
				await this.loadComments()
			}
		} finally {
			this.state.isLoading = false
		}
	}

	public async addComment(username: string, comment: string): Promise<void> {
		this.state.isLoading = true
		try {
			await this.noteManager.addComment(this.state.currentPostId, username, comment)
			await this.loadComments()
		} finally {
			this.state.isLoading = false
		}
	}

	public async initialize(): Promise<void> {
		if (this.state.isInitialized) return

		this.state.isLoading = true
		try {
			await this.loadLatestPost()
			await this.loadComments()
			await this.loadPostHistory()
			this.state.isInitialized = true
		} finally {
			this.state.isLoading = false
		}
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
		await this.loadLatestPost()
		await this.loadPostHistory()
		await this.loadComments()
	}

	public get currentPost() {
		return computed(() => this.state.currentPost)
	}

	public get posts() {
		return computed(() => this.state.posts)
	}

	public get comments() {
		return computed(() => this.state.comments)
	}

	public get isLoading() {
		return computed(() => this.state.isLoading)
	}

	public get isInitialized() {
		return computed(() => this.state.isInitialized)
	}
}
