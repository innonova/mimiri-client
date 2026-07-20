import { Capacitor, registerPlugin } from '@capacitor/core'

export class ClipboardManager {
	private _clipboardPlugin: any

	constructor() {
		if (Capacitor.isPluginAvailable('MimiriClipboard')) {
			this._clipboardPlugin = registerPlugin<any>('MimiriClipboard')
		}
	}

	public write(text: string) {
		try {
			if (this._clipboardPlugin) {
				this._clipboardPlugin.write({ text })
			} else {
				void navigator.clipboard.writeText(text).catch(err => {
					console.error('Clipboard write failed:', err)
				})
			}
		} catch (err) {
			console.error('Clipboard write failed:', err)
		}
	}
}
