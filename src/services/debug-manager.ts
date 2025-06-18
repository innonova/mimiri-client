import { settingsManager } from './settings-manager'
import { newGuid, type Guid } from './types/guid'

interface ErrorLogItem {
	id: Guid
	message: string
	stack?: string
	timestamp: number
}

interface MessageLogItem {
	id: Guid
	message: string
	timestamp: number
}

interface LatencyLogItem {
	id: Guid
	message: string
	latency: number
	timestamp: number
}

interface DebugSettings {
	preCallLatency: number
	preCallLatencyEnabled: boolean
	preCallLatencyRandom: boolean
	postCallLatency: number
	postCallLatencyEnabled: boolean
	postCallLatencyRandom: boolean
	callErrorFrequency: number
	callErrorFrequencyEnabled: boolean
	callErrorDelay: number
	latencyThreshold: number
}

export class DebugManager {
	private _initialized = false
	private _startTime: number = Date.now()
	private _errorLog: ErrorLogItem[] = []
	private _messageLog: MessageLogItem[] = []
	private _latencyLog: LatencyLogItem[] = []
	private _settings: DebugSettings = {
		preCallLatency: 1000,
		preCallLatencyEnabled: false,
		preCallLatencyRandom: false,
		postCallLatency: 1000,
		postCallLatencyEnabled: false,
		postCallLatencyRandom: false,
		callErrorFrequency: 10,
		callErrorFrequencyEnabled: false,
		callErrorDelay: 2000,
		latencyThreshold: 1000,
	}

	loadErrorLog() {
		const log = localStorage.getItem('errorLog')
		if (log) {
			try {
				this._errorLog = JSON.parse(log) as ErrorLogItem[]
			} catch (e) {
				console.error('Failed to parse error log:', e)
				this._errorLog = []
			}
		}
	}

	loadMessageLog() {
		const log = localStorage.getItem('messageLog')
		if (log) {
			try {
				this._messageLog = JSON.parse(log) as MessageLogItem[]
			} catch (e) {
				console.error('Failed to parse message log:', e)
				this._messageLog = []
			}
		}
	}

	loadLatencyLog() {
		const log = localStorage.getItem('latencyLog')
		if (log) {
			try {
				this._latencyLog = JSON.parse(log) as LatencyLogItem[]
			} catch (e) {
				console.error('Failed to parse latency log:', e)
				this._latencyLog = []
			}
		}
	}

	private saveErrorLog() {
		if (this._errorLog.length > 0) {
			localStorage.setItem('errorLog', JSON.stringify(this._errorLog))
		}
	}

	private saveMessageLog() {
		if (this._messageLog.length > 0) {
			localStorage.setItem('messageLog', JSON.stringify(this._messageLog))
		}
	}

	private saveLatencyLog() {
		if (this._latencyLog.length > 0) {
			localStorage.setItem('latencyLog', JSON.stringify(this._latencyLog))
		}
	}

	public saveSettings(settings: DebugSettings) {
		this._settings = settings
		localStorage.setItem('debugSettings', JSON.stringify(settings))
	}

	public loadSettings() {
		const settings = localStorage.getItem('debugSettings')
		if (settings) {
			try {
				this._settings = JSON.parse(settings) as DebugSettings
			} catch (e) {
				console.error('Failed to parse debug settings:', e)
			}
		}
	}

	public init() {
		if (!this._initialized && settingsManager.debugEnabled) {
			this._initialized = true
			this._startTime = Date.now()

			this.loadErrorLog()
			this.loadMessageLog()
			this.loadLatencyLog()
			this.loadSettings()

			window.addEventListener('error', e => {
				this._errorLog.push({
					id: newGuid(),
					message: e.message,
					stack: e.error?.stack,
					timestamp: Date.now(),
				})
				while (this._errorLog.length > 100) {
					this._errorLog.shift()
				}
				this.saveErrorLog()
			})

			window.addEventListener('unhandledrejection', e => {
				this._errorLog.push({
					id: newGuid(),
					message: e.reason?.message,
					stack: e.reason?.stack,
					timestamp: Date.now(),
				})
				while (this._errorLog.length > 100) {
					this._errorLog.shift()
				}
				this.saveErrorLog()
			})
		}
	}

	public logError(message: string, error?: Error) {
		console.error(message, error)
		if (this._initialized) {
			this._errorLog.push({
				id: newGuid(),
				message,
				stack: error?.stack,
				timestamp: Date.now(),
			})
			while (this._errorLog.length > 100) {
				this._errorLog.shift()
			}
			this.saveErrorLog()
		}
	}

	public log(...message: any[]) {
		if (this._initialized) {
			this._messageLog.push({
				id: newGuid(),
				message: message
					.map(msg => {
						if (typeof msg === 'object') {
							return JSON.stringify(msg)
						}
						return String(msg)
					})
					.join(', '),
				timestamp: Date.now(),
			})
			while (this._messageLog.length > 100) {
				this._messageLog.shift()
			}
			this.saveMessageLog()
		}
	}

	public logLatency(message: string, latency: number) {
		if (this._initialized) {
			this._latencyLog.push({
				id: newGuid(),
				message,
				latency: Math.round(latency),
				timestamp: Date.now(),
			})
			while (this._latencyLog.length > 100) {
				this._latencyLog.shift()
			}
			this.saveLatencyLog()
		}
	}

	public clearErrorLog() {
		this._errorLog = []
		localStorage.removeItem('errorLog')
	}

	public clearMessageLog() {
		this._messageLog = []
		localStorage.removeItem('messageLog')
	}

	public clearLatencyLog() {
		this._latencyLog = []
		localStorage.removeItem('latencyLog')
	}

	public get callErrorFrequency() {
		if (Date.now() - this._startTime > this._settings.callErrorDelay) {
			return this._settings.callErrorFrequency
		}
		return 0
	}

	public get settings() {
		return this._settings
	}

	public get errorLog() {
		return this._errorLog
	}

	public get messageLog() {
		return this._messageLog
	}

	public get latencyLog() {
		return this._latencyLog
	}
}
