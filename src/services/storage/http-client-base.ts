import { debug, updateManager } from '../../global'
import { CryptSignature } from '../crypt-signature'
import { settingsManager } from '../settings-manager'

export class HttpRequestError extends Error {
	constructor(
		msg: string,
		public statusCode: number,
	) {
		super(msg)
		Object.setPrototypeOf(this, HttpRequestError.prototype)
	}
}

export abstract class HttpClientBase {
	private _serverSignature: CryptSignature

	protected constructor(
		protected host: string,
		private serverKeyId: string,
		serverKey: string,
	) {
		if (serverKey) {
			CryptSignature.fromPem('RSA;3072', serverKey).then(sig => (this._serverSignature = sig))
		}
	}

	protected get simulateOffline(): boolean {
		return !!localStorage?.getItem('mimiri_simulate_no_network')
	}

	protected async get<T>(path: string): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		const start = performance.now()
		if (settingsManager.debugEnabled) {
			if (debug.settings.preCallLatencyEnabled) {
				if (debug.settings.preCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.preCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.preCallLatency))
				}
			}
			if (debug.settings.callErrorFrequencyEnabled && Math.random() < debug.callErrorFrequency / 100) {
				throw new Error('Simulated error')
			}
		}
		// console.log('GET', `${this.host}${path}`, window.location.origin)
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
			headers: {
				'X-Mimiri-Version': `${updateManager.platformString}`,
			},
		})
		if (settingsManager.debugEnabled) {
			if (debug.settings.postCallLatencyEnabled) {
				if (debug.settings.postCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.postCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.postCallLatency))
				}
			}
		}
		if (settingsManager.debugEnabled && debug.settings.latencyThreshold > 0) {
			const latency = performance.now() - start
			if (latency > debug.settings.latencyThreshold) {
				debug.logLatency(`GET ${path} took ${latency}ms`, latency)
			}
		}
		if (response.status !== 200) {
			throw new HttpRequestError(`Get of ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	protected async post<T>(path: string, data: any, encrypt: boolean = false): Promise<T> {
		if (this.simulateOffline) {
			throw new Error('Simulate offline')
		}
		const start = performance.now()
		if (settingsManager.debugEnabled) {
			if (debug.settings.preCallLatencyEnabled) {
				if (debug.settings.preCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.preCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.preCallLatency))
				}
			}
			if (debug.settings.callErrorFrequencyEnabled && Math.random() < debug.callErrorFrequency / 100) {
				throw new Error('Simulated error')
			}
		}
		let body = data
		if (encrypt && this._serverSignature) {
			body = {
				keyId: this.serverKeyId,
				data: await this._serverSignature.encrypt(JSON.stringify(data)),
			}
		}
		// console.log('POST', `${this.host}${path}`, data)
		const response = await fetch(`${this.host}${path}`, {
			method: 'POST',
			headers: {
				'X-Mimiri-Version': `${updateManager.platformString}`,
			},
			body: JSON.stringify(body),
		})
		if (settingsManager.debugEnabled) {
			if (debug.settings.postCallLatencyEnabled) {
				if (debug.settings.postCallLatencyRandom) {
					await new Promise(resolve => setTimeout(resolve, Math.random() * debug.settings.postCallLatency))
				} else {
					await new Promise(resolve => setTimeout(resolve, debug.settings.postCallLatency))
				}
			}
		}
		if (settingsManager.debugEnabled && debug.settings.latencyThreshold > 0) {
			const latency = performance.now() - start
			if (latency > debug.settings.latencyThreshold) {
				debug.logLatency(`POST ${path} took ${latency}ms`, latency)
			}
		}
		if (response.status !== 200) {
			throw new HttpRequestError(`Post to ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}
}
