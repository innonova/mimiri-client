export class Debounce {
	private lastActivate = 0
	private interval

	constructor(
		private action: () => void,
		private delay: number,
	) {}

	private check() {
		if (Date.now() - this.lastActivate > this.delay) {
			clearInterval(this.interval)
			this.interval = undefined
			this.action()
		}
	}

	activate() {
		this.lastActivate = Date.now()
		if (!this.interval) {
			this.interval = setInterval(() => this.check(), 100)
		}
	}
}
