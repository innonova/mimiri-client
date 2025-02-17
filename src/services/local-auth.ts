import { mimiriPlatform } from './mimiri-platform'
import { settingsManager } from './settings-manager'
import { ipcClient, noteManager, updateManager } from '../global'
import { reactive } from 'vue'
import type { LoginListener } from './note-manager'
import type { HideShowListener } from './ipc-client'

class LocalAuth implements LoginListener, HideShowListener {
	private _state: any = reactive({ locked: false })
	private _lockTimeout: number = 60000
	private _timer

	constructor() {
		noteManager.registerListener(this)
		this._state.locked = sessionStorage.getItem('locked') === 'true'
		void this.init()
	}

	login() {
		if (this._state.locked) {
			this.showing()
		}
	}

	logout() {
		this._state.locked = false
		sessionStorage.setItem('locked', 'false')
	}

	online() {}

	public async init() {
		ipcClient.menu.registerHideShowListener(this)
		await this.showing()
	}

	public async unlockWithPin(pin: string) {
		const pinCode = noteManager.root.note.getItem('config')?.pinCode
		if (pin === pinCode) {
			localStorage.setItem('lastPin', 'success')
			await this.unlock()
		} else {
			localStorage.setItem('lastPin', 'failure')
			noteManager.logout()
		}
	}

	public async unlock() {
		this.lastPause = -1
		this._state.locked = false
		sessionStorage.setItem('locked', 'false')
		if (noteManager.isLoggedIn) {
			updateManager.check()
			noteManager.loadShareOffers()
			await noteManager.selectedNote?.refresh()
		}
	}

	public async lock() {
		this._state.locked = true
		sessionStorage.setItem('locked', 'true')
	}

	public async showing() {
		if (this._timer) {
			clearTimeout(this._timer)
			this._timer = undefined
		}
		if (!this._state.locked) {
			return
		}
		if (this.lastPause < 0 || Date.now() - this.lastPause < this._lockTimeout) {
			await this.unlock()
		} else if (mimiriPlatform.isElectron) {
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
	}

	public async hiding() {
		if (!this._state.locked) {
			this.lastPause = Date.now()
			if (mimiriPlatform.isElectron) {
				if (!this._timer) {
					this._timer = setTimeout(() => {
						this._timer = undefined
						this.lock()
					}, this._lockTimeout)
				}
			} else {
				await this.lock()
			}
		}
	}

	public async setPin(pin: string) {
		noteManager.root.note.changeItem('config').pinCode = pin
		await noteManager.root.save()
		settingsManager.pinEnabled = true
	}

	public disablePin() {
		settingsManager.pinEnabled = false
	}

	public get pinEnabled() {
		return settingsManager.pinEnabled && !!noteManager.root.note.getItem('config')?.pinCode
	}

	public get locked() {
		return this._state.locked
	}

	public get pin() {
		return noteManager.root.note.getItem('config').pinCode
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
