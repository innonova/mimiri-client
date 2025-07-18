import { isValidGuid, type Guid } from './types/guid'

export class BrowserHistory {
	private callback: (noteId?: Guid) => void
	private currentHash = ''
	private isElectron = false

	constructor() {}

	init(callback) {
		this.callback = callback
		window.addEventListener(
			'hashchange',
			() => {
				const hash = window.location.hash.substring(1)
				// console.log('got history', hash, this.currentHash)
				if (hash !== this.currentHash) {
					this.currentHash = hash
					if (isValidGuid(hash)) {
						this.callback(hash)
					} else {
						this.callback()
					}
				}
			},
			false,
		)
	}

	open(noteId: Guid) {
		const hash = window.location.hash.substring(1)
		if (hash !== noteId) {
			// console.log('set history', noteId)
			this.currentHash = noteId
			if (this.isElectron && hash.length === 0) {
				window.location.replace(`#${this.currentHash}`)
			} else {
				window.location.hash = this.currentHash
			}
		}
	}

	openTree(isElectron: boolean) {
		this.isElectron = isElectron
		const hash = window.location.hash.substring(1)
		// console.log('set history', 'tree')
		if (hash !== '') {
			this.currentHash = ''
			window.location.hash = this.currentHash
		}
	}

	back() {
		window.history.back()
	}
}
