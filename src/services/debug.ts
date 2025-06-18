export class DebugService {
	private _divElement: HTMLTextAreaElement | undefined
	private _debugLines: string[] = []
	private _start: number = 0

	public enable() {
		if (!this._divElement) {
			this._divElement = document.createElement('textarea')
			this._divElement.id = 'debug'
			document.body.appendChild(this._divElement)
			this._divElement.style.position = 'absolute'
			this._divElement.style.top = '400px'
			this._divElement.style.left = '50px'
			this._divElement.style.height = '200px'
			this._divElement.style.overflowY = 'auto'
			this._divElement.style.zIndex = '9999'
			this._divElement.style.padding = '2px'
			this._divElement.style.backgroundColor = 'red'
			this._divElement.style.whiteSpace = 'pre'
			this._divElement.style.color = 'white'
			this._divElement.value = 'Debug Mode'
			this._start = performance.now()
		}
	}

	public log(message: string) {
		if (this._divElement) {
			this._debugLines.unshift(`${Math.round(performance.now() - this._start)}: ${message}\n`)
			if (this._debugLines.length > 10) {
				this._debugLines.pop()
			}
			this._divElement.value = this._debugLines.join('')
		}
	}
}
