export class Utils {
	static isMobile() {
		return window.innerWidth <= 700
	}

	static hasTouch() {
		try {
			document.createEvent('TouchEvent')
			return true
		} catch {
			return false
		}
	}
}
