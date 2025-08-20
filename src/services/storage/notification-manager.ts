import { watch } from 'vue'
import { AccountType, type SharedState } from './type'
import type { MimiriClient } from './mimiri-client'
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr'
import { debug } from '../../global'
import { incrementalDelay } from '../helpers'
import { newGuid } from '../types/guid'

export class NotificationManager {
	private _connection: HubConnection | null = null
	private _suspended = false
	private _workOffline = false
	private _connectionExpected = false
	private _resumeTime = Date.now()

	constructor(
		private api: MimiriClient,
		private state: SharedState,
		private notificationsCallback: (type: string, payload: any) => void,
	) {
		watch(this.state, () => {
			this._workOffline =
				!this.state.isLoggedIn || this.state.workOffline || this.state.accountType !== AccountType.Cloud
			void this.updateState()
		})
	}

	private async updateState() {
		if (!this._suspended && !this._workOffline && !this._connectionExpected && this.state.isLoggedIn) {
			if (this.state.isMobile && Date.now() - this._resumeTime < 10000) {
				setTimeout(() => {
					void this.updateState()
				}, 500)
				return
			}
			this._connectionExpected = true
			await this.connect()
		}
		if ((this._suspended || this._workOffline) && this._connectionExpected) {
			this._connectionExpected = false
			await this.close()
		}
	}

	private createConnection(url: string, token: string): HubConnection {
		const connection = new HubConnectionBuilder()
			.withUrl(url, { accessTokenFactory: () => token })
			// .configureLogging(LogLevel.Warning)
			.withAutomaticReconnect()
			.build()

		connection.on('notification', async (sender, type, payload) => {
			if (type === 'note-update' || type === 'sync') {
				this.notificationsCallback('sync', payload)
			}
			if (type === 'bundle-update') {
				this.notificationsCallback('bundle-update', payload)
			}
			if (type === 'blog-post') {
				this.notificationsCallback('blog-post', payload)
			}
		})
		connection.onreconnecting(error => {
			this.state.isOnline = false
			this.notificationsCallback('reconnecting', error)
		})
		connection.onreconnected(() => {
			this.state.isOnline = true
			this.notificationsCallback('reconnected', null)
		})
		connection.onclose(error => {
			this.state.isOnline = false
			this.notificationsCallback('closed', error)
		})
		return connection
	}

	private async connect(attempt: number = 0) {
		console.log('Connecting to notifications')
		try {
			if (!this._connectionExpected) {
				return
			}
			if (this.simulateOffline) {
				throw new Error('Simulate offline')
			}
			const response = await this.api.createNotificationUrl()
			if (!response?.url) {
				return
			}
			this._connection = this.createConnection(response.url, response.token)
			await this._connection.start()
			console.log('Connected to notifications')
			this.state.isOnline = true
			this.notificationsCallback('connected', null)
		} catch (ex) {
			void this._connection?.stop().catch()
			this._connection = null
			debug.logError('Failed to connect for notifications', ex)
			void incrementalDelay(attempt).then(() => {
				void this.connect(attempt + 1)
			})
		}
	}

	private async close() {
		console.log('Closing notifications connection')
		if (this._connection) {
			try {
				await this._connection.stop()
			} catch (ex) {
				console.log('Error stopping SignalR connection', ex)
			} finally {
				this._connection = null
			}
		}
	}

	private get simulateOffline(): boolean {
		return !!localStorage?.getItem('mimiri_simulate_no_network')
	}

	public suspend() {
		this._suspended = true
		void this.updateState()
	}

	public resume() {
		this._suspended = false
		this._resumeTime = Date.now()
		if (this.state.isMobile) {
			this.notificationsCallback('resumed', null)
		}
		void this.updateState()
	}
}
