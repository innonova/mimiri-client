import { mimiriPlatform } from './mimiri-platform'

const biCif = value => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
}

export class MobileLog {
	private _enabled = false
	constructor() {
		this._enabled = !!(mimiriPlatform.isIos && localStorage)
		// this._enabled = true
		if (this._enabled) {
			window.onerror = (errorMsg, url, lineNumber) => {
				this.log(`Unhandled Error: ${errorMsg} ${url} ${lineNumber}`)
			}
		}
	}

	private timeStamp() {
		const time = new Date()
		return `${biCif(time.getMonth() + 1)}.${biCif(time.getDate())} ${biCif(time.getHours())}:${biCif(
			time.getMinutes(),
		)}:${biCif(time.getSeconds())}`
	}

	log(message: string) {
		const logText = localStorage.getItem('mimiri-mobile-log') ?? '[]'
		const items = JSON.parse(logText)
		items.push(`${this.timeStamp()} ${message}`)
		while (items.length > 100) {
			items.shift()
		}
		localStorage.setItem('mimiri-mobile-log', JSON.stringify(items))
	}

	get enabled() {
		return this._enabled
	}

	get messages() {
		const logText = localStorage.getItem('mimiri-mobile-log') ?? '[]'
		const items = JSON.parse(logText)
		return items
	}
}
