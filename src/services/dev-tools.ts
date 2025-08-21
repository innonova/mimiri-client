import type { HideShowListener } from './ipc-client'

export class DevTools {
	private _enabled = false
	private _tools: any = {}

	constructor(env: any) {
		if (env.DEV) {
			const top = window as any
			if (!top.devTools) {
				top.devTools = this._tools
				this._enabled = true
			}
		}
	}

	registerHideShowListener(listener: HideShowListener) {
		if (this._enabled) {
			this._tools.hideShowListener = listener
		}
	}

	registerSetLockTimeout(listener: (timeout: number) => void) {
		if (this._enabled) {
			this._tools.setLockTimeout = listener
		}
	}
}
