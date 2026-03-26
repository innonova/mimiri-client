import type { editor } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'
import type { TextEditorListener } from '../type'
import type { InlineMarkdownPlugin } from './inline-markdown-plugin'
import { clipboardManager } from '../../../global'
import { COPY_SVG, EYE_SVG, EYE_OFF_SVG } from '../prosemirror/prosemirror-icons'

interface PasswordRange {
	lineNumber: number
	startColumn: number // 1-based column of 'p'
	endColumn: number // 1-based column just after closing backtick
	text: string // password text (without delimiters)
}

export class PasswordButtonsPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private widgetEl: HTMLElement | null = null
	private viewBtn: HTMLButtonElement | null = null
	private currentPw: PasswordRange | null = null
	private currentKey: string | null = null
	private hideTimer: number | null = null
	private scrollDisposable: { dispose(): void } | null = null
	private cursorDisposable: { dispose(): void } | null = null
	private caretInPassword: boolean = false
	readonly visiblePasswords: Set<string> = new Set()

	constructor(
		private monacoEditor: editor.IStandaloneCodeEditor,
		private listener: TextEditorListener,
		private inlinePlugin: InlineMarkdownPlugin,
	) {
		this.monacoEditorModel = this.monacoEditor.getModel()

		this.monacoEditor.getDomNode()?.addEventListener('mousemove', (e: MouseEvent) => {
			if (!this._active) return
			const target = e.target as HTMLElement
			const isOnPassword =
				target.classList.contains('password-content') ||
				target.classList.contains('password-content-visible') ||
				target.classList.contains('password-delimiter')

			if (!isOnPassword) {
			// Mouse moved off password area — schedule hide (unless caret is still inside)
			if (this.currentKey && !this.caretInPassword) this.scheduleHide()
			}

			const hit = this.monacoEditor.getTargetAtClientPoint(e.clientX, e.clientY)
			if (!hit?.position) return

			const { lineNumber, column } = hit.position
			const line = this.monacoEditorModel.getLineContent(lineNumber)
			const pw = this.findPasswordAtColumn(line, lineNumber, column)
			if (!pw) return

			const key = `${pw.lineNumber}:${pw.startColumn}`
			if (key !== this.currentKey) {
				this.clearHideTimer()
				this.showWidget(pw)
			} else {
				// Still hovering the same password — cancel any pending hide
				this.clearHideTimer()
			}
		})

		this.scrollDisposable = this.monacoEditor.onDidScrollChange(() => {
			this.positionWidget()
		})

		this.cursorDisposable = this.monacoEditor.onDidChangeCursorPosition(e => {
			if (!this._active) return
			const { lineNumber, column } = e.position
			const line = this.monacoEditorModel.getLineContent(lineNumber)
			const pw = this.findPasswordAtColumn(line, lineNumber, column)
			if (pw) {
				const key = `${pw.lineNumber}:${pw.startColumn}`
				this.caretInPassword = true
				if (key !== this.currentKey) {
					this.clearHideTimer()
					this.showWidget(pw)
				} else {
					this.clearHideTimer()
				}
			} else {
				this.caretInPassword = false
			}
		})
	}

	private findPasswordAtColumn(line: string, lineNumber: number, column: number): PasswordRange | null {
		const regex = /p`([^`]+)`/g
		let match: RegExpExecArray | null
		while ((match = regex.exec(line)) !== null) {
			const startCol = match.index + 1
			const endCol = startCol + match[0].length
			if (column >= startCol && column < endCol) {
				return { lineNumber, startColumn: startCol, endColumn: endCol, text: match[1] }
			}
		}
		return null
	}

	private showWidget(pw: PasswordRange) {
		this.hideWidget()

		const key = `${pw.lineNumber}:${pw.startColumn}`
		const isVisible = this.visiblePasswords.has(key)

		const el = document.createElement('div')
		el.className = 'monaco-password-buttons'
		el.style.position = 'fixed'
		el.style.zIndex = '9999'
		el.addEventListener('mouseenter', () => this.clearHideTimer())
		el.addEventListener('mouseleave', () => this.scheduleHide())

		const copyBtn = document.createElement('button')
		copyBtn.className = 'monaco-password-btn'
		copyBtn.title = 'Copy'
		copyBtn.innerHTML = COPY_SVG
		copyBtn.addEventListener('mousedown', e => {
			e.preventDefault()
			e.stopPropagation()
			clipboardManager.write(pw.text)
			const btnRect = copyBtn.getBoundingClientRect()
			const editorRect = this.monacoEditor.getDomNode().getBoundingClientRect()
			this.listener.onCopyNotification(btnRect.top + btnRect.height, Math.max(editorRect.left, btnRect.left - 80))
		})

		this.viewBtn = document.createElement('button')
		this.viewBtn.className = 'monaco-password-btn'
		this.viewBtn.innerHTML = isVisible ? EYE_OFF_SVG : EYE_SVG
		this.viewBtn.title = isVisible ? 'Hide' : 'Show'
		this.viewBtn.addEventListener('mousedown', e => {
			e.preventDefault()
			e.stopPropagation()
			const nowVisible = !this.visiblePasswords.has(key)
			if (nowVisible) {
				this.visiblePasswords.add(key)
			} else {
				this.visiblePasswords.delete(key)
			}
			this.inlinePlugin.refreshLine(pw.lineNumber)
			if (this.viewBtn) {
				this.viewBtn.innerHTML = nowVisible ? EYE_OFF_SVG : EYE_SVG
				this.viewBtn.title = nowVisible ? 'Hide' : 'Show'
			}
		})

		el.append(copyBtn, this.viewBtn)
		document.body.appendChild(el)
		this.widgetEl = el
		this.currentPw = pw
		this.currentKey = key

		// Position after first render so offsetWidth/offsetHeight are available
		requestAnimationFrame(() => this.positionWidget())
	}

	private positionWidget() {
		if (!this.widgetEl || !this.currentPw) return

		const pos = this.monacoEditor.getScrolledVisiblePosition({
			lineNumber: this.currentPw.lineNumber,
			column: this.currentPw.endColumn,
		})

		if (!pos) {
			this.widgetEl.style.visibility = 'hidden'
			return
		}

		const editorRect = this.monacoEditor.getDomNode().getBoundingClientRect()
		const widgetWidth = this.widgetEl.offsetWidth
		const widgetHeight = this.widgetEl.offsetHeight

		// pos.top is top of the line relative to the editor — convert to viewport coords
		const top = editorRect.top + pos.top - widgetHeight + 2
		// right-align widget to the end of the password, clamped to editor left edge
		const left = Math.max(editorRect.left, editorRect.left + pos.left - widgetWidth)

		this.widgetEl.style.visibility = 'visible'
		this.widgetEl.style.top = `${top}px`
		this.widgetEl.style.left = `${left}px`
	}

	private hideWidget() {
		if (this.widgetEl) {
			this.widgetEl.remove()
			this.widgetEl = null
			this.viewBtn = null
		}
		this.currentKey = null
		this.currentPw = null
	}

	private scheduleHide() {
		this.clearHideTimer()
		this.hideTimer = window.setTimeout(() => this.hideWidget(), 300)
	}

	private clearHideTimer() {
		if (this.hideTimer !== null) {
			clearTimeout(this.hideTimer)
			this.hideTimer = null
		}
	}

	show(): void {}
	updateText(): void {}
	getSupportedActions(): string[] {
		return []
	}
	executeFormatAction(): boolean {
		return false
	}

	get active(): boolean {
		return this._active
	}
	set active(value: boolean) {
		if (this._active !== value) {
			this._active = value
			if (!this._active) this.hideWidget()
		}
	}

	dispose(): void {
		this.hideWidget()
		this.scrollDisposable?.dispose()
		this.cursorDisposable?.dispose()
	}
}
