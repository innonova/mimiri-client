import { Debounce } from '../helpers'
import { settingsManager } from '../settings-manager'
import type { EditorState, SelectionExpansion, TextEditor, TextEditorListener } from './type'

export class EditorSimple implements TextEditor {
	private _domElement: HTMLElement | undefined
	private _element: HTMLDivElement | undefined
	private _history: HTMLDivElement | undefined
	private _initialText: string = ''
	private lastScrollTop: number
	private historyShowing: boolean = false
	private lastSelection: { startNode: Node; start: number; endNode: Node; end: number } | undefined | undefined
	private skipScrollOnce = false
	private _active = true
	private _wordWrap = true
	private _activePasswordEntry: { node: Node; start: number; end: number } | undefined
	private _state: Omit<EditorState, 'mode'> = {
		canUndo: true,
		canRedo: true,
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
		this._element.contentEditable = 'plaintext-only'

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

		this._element.addEventListener('input', () => {
			if (this._active) {
				this._state.changed = this._element.innerText.trimEnd() !== this._initialText.trimEnd()
				this.listener.onStateUpdated(this._state)
			}
		})

		document.addEventListener('selectionchange', () => {
			try {
				if (document.activeElement === this._element) {
					let canUnMarkAsPassword = false
					let canMarkAsPassword = false
					const selection = document.getSelection()
					this.lastSelection = {
						startNode: selection.anchorNode,
						start: selection.anchorOffset,
						endNode: selection.focusNode,
						end: selection.focusOffset,
					}

					if (selection.anchorNode?.textContent && selection.anchorNode === selection.focusNode) {
						const lineContent = selection.anchorNode.textContent
						const empty = selection.anchorOffset === selection.focusOffset
						const selectedRange =
							selection.anchorOffset <= selection.focusOffset
								? { start: selection.anchorOffset, end: selection.focusOffset }
								: { start: selection.focusOffset, end: selection.anchorOffset }

						canUnMarkAsPassword = !!this.findMatchingPasswordRange(lineContent, selectedRange.start, selectedRange.end)

						const selectionContent = lineContent.substring(selectedRange.start, selectedRange.end)
						canMarkAsPassword = !canUnMarkAsPassword && !selectionContent.includes('`') && !empty

						if (canMarkAsPassword || canUnMarkAsPassword) {
							this._activePasswordEntry = {
								node: selection.anchorNode,
								start: selectedRange.start,
								end: selectedRange.end,
							}
						} else {
							this._activePasswordEntry = undefined
						}
					}
					if (
						this._state.canMarkAsPassword !== canMarkAsPassword ||
						this._state.canUnMarkAsPassword !== canUnMarkAsPassword
					) {
						this._state.canMarkAsPassword = canMarkAsPassword
						this._state.canUnMarkAsPassword = canUnMarkAsPassword
						if (this._active) {
							this.listener.onStateUpdated(this._state)
						}
					}
				}
			} catch {}
		})
		this._element.addEventListener('focus', () => {
			if (this.lastSelection) {
				try {
					const range = document.createRange()
					range.setStart(this.lastSelection.startNode, this.lastSelection.start)
					range.setEnd(this.lastSelection.endNode, this.lastSelection.end)
					const selection = document.getSelection()
					selection.empty()
					selection.addRange(range)
				} catch {}
			}
		})

		const scrollDebounce = new Debounce(async () => {
			try {
				if (this._element.offsetWidth > 100 && !this.historyShowing) {
					this.lastScrollTop = Math.round(this._element.scrollTop)
					if (this._active) {
						this.listener.onScroll(this.lastScrollTop)
					}
				}
			} catch {}
		}, 250)

		this._element.addEventListener('scroll', () => {
			try {
				if (this.skipScrollOnce) {
					this.skipScrollOnce = false
					return
				}
				scrollDebounce.activate()
			} catch {}
		})
	}

	private findMatchingPasswordRange(text: string, start: number, end: number) {
		const pwRanges = this.findPasswordRanges(text)
		if (start === end) {
			return pwRanges.find(pw => pw.start < start && pw.end >= end)
		}
		return pwRanges.find(pw => pw.start <= start && pw.end + 1 >= end)
	}

	private findPasswordRanges(text: string) {
		let pwStart = -1
		const pwRanges: { start: number; end: number }[] = []
		for (let i = 1; i < text.length; i++) {
			if (text.charAt(i) === '`') {
				if (text.charAt(i - 1) === 'p') {
					pwStart = i - 1
				} else if (pwStart >= 0) {
					pwRanges.push({ start: pwStart, end: i })
					pwStart = -1
				}
			}
		}
		return pwRanges
	}

	public unMarkSelectionAsPassword() {
		try {
			if (this._activePasswordEntry) {
				const lineContent = this._activePasswordEntry.node.textContent
				const activePwRange = this.findMatchingPasswordRange(
					lineContent,
					this._activePasswordEntry.start,
					this._activePasswordEntry.end,
				)
				if (activePwRange) {
					const pre = lineContent.substring(0, activePwRange.start)
					const pw = lineContent.substring(activePwRange.start, activePwRange.end + 1)
					const post = lineContent.substring(activePwRange.end + 1, lineContent.length)
					if (pw.startsWith('p`') && pw.endsWith('`')) {
						this._activePasswordEntry.node.textContent = `${pre}${pw.substring(2, pw.length - 1)}${post}`
						this._state.canMarkAsPassword = false
						this._state.canUnMarkAsPassword = false
						if (this._active) {
							this.listener.onStateUpdated(this._state)
						}
						this.lastSelection = undefined
						const range = document.createRange()
						range.setStart(this._activePasswordEntry.node, pre.length)
						range.setEnd(
							this._activePasswordEntry.node,
							this._activePasswordEntry.node.textContent.length - post.length,
						)
						const selection = document.getSelection()
						selection.empty()
						selection.addRange(range)
					}
				}
			}
		} catch {}
	}

	public markSelectionAsPassword() {
		try {
			if (this._activePasswordEntry) {
				const lineContent = this._activePasswordEntry.node.textContent
				const pre = lineContent.substring(0, this._activePasswordEntry.start)
				const pw = lineContent.substring(this._activePasswordEntry.start, this._activePasswordEntry.end)
				const post = lineContent.substring(this._activePasswordEntry.end, lineContent.length)
				this._activePasswordEntry.node.textContent = `${pre}p\`${pw}\`${post}`
				this.lastSelection = undefined
				const range = document.createRange()
				range.setStart(this._activePasswordEntry.node, pre.length)
				range.setEnd(this._activePasswordEntry.node, this._activePasswordEntry.node.textContent.length - post.length)
				const selection = document.getSelection()
				selection.empty()
				selection.addRange(range)
			}
		} catch {}
	}

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

	public show(text: string, scrollTop: number) {
		this._state.changed = false
		this._element.innerText = text
		this._initialText = this._element.innerText
		this.lastScrollTop = scrollTop
		this._element.scrollTop = scrollTop
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public updateText(text: string) {
		this._state.changed = false
		if (this._element.innerText !== text) {
			this._element.innerText = text
			this._initialText = this._element.innerText
		}
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public resetChanged() {
		this._initialText = this._element.innerText
		this._state.changed = false
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public clear() {
		this._initialText = ''
		this._state.changed = false
		this._state.canUndo = false
		this._state.canRedo = false
		this._element.innerText = ''
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
			this._history.contentEditable = 'plaintext-only'
			this._history.focus()
			this._history.blur()
			this._history.contentEditable = 'false'
			this._history.style.display = 'none'
			this._element.style.display = 'block'
			this._state.canUndo = true
			this._state.canRedo = true
			this.listener.onStateUpdated(this._state)
			this.historyShowing = false
			this.focus()
			setTimeout(() => {
				this._element.scrollTop = scrollTop
			})
		}
	}

	public showHistory() {
		if (!this.historyShowing) {
			this._history.contentEditable = 'plaintext-only'
			this._element.style.display = 'none'
			this._history.style.display = 'block'
			this._history.focus()
			this._history.blur()
			this._history.contentEditable = 'false'
			this._state.canUndo = false
			this._state.canRedo = false
			this.listener.onStateUpdated(this._state)
			this.historyShowing = true
		}
	}

	public undo() {
		try {
			document.execCommand('undo')
		} catch {}
	}

	public redo() {
		try {
			document.execCommand('redo')
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
			if (this.historyShowing) {
				if (settingsManager.wordwrap) {
					this._history.contentEditable = 'plaintext-only'
					this._history.focus()
					this._wordWrap = true
					this._history.style.whiteSpace = 'pre-wrap'
					this._element.style.whiteSpace = 'pre-wrap'
					this._element.style.overflowX = 'hidden'
					this._history.style.overflowX = 'hidden'
					this._history.blur()
					this._history.contentEditable = 'false'
				} else {
					this._history.contentEditable = 'plaintext-only'
					this._history.focus()
					this._wordWrap = false
					this._history.style.whiteSpace = 'pre'
					this._element.style.whiteSpace = 'pre'
					this._element.style.overflowX = 'auto'
					this._history.style.overflowX = 'auto'
					this._history.blur()
					this._history.contentEditable = 'false'
				}
			} else {
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
			}
		}
	}

	public expandSelection(type: SelectionExpansion) {}
	public focus() {
		if (!this.historyShowing) {
			this._element.focus()
		}
	}

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

	public paste(text: string) {
		try {
			document.execCommand('paste')
		} catch {}
	}
	public get readonly() {
		return this._element.contentEditable === 'false'
	}

	public set readonly(value: boolean) {
		this._element.contentEditable = value ? 'false' : 'plaintext-only'
	}
	public get scrollTop(): number {
		return this._element.scrollTop
	}

	get initialText(): string {
		return this._initialText
	}

	public get text(): string {
		return this._element.innerText
	}

	public get changed(): boolean {
		return this._state.changed
	}
}
