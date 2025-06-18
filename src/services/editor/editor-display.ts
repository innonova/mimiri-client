import { Debounce } from '../helpers'
import { mimiriPlatform } from '../mimiri-platform'
import { settingsManager } from '../settings-manager'
import type { EditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'

export class EditorDisplay implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _element: HTMLDivElement | undefined
	private _history: HTMLDivElement | undefined
	private lastScrollTop: number
	private historyShowing: boolean = false
	private skipScrollOnce = false
	private _active = true
	private _wordWrap = true
	private _crlf = false
	private _initialText: string = ''
	private _redoText: string = ''
	private _test: any
	private _state: Omit<EditorState, 'mode'> = {
		canUndo: false,
		canRedo: false,
		changed: false,
		canMarkAsPassword: false,
		canUnMarkAsPassword: false,
	}

	constructor(private listener: TextEditorListener) {}

	public init(domElement: HTMLElement) {
		this._domElement = domElement

		this._domElement.style.display = this._active ? 'block' : 'none'

		this._element = document.createElement('div')
		this._domElement.appendChild(this._element)
		this._element.classList.add('simple-editor')
		this._element.contentEditable = 'false'

		this._history = document.createElement('div')
		this._history.style.display = 'none'
		this._domElement.appendChild(this._history)
		this._history.classList.add('simple-editor')

		if (settingsManager.wordwrap) {
			this._wordWrap = true
			this._element.style.whiteSpace = 'pre-wrap'
			this._history.style.whiteSpace = 'pre-wrap'
			this._element.style.overflowX = 'hidden'
			this._history.style.overflowX = 'hidden'
		} else {
			this._wordWrap = false
			this._element.style.whiteSpace = 'pre'
			this._history.style.whiteSpace = 'pre'
			this._element.style.overflowX = 'auto'
			this._history.style.overflowX = 'auto'
		}

		const scrollDebounce = new Debounce(async () => {
			if (this._element.offsetWidth > 100 && !this.historyShowing) {
				this.lastScrollTop = Math.round(this._element.scrollTop)
				if (this._active) {
					this.listener.onScroll(this.lastScrollTop)
				}
			}
		}, 250)

		this._element.addEventListener('scroll', () => {
			if (this.skipScrollOnce) {
				this.skipScrollOnce = false
				return
			}
			scrollDebounce.activate()
		})

		this._element.addEventListener('click', event => {
			if (!mimiriPlatform.isDesktop) {
				const elm = this.getPasswordElement(event)
				if (elm) {
					const rect = elm.getBoundingClientRect()
					this.listener.onPasswordClicked(rect.top, rect.right, elm.textContent)
				}
			}
			const checkbox = this.getCheckboxElement(event)
			if (checkbox) {
				if (checkbox.textContent === ' ') {
					checkbox.textContent = 'x'
				} else {
					checkbox.textContent = ' '
				}
				this.updateState()
			}
		})

		if (mimiriPlatform.isDesktop) {
			this._element.addEventListener('dblclick', event => {
				const elm = this.getPasswordElement(event)
				if (elm) {
					const rect = elm.getBoundingClientRect()
					this.listener.onPasswordClicked(rect.top, rect.right, elm.textContent)
				}
			})
		}
	}

	private updateState() {
		let newText = this._element.textContent.trim()
		if (this._crlf) {
			newText = newText.replace(/\n/g, '\r\n')
		} else {
			newText = newText.replace(/\r\n/g, '\n')
		}
		this._state.changed = newText !== this._initialText.trimEnd()
		this._state.canUndo = this._state.changed
		this._state.canRedo = this._redoText !== undefined
		this.listener.onStateUpdated(this._state)
	}

	private getPasswordElement(event: MouseEvent) {
		const elm = event.target as HTMLElement
		if (elm.className === 'password-secret') {
			return elm.children[0] as HTMLElement
		}
		if (elm.className === 'password-secret-content') {
			return elm
		}
		return undefined
	}

	private getCheckboxElement(event: MouseEvent) {
		const elm = event.target as HTMLElement
		if (elm.className === 'clickable-checkbox') {
			return elm.children[0] as HTMLElement
		}
		if (elm.className === 'clickable-checkbox-content') {
			return elm
		}
		return undefined
	}

	public unMarkSelectionAsPassword() {}
	public markSelectionAsPassword() {}

	public get active(): boolean {
		return this._active
	}

	public set active(value: boolean) {
		if (this._active !== value) {
			this._active = value
			if (this._domElement) {
				this._domElement.style.display = this._active ? 'block' : 'none'
			}
			if (this._active) {
				this.listener.onStateUpdated(this._state)
			}
		}
	}

	private formatText(text: string) {
		return text
			.replace(/p`([^`]+)`/g, '<span class="password-secret">p`<span class="password-secret-content">$1</span></span>`')
			.replace(
				/\[( |X|x)\]/g,
				'<span class="clickable-checkbox">[<span class="clickable-checkbox-content">$1</span>]</span>',
			)
	}

	public show(text: string, scrollTop: number) {
		this._state.changed = false
		this._state.canUndo = false
		this._state.canRedo = false
		this._redoText = undefined
		this._initialText = text
		this._crlf = this._initialText.includes('\r\n')
		this._element.innerHTML = this.formatText(text)
		this.lastScrollTop = scrollTop
		this._element.scrollTop = scrollTop
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public updateText(text: string) {
		this._state.changed = false
		this._element.innerHTML = this.formatText(text)
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public resetChanged() {
		this._initialText = this._element.textContent
		this.updateState()
		this._state.changed = false
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public clear() {
		this._state.changed = false
		this._state.canUndo = false
		this._state.canRedo = false
		this._element.innerHTML = ''
		this.readonly = true
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public setHistoryText(text: string) {
		this._history.innerHTML = this.formatText(text)
	}

	public hideHistory() {
		if (this.historyShowing) {
			const scrollTop = this.lastScrollTop
			this._element.style.display = 'block'
			this._history.style.display = 'none'
			this.historyShowing = false
			this.focus()
			setTimeout(() => {
				this._element.scrollTop = scrollTop
			})
		}
	}

	public showHistory() {
		if (!this.historyShowing) {
			this._element.style.display = 'none'
			this._history.style.display = 'block'
			this.historyShowing = true
		}
	}

	public undo() {
		try {
			this._redoText = this._element.textContent
			this._element.innerHTML = this.formatText(this._initialText)
			this.updateState()
		} catch {}
	}

	public redo() {
		try {
			if (this._redoText) {
				this._element.innerHTML = this.formatText(this._redoText)
				this._redoText = undefined
				this.updateState()
			}
		} catch {}
	}

	public clearSearchHighlights() {}
	public setSearchHighlights(text: string) {}
	public find() {}

	public toggleWordWrap() {
		settingsManager.wordwrap = !settingsManager.wordwrap
		this.syncSettings()
	}

	public syncSettings() {
		if (this._wordWrap !== settingsManager.wordwrap) {
			const elm = this.historyShowing ? this._history : this._element
			if (settingsManager.wordwrap) {
				this._element.style.whiteSpace = 'pre-wrap'
				this._history.style.whiteSpace = 'pre-wrap'
				this._element.style.overflowX = 'hidden'
				this._history.style.overflowX = 'hidden'
				this._wordWrap = true
			} else {
				this._history.style.whiteSpace = 'pre'
				this._element.style.whiteSpace = 'pre'
				this._element.style.overflowX = 'auto'
				this._history.style.overflowX = 'auto'
				this._wordWrap = false
			}
		}
	}

	public expandSelection(type: SelectionExpansion) {}

	public focus() {}

	public selectAll() {
		document.getSelection().selectAllChildren(this._element)
	}

	public cut() {
		try {
			document.execCommand('cut')
		} catch {}
	}

	public copy() {
		try {
			document.execCommand('copy')
		} catch {}
	}

	public paste(text: string) {}

	public get readonly() {
		return true
	}

	public set readonly(value: boolean) {}
	public get scrollTop(): number {
		return this._element.scrollTop
	}

	get initialText(): string {
		return this._initialText
	}

	public get text(): string {
		if (this._state.changed) {
			return this._element.textContent
		} else {
			return this._initialText
		}
	}

	public get changed() {
		return false
	}
}
