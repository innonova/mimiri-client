import { mimiriPlatform } from './mimiri-platform'
import { settingsManager } from './settings-manager'
import { devTools, env, ipcClient, noteManager, updateManager } from '../global'
import { reactive } from 'vue'
import type { HideShowListener } from './ipc-client'
import type { LoginListener } from './storage/session-manager'

class LocalAuth implements LoginListener, HideShowListener {
	private _state: any = reactive({ locked: false, elapsed: true })
	private _lockTimeout: number = 60000
	private _timer

	constructor() {
		noteManager.session.registerListener(this)
		this._state.locked = sessionStorage.getItem('locked') === 'true'
		ipcClient.menu.registerHideShowListener(this)
		devTools.registerSetLockTimeout(timeout => {
			this._lockTimeout = timeout
		})
	}

	login() {
		if (this._state.locked) {
			void this.showing()
		}
	}

	logout() {
		this._state.locked = false
		sessionStorage.setItem('locked', 'false')
	}

	online() {}

	public async unlockWithPin(pin: string) {
		const pinCode = noteManager.tree.root().note.getItem('config')?.pinCode
		if (pin === pinCode) {
			localStorage.setItem('lastPin', 'success')
			await this.unlock()
		} else {
			localStorage.setItem('lastPin', 'failure')
			await noteManager.session.logout(true)
			location.reload()
		}
	}

	public async unlock() {
		this.lastPause = -1
		this._state.locked = false
		this._state.elapsed = true
		sessionStorage.setItem('locked', 'false')
		// if (noteManager.state.isLoggedIn) {
		// 	await updateManager.check()
		// 	await blogManager.refreshAll()
		// 	noteManager.session.queueSync()
		// }
	}

	private async lock() {
		this._state.locked = true
		sessionStorage.setItem('locked', 'true')
	}

	public async showing() {
		if (updateManager.pendingActivation) {
			await updateManager.idleActivate()
		}
		if (this._timer) {
			clearTimeout(this._timer)
			this._state.elapsed = true
			this._timer = undefined
		}
		if (!this._state.locked) {
			noteManager.resume()
			return
		}
		if (this.lastPause < 0 || Date.now() - this.lastPause < this._lockTimeout) {
			await this.unlock()
		} else if (mimiriPlatform.isElectron || env.DEV) {
			if (!this.pinEnabled) {
				await this.unlock()
			}
		} else if (mimiriPlatform.supportsBiometry) {
			if (await mimiriPlatform.verifyBiometry()) {
				await this.unlock()
			}
		} else {
			await this.unlock()
		}
		noteManager.resume()
	}

	public async hiding() {
		noteManager.suspend()
		if (!this._state.locked) {
			this.lastPause = Date.now()
			if (mimiriPlatform.isElectron) {
				if (!this._timer && this.pinEnabled) {
					await this.lock()
					this._state.elapsed = false
					this._timer = setTimeout(() => {
						this._timer = undefined
						this._state.elapsed = true
					}, this._lockTimeout)
				}
			} else {
				await this.lock()
			}
		}
	}

	public async setPin(pin: string) {
		noteManager.tree.root().note.changeItem('config').pinCode = pin
		await noteManager.tree.root().save()
	}

	public get pinEnabled() {
		return noteManager.tree.root().note.getItem('config')?.pinCode?.length === 4
	}

	public get locked() {
		return this._state.locked
	}

	public get elapsed() {
		return this._state.elapsed && this._state.locked
	}

	public get pin() {
		return noteManager.tree.root().note.getItem('config').pinCode
	}

	public get lastPinFailed() {
		return localStorage.getItem('lastPin') === 'failure'
	}

	private get lastPause() {
		return +(sessionStorage.getItem('lastPause') ?? '-1')
	}

	private set lastPause(value: number) {
		sessionStorage.setItem('lastPause', `${value}`)
	}
}

export const localAuth = new LocalAuth()
