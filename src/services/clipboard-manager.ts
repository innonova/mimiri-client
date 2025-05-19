import { Capacitor, registerPlugin } from '@capacitor/core'

export class ClipboardManager {
	private _clipboardPlugin: any

	constructor() {
		if (Capacitor.isPluginAvailable('MimiriClipboard')) {
			this._clipboardPlugin = registerPlugin<any>('MimiriClipboard')
		}
	}

	public write(text: string) {
		if (this._clipboardPlugin) {
			this._clipboardPlugin.write({ text })
		} else {
			navigator.clipboard.writeText(text)
		}
	}
}
