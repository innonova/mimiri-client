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

		this._history = document.createElement('div')
		this._history.style.display = 'none'
		this._domElement.appendChild(this._history)
		this._history.classList.add('simple-editor')

		if (settingsManager.wordwrap) {
			this._element.classList.add('simple-editor-wrap')
			this._history.classList.add('simple-editor-wrap')
		} else {
			this._element.classList.add('simple-editor-no-wrap')
			this._history.classList.add('simple-editor-no-wrap')
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
		})

		this._element.addEventListener('dblclick', event => {
			if (mimiriPlatform.isDesktop) {
				const elm = this.getPasswordElement(event)
				if (elm) {
					const rect = elm.getBoundingClientRect()
					this.listener.onPasswordClicked(rect.top, rect.right, elm.textContent)
				}
			}
		})
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
		return text.replace(
			/p`([^`]+)`/g,
			'<span class="password-secret">p`<span class="password-secret-content">$1</span></span>`',
		)
	}

	public show(text: string, scrollTop: number) {
		this._state.changed = false
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
		this._history.innerText = text
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
		document.execCommand('undo')
	}

	public redo() {
		document.execCommand('redo')
	}

	public clearSearchHighlights() {}
	public setSearchHighlights(text: string) {}
	public find() {}

	public syncSettings() {
		if (settingsManager.wordwrap) {
			this._element.classList.remove('simple-editor-no-wrap')
			this._history.classList.remove('simple-editor-no-wrap')
			this._element.classList.add('simple-editor-wrap')
			this._history.classList.add('simple-editor-wrap')
		} else {
			this._element.classList.remove('simple-editor-wrap')
			this._history.classList.remove('simple-editor-wrap')
			this._element.classList.add('simple-editor-no-wrap')
			this._history.classList.add('simple-editor-no-wrap')
		}
	}

	public expandSelection(type: SelectionExpansion) {}
	public focus() {
		if (this.historyShowing) {
			this._history.focus()
		} else {
			this._element.focus()
		}
	}

	public selectAll() {
		document.getSelection().selectAllChildren(this._element)
	}

	public cut() {
		document.execCommand('cut')
	}

	public copy() {
		document.execCommand('copy')
	}

	public paste(text: string) {}

	public get readonly() {
		return true
	}

	public set readonly(value: boolean) {}
	public get scrollTop(): number {
		return this._element.scrollTop
	}

	public get text(): any {
		throw new Error('attempt to save from display mode')
	}
}
