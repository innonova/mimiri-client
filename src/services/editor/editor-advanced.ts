import { editor, KeyCode, languages, Selection } from 'monaco-editor'
import { SelectionExpansion, type EditorState, type TextEditor, type TextEditorListener } from './type'
import { settingsManager } from '../settings-manager'
import { mimiriPlatform } from '../mimiri-platform'
import { Debounce } from '../helpers'
import { ListPlugin } from './plugins/list-plugin'
import { HeadingPlugin } from './plugins/heading-plugin'
import { CodeBlockPlugin } from './plugins/code-block-plugin'
import { InlineMarkdownPlugin } from './plugins/inline-markdown-plugin'

export class EditorAdvanced implements TextEditor {
	// private backgroundEditor: editor.IStandaloneCodeEditor
	private monacoEditor: editor.IStandaloneCodeEditor
	private monacoEditorModel: editor.ITextModel
	// private backgroundModel: editor.ITextModel
	private monacoEditorHistoryModel: editor.ITextModel
	private decorations: string[] = []
	private styleElement: HTMLStyleElement
	private backgroundElement: HTMLDivElement
	// private styleOverridesDirty = false
	// private styleUpdateRunning = false
	// private styleUpdateStartTime = Date.now()
	private _state: Omit<EditorState, 'mode'> = {
		canUndo: false,
		canRedo: false,
		changed: false,
		canMarkAsPassword: false,
		canUnMarkAsPassword: false,
	}
	private skipScrollUntil = 0
	private historyShowing = false
	private lastScrollTop = 0
	private lastSelection: Selection | null = null
	private _text: string = ''
	private _initialText: string = ''
	private _domElement: HTMLElement | undefined
	private _active = true
	private _mouseDownPosition: { lineNumber: number; column: number } | undefined
	private _selectionHistory: Selection[] = []
	private _preClickSelection: Selection | undefined
	private _plugins: any[] = []
	private _layoutDebounce: Debounce

	constructor(private listener: TextEditorListener) {
		this.styleElement = document.getElementById('mimiri-style-overrides') as HTMLStyleElement
		if (!this.styleElement) {
			this.styleElement = document.createElement('style')
			this.styleElement.id = 'mimiri-style-overrides'
			document.getElementsByTagName('head')[0].appendChild(this.styleElement)
		}

		languages.register({
			id: 'mimiri',
		})

		languages.setMonarchTokensProvider('mimiri', {
			tokenizer: {
				root: [
					[/(p`)([^``]+)(`)/, ['directive', 'password', 'directive']],
					[/^(#{1,3}\s)(.*)/, ['head1', 'head1text']],
					// Merge conflict markers
					[/^<{7} .*$/, 'conflict-start'],
					[/^={7}$/, 'conflict-separator'],
					[/^>{7} .*$/, 'conflict-end'],
					// [/^(_)(.*)(_)/, ['italic', 'italictext', 'italic']],
					// [/^(\*\*)(.*)(\*\*)/, ['bold', 'boldtext', 'bold']],
				],
			},
		})

		editor.defineTheme('mimiri-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'directive', foreground: '666666' },
				{ token: 'password', foreground: 'd4d4d5' },
				{ token: 'checkbox', foreground: '666667' },
				{ token: 'checkmark', foreground: 'd4d4d6' },
				{ token: 'head1', foreground: '4381c1', fontStyle: 'bold' },
				{ token: 'head1text', foreground: '4381c1', fontStyle: 'bold' },
				{ token: 'italic', foreground: 'd4d4d7', fontStyle: 'italic' },
				{ token: 'italictext', foreground: 'd4d4d7', fontStyle: 'italic' },
				{ token: 'bold', foreground: 'd4d4d7', fontStyle: 'bold' },
				{ token: 'boldtext', foreground: 'd4d4d7', fontStyle: 'bold' },
				// Merge conflict styling
				{ token: 'conflict-start', foreground: 'ff6b6b', background: '4a1a1a' },
				{ token: 'conflict-separator', foreground: 'ffd93d', background: '4a3d1a' },
				{ token: 'conflict-end', foreground: '6bcf7f', background: '1a4a26' },
			],
			colors: {},
		})

		editor.defineTheme('mimiri-light', {
			base: 'vs',
			inherit: true,
			rules: [
				{ token: 'directive', foreground: 'aaaaaa' },
				{ token: 'password', foreground: '000001' },
				{ token: 'checkbox', foreground: 'aaaaab' },
				{ token: 'checkmark', foreground: '000002' },
				{ token: 'head1', foreground: '4381c1', fontStyle: 'bold' },
				{ token: 'head1text', foreground: '4381c1', fontStyle: 'bold' },
				{ token: 'italic', foreground: '000003', fontStyle: 'italic' },
				{ token: 'italictext', foreground: '000003', fontStyle: 'italic' },
				{ token: 'bold', foreground: '000003', fontStyle: 'bold' },
				{ token: 'boldtext', foreground: '000003', fontStyle: 'bold' },
				// Merge conflict styling
				{ token: 'conflict-start', foreground: 'dd0000', background: 'ffe6e6' },
				{ token: 'conflict-separator', foreground: 'b8860b', background: 'fff8dc' },
				{ token: 'conflict-end', foreground: '228b22', background: 'e6ffe6' },
			],
			colors: {},
			encodedTokensColors: [],
		})
	}

	public init(domElement: HTMLElement) {
		this._domElement = domElement
		this.backgroundElement = document.getElementById('mimiri-background-editor') as HTMLDivElement
		if (this.backgroundElement) {
			this.backgroundElement.remove()
		}
		this.backgroundElement = document.createElement('div')
		this.backgroundElement.id = 'mimiri-background-editor'
		this.backgroundElement.style.position = 'absolute'
		this.backgroundElement.style.visibility = 'hidden'
		this.backgroundElement.style.left = '-2000px'
		this.backgroundElement.style.top = '0'
		this.backgroundElement.style.width = '400px'
		this.backgroundElement.style.height = '800px'
		document.body.appendChild(this.backgroundElement)

		const config: editor.IStandaloneEditorConstructionOptions = {
			value: '',
			language: 'text',
			lineNumbers: 'off',
			glyphMargin: false,
			folding: false,
			lineDecorationsWidth: 5,
			lineNumbersMinChars: 0,
			showFoldingControls: 'never',
			automaticLayout: true,
			minimap: { enabled: false },
			readOnly: true,
			copyWithSyntaxHighlighting: false,
			occurrencesHighlight: 'off',
			selectionHighlight: false,
			matchBrackets: 'never',
			wordWrap: settingsManager.wordwrap ? 'on' : 'off',
			autoClosingBrackets: 'never',
			bracketPairColorization: {
				independentColorPoolPerBracketType: false,
				enabled: false,
			},
			tabSize: 2,
			padding: {
				top: 5,
			},
			suggest: {
				showWords: false,
			},
			renderLineHighlight: 'none',
			theme: settingsManager.darkMode ? 'mimiri-dark' : 'mimiri-light',
			fontFamily: `'${settingsManager.editorFontFamily}', 'Consolas', 'Menlo', 'Droid Sans Mono', 'monospace', 'Courier New'`,
			fontSize: settingsManager.editorFontSize,
		}
		// this.backgroundEditor = editor.create(this.backgroundElement, config)
		this.monacoEditor = editor.create(domElement, config)

		this.monacoEditorModel = editor.createModel('', 'mimiri')
		// this.backgroundModel = editor.createModel('', 'text') // Use 'text' instead of 'mimiri' to avoid triggering semantic tokens
		this.monacoEditorModel.setEOL(editor.EndOfLineSequence.LF)
		// this.backgroundModel.setEOL(editor.EndOfLineSequence.LF)

		this.monacoEditor.setModel(this.monacoEditorModel)
		// this.backgroundEditor.setModel(this.backgroundModel)

		this.monacoEditorHistoryModel = editor.createModel('', 'mimiri')

		this._plugins.push(new ListPlugin(this.monacoEditor))
		this._plugins.push(new HeadingPlugin(this.monacoEditor))
		this._plugins.push(new CodeBlockPlugin(this.monacoEditor, this.listener))
		this._plugins.push(new InlineMarkdownPlugin(this.monacoEditor))

		this.monacoEditor.onKeyDown(e => {
			if (this._active) {
				if (e.keyCode === KeyCode.KeyS && e.ctrlKey && !this.historyShowing) {
					this.listener.onSaveRequested()
				}
				if (e.keyCode === KeyCode.KeyF && e.ctrlKey && e.shiftKey) {
					this.listener.onSearchAllRequested()
				}
			}
		})

		if (mimiriPlatform.isMacApp) {
			this.monacoEditor.onKeyDown(async e => {
				if (this._active) {
					if (e.metaKey && e.keyCode === KeyCode.KeyV) {
						e.preventDefault()

						try {
							const text = await navigator.clipboard.readText()

							const pasteEvent = new ClipboardEvent('paste', {
								bubbles: true,
								cancelable: true,
								clipboardData: new DataTransfer(),
							})

							pasteEvent.clipboardData.setData('text/plain', text)
							e.target.dispatchEvent(pasteEvent)
						} catch (err) {
							console.error('Clipboard read failed:', err)
						}
					}

					if (e.metaKey && e.keyCode === KeyCode.KeyC) {
						e.preventDefault()

						const copyEvent = new ClipboardEvent('copy', {
							bubbles: true,
							cancelable: true,
							clipboardData: new DataTransfer(),
						})

						e.target.dispatchEvent(copyEvent)

						const text = copyEvent.clipboardData.getData('text/plain')

						if (text) {
							try {
								await navigator.clipboard.writeText(text)
							} catch (err) {
								console.error('Clipboard write failed:', err)
							}
						}
					}

					if (e.metaKey && e.keyCode === KeyCode.KeyX) {
						e.preventDefault()

						const copyEvent = new ClipboardEvent('cut', {
							bubbles: true,
							cancelable: true,
							clipboardData: new DataTransfer(),
						})

						e.target.dispatchEvent(copyEvent)

						const text = copyEvent.clipboardData.getData('text/plain')

						if (text) {
							try {
								await navigator.clipboard.writeText(text)
							} catch (err) {
								console.error('Clipboard write failed:', err)
							}
						}
					}
				}
			})
		}

		this.monacoEditor.onKeyUp(e => {
			if (this._active) {
			}
		})

		this._layoutDebounce = new Debounce(() => {
			if (this._active && !this.historyShowing) {
				this.monacoEditor.layout()
			}
		}, 150)

		this.monacoEditorModel.onDidChangeContent(e => {
			if (this._active) {
				this._text = this.monacoEditorModel.getValue()
				this._state.canUndo = (this.monacoEditorModel as any).canUndo()
				this._state.canRedo = (this.monacoEditorModel as any).canRedo()
				this._state.changed = this._text !== this._initialText
				this.listener.onStateUpdated(this._state)
				this._layoutDebounce.activate()
			}
		})

		this.monacoEditor.onMouseDown(e => {
			if (this._selectionHistory.length > 1) {
				this._preClickSelection = this._selectionHistory[this._selectionHistory.length - 2]
			} else {
				this._preClickSelection = undefined
			}
			if (e.target.position) {
				this._mouseDownPosition = { lineNumber: e.target.position.lineNumber, column: e.target.position.column }
			}
		})

		this.monacoEditor.onMouseUp(e => {
			if (e.target && e.target.position) {
				if (
					!this._mouseDownPosition ||
					(this._mouseDownPosition.lineNumber !== e.target.position.lineNumber &&
						this._mouseDownPosition.column !== e.target.position.column)
				) {
					return
				}
				const selection = this.monacoEditor.getSelection()
				if (selection.startColumn !== selection.endColumn) {
					return
				}
				const lineNumber = e.target.position.lineNumber
				const line = this.monacoEditor.getModel().getLineContent(lineNumber)
				const index = e.target.position.column - 1
				let start = -1
				let end = -1
				for (let s = index; s >= 0; s--) {
					if (line[s] === '[') {
						start = s
						break
					}
				}
				for (let s = index - 1; s < line.length; s++) {
					if (line[s] === ']') {
						end = s
						break
					}
				}
				const checkValue = line[start + 1]
				if (end - start === 2 && (checkValue === 'x' || checkValue === 'X' || checkValue === ' ')) {
					const action = {
						range: {
							startLineNumber: lineNumber,
							startColumn: start + 2,
							endLineNumber: lineNumber,
							endColumn: end + 1,
						},
						text: checkValue === ' ' ? 'x' : ' ',
						forceMoveMarkers: true,
					}
					this.monacoEditor.executeEdits(undefined, [action])
					if (this._preClickSelection) {
						this.monacoEditor.setSelection(this._preClickSelection)
					} else {
						this.monacoEditor.setSelection({
							startLineNumber: lineNumber,
							startColumn: start + 1,
							endLineNumber: lineNumber,
							endColumn: start + 1,
						})
					}
				}
			}
		})

		this.monacoEditor.onDidChangeCursorSelection(e => {
			this._selectionHistory.push(e.selection)
			if (this._selectionHistory.length > 10) {
				this._selectionHistory.shift()
			}
			if (
				e.reason === editor.CursorChangeReason.Explicit &&
				e.selection &&
				e.selection.startLineNumber === e.selection.endLineNumber
			) {
				const line = this.monacoEditor.getModel().getLineContent(e.selection.startLineNumber)
				const selectionStart = e.selection.startColumn
				const selectionEnd = e.selection.endColumn
				if (selectionEnd - selectionStart > 0 || !mimiriPlatform.isDesktop) {
					const tokens = editor.tokenize(line, 'mimiri')[0]
					for (let i = 0; i < tokens.length; i++) {
						const token = tokens[i]
						if (token.type === 'password.mimiri' && i + 1 < tokens.length) {
							const tokenStart = token.offset + 1
							const tokenEnd = tokens[i + 1].offset + 1
							if (tokenStart <= selectionStart && selectionEnd <= tokenEnd) {
								this.monacoEditor.setSelection(
									{
										startLineNumber: e.selection.startLineNumber,
										startColumn: tokenStart,
										endLineNumber: e.selection.startLineNumber,
										endColumn: tokenEnd,
									},
									e.source,
								)
								if (!mimiriPlatform.isDesktop) {
									if (this._active) {
										const text = line.substring(tokenStart - 1, tokenEnd - 1)
										const rect = this.monacoEditor.getDomNode().getBoundingClientRect()
										const lineTop = this.monacoEditor.getTopForLineNumber(e.selection.startLineNumber)
										const columnOffset = this.monacoEditor.getOffsetForColumn(e.selection.startLineNumber, tokenEnd)
										const left = columnOffset + rect.left - this.monacoEditor.getScrollLeft()
										const top = lineTop + rect.top - this.monacoEditor.getScrollTop()
										this.listener.onPasswordClicked(top, left, text)
									}
								}
							}
						}
					}
				}
			}
			this.updateAbilities()
		})

		this.monacoEditor.onDidBlurEditorText(() => {
			if (!this.historyShowing) {
				this.listener.onEditorBlur()
			}
		})

		const scrollDebounce = new Debounce(async () => {
			if (this.skipScrollUntil > Date.now()) {
				return
			}
			if (this.monacoEditor.getScrollWidth() > 100 && !this.historyShowing) {
				this.lastScrollTop = this.monacoEditor.getScrollTop()
				if (this._active) {
					this.listener.onScroll(this.monacoEditor.getScrollTop())
				}
			}
		}, 250)

		this.monacoEditor.onDidScrollChange(() => {
			if (this.skipScrollUntil > Date.now()) {
				return
			}
			scrollDebounce.activate()
		})

		const mouseInfo = {
			line: -1,
			column: -1,
			count: 0,
			time: Date.now(),
			rect: new DOMRect(),
		}

		this.monacoEditor.onMouseDown(e => {
			if (
				Date.now() - mouseInfo.time < 500 &&
				mouseInfo.line === e.target.position.lineNumber &&
				mouseInfo.column === e.target.position.column
			) {
				mouseInfo.count++
			} else if (e.target?.position) {
				mouseInfo.line = e.target.position.lineNumber
				mouseInfo.column = e.target.position.column
				mouseInfo.time = Date.now()
				mouseInfo.count = 1
				mouseInfo.rect = e.target.element.getBoundingClientRect()
			}
		})

		this.monacoEditor.onMouseUp(e => {
			if (
				Date.now() - mouseInfo.time < 500 &&
				e.target &&
				e.target.position &&
				mouseInfo.line === e.target.position.lineNumber &&
				mouseInfo.column === e.target.position.column &&
				mouseInfo.count == 2
			) {
				const line = this.monacoEditor.getModel().getLineContent(mouseInfo.line)
				const tokens = editor.tokenize(line, 'mimiri')[0]
				for (let i = 0; i < tokens.length; i++) {
					const token = tokens[i]
					if (token.type === 'password.mimiri' && i + 1 < tokens.length) {
						const tokenStart = token.offset + 1
						const tokenEnd = tokens[i + 1].offset + 1
						if (mouseInfo.column >= tokenStart && mouseInfo.column <= tokenEnd) {
							const text = line.substring(tokenStart - 1, tokenEnd - 1)
							const rect = this.monacoEditor.getDomNode().getBoundingClientRect()
							const lineTop = this.monacoEditor.getTopForLineNumber(mouseInfo.line)
							const columnOffset = this.monacoEditor.getOffsetForColumn(mouseInfo.line, tokenEnd)
							const left = columnOffset + rect.left - this.monacoEditor.getScrollLeft()
							const top = lineTop + rect.top - this.monacoEditor.getScrollTop()
							this.listener.onPasswordClicked(top, left, text)
						}
						break
					}
				}
			}
		})
		this._domElement.style.display = this._active ? 'block' : 'none'
	}

	private updateAbilities() {
		const selection = this.monacoEditor.getSelection()

		let canUnMarkAsPassword = false
		let canMarkAsPassword = false

		if (selection.startLineNumber === selection.endLineNumber) {
			const lineContent = this.monacoEditorModel.getLineContent(selection.startLineNumber)

			if (lineContent.includes('p`')) {
				const startIndex = selection.startColumn - 1
				const endIndex = selection.endColumn - 1
				const selectedText = lineContent.substring(startIndex, endIndex)
				if (!selectedText.includes('`')) {
					let afterPwStart = false
					for (let s = startIndex; s > 0; s--) {
						if (lineContent[s] === '`') {
							if (lineContent[s - 1] === 'p') {
								afterPwStart = true
							}
							break
						}
					}
					let beforeTagEnd = false
					for (let e = endIndex; e < lineContent.length; e++) {
						if (lineContent[e] === '`') {
							beforeTagEnd = true
							break
						}
					}
					if (afterPwStart && beforeTagEnd) {
						canUnMarkAsPassword = true
					}
				}
			}

			canMarkAsPassword =
				!canUnMarkAsPassword &&
				!lineContent.includes('`') &&
				!selection.isEmpty() &&
				selection.startColumn !== selection.endColumn
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

	public show(text: string, scrollTop: number) {
		// const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
		editor.remeasureFonts()
		this._initialText = text
		this._text = text
		this._state.changed = false
		this.monacoEditorModel.setValue(text)
		this._plugins.forEach(plugin => {
			plugin.show()
		})
		this.skipScrollUntil = Date.now() + 500
		this.lastScrollTop = scrollTop
		this.monacoEditor.setScrollTop(scrollTop, editor.ScrollType.Immediate)
		setTimeout(() => {
			this.skipScrollUntil = Date.now() + 500
			this.monacoEditor.setScrollTop(scrollTop, editor.ScrollType.Immediate)
		})
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public updateText(text: string) {
		// const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
		this._initialText = text
		this._text = text
		this._state.changed = false
		if (this.monacoEditorModel.getValue() !== text) {
			this.monacoEditorModel.setValue(text)
			this._plugins.forEach(plugin => {
				plugin.updateText()
			})
		}
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public resetChanged() {
		this._initialText = this._text
		this._state.changed = false
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public clear() {
		this._initialText = ''
		this._text = ''
		this._state.changed = false
		this._state.canUndo = false
		this._state.canRedo = false
		this.monacoEditorModel.setValue('')
		this.readonly = true
		if (this._active) {
			this.listener.onStateUpdated(this._state)
		}
	}

	public undo() {
		;(this.monacoEditorModel as any).undo()
	}

	public redo() {
		;(this.monacoEditorModel as any).redo()
	}

	public setHistoryText(text: string) {
		this.monacoEditorHistoryModel.setValue(text)
	}

	public hideHistory() {
		this.monacoEditor.setModel(this.monacoEditorModel)
		this.monacoEditor.setScrollTop(this.lastScrollTop, editor.ScrollType.Immediate)
		if (this.lastSelection) {
			this.monacoEditor.setSelection(this.lastSelection)
		}
		this.historyShowing = false
	}

	public showHistory() {
		this.lastSelection = this.monacoEditor.getSelection()
		this.historyShowing = true
		this.monacoEditor.setModel(this.monacoEditorHistoryModel)
	}

	public clearSearchHighlights() {
		if (this.decorations.length > 0) {
			this.monacoEditorModel.deltaDecorations(this.decorations, [])
			this.decorations = []
		}
	}

	public setSearchHighlights(text: string) {
		this.clearSearchHighlights()
		if (text) {
			const matches: editor.FindMatch[] = this.monacoEditorModel.findMatches(text, false, false, false, null, false)
			matches.forEach((match: editor.FindMatch): void => {
				const newDecorations = this.monacoEditorModel.deltaDecorations(
					[],
					[
						{
							range: match.range,
							options: {
								isWholeLine: false,
								inlineClassName: 'search-highlight',
							},
						},
					],
				)
				this.decorations.push(...newDecorations)
			})
		}
	}

	public find() {
		void this.monacoEditor.getAction('actions.find').run()
	}

	public focus() {
		this.monacoEditor.focus()
	}

	public toggleWordWrap() {
		settingsManager.wordwrap = !settingsManager.wordwrap
		this.syncSettings()
	}

	public syncSettings() {
		if (settingsManager.darkMode) {
			this.monacoEditor.updateOptions({
				theme: 'mimiri-dark',
				fontFamily: `'${settingsManager.editorFontFamily}', 'Consolas', 'Menlo', 'Droid Sans Mono', 'monospace', 'Courier New'`,
				fontSize: settingsManager.editorFontSize,
			})
		} else {
			this.monacoEditor.updateOptions({
				theme: 'mimiri-light',
				fontFamily: `'${settingsManager.editorFontFamily}', 'Consolas', 'Menlo', 'Droid Sans Mono', 'monospace', 'Courier New'`,
				fontSize: settingsManager.editorFontSize,
			})
		}
		this.monacoEditor.updateOptions({ wordWrap: settingsManager.wordwrap ? 'on' : 'off' })
	}

	public cut() {
		const selection = this.monacoEditor.getSelection()
		if (!selection.isEmpty()) {
			const text = this.monacoEditor.getModel().getValueInRange(selection)
			this.monacoEditor.executeEdits(undefined, [{ range: selection, text: '', forceMoveMarkers: true }])
			return text
		}
		return undefined
	}

	public copy() {
		const selection = this.monacoEditor.getSelection()
		if (!selection.isEmpty()) {
			const text = this.monacoEditor.getModel().getValueInRange(selection)
			return text
		}
		return undefined
	}

	public paste(text: string) {
		const selection = this.monacoEditor.getSelection()
		const action = { range: selection, text, forceMoveMarkers: true }
		this.monacoEditor.executeEdits(undefined, [action])
	}

	public markSelectionAsPassword() {
		const selection = this.monacoEditor.getSelection()
		const text = this.monacoEditor.getModel().getValueInRange(selection)
		const action = { range: selection, text: 'p`' + text + '`', forceMoveMarkers: true }
		this.monacoEditor.executeEdits(undefined, [action])
		this.monacoEditor.setSelection({
			startLineNumber: selection.startLineNumber,
			startColumn: selection.startColumn + 2,
			endLineNumber: selection.startLineNumber,
			endColumn: selection.endColumn + 2,
		})
		this.monacoEditor.focus()
	}

	public unMarkSelectionAsPassword() {
		const selection = this.monacoEditor.getSelection()
		const lineContent = this.monacoEditor.getModel().getLineContent(selection.startLineNumber)

		let start = -1
		let end = -1
		for (let s = selection.startColumn - 1; s > 0; s--) {
			if (lineContent[s] === '`') {
				if (lineContent[s - 1] === 'p') {
					start = s - 1
				}
				break
			}
		}
		for (let e = selection.endColumn - 1; e < lineContent.length; e++) {
			if (lineContent[e] === '`') {
				end = e + 1
				break
			}
		}
		if (start >= 0 && end >= 0) {
			this.monacoEditor.setSelection({
				startLineNumber: selection.startLineNumber,
				startColumn: start + 1,
				endLineNumber: selection.startLineNumber,
				endColumn: end + 1,
			})
			const editSelection = this.monacoEditor.getSelection()
			const text = this.monacoEditor.getModel().getValueInRange(editSelection)
			const action = { range: editSelection, text: text.substring(2, text.length - 1), forceMoveMarkers: true }
			this.monacoEditor.executeEdits(undefined, [action])
			this.monacoEditor.setSelection({
				startLineNumber: selection.startLineNumber,
				startColumn: editSelection.startColumn,
				endLineNumber: selection.startLineNumber,
				endColumn: editSelection.endColumn - 3,
			})
		}
	}

	public executeFormatAction(action: string) {
		for (const plugin of this._plugins) {
			if (plugin.executeFormatAction && plugin.executeFormatAction(action)) {
				break
			}
		}
	}

	public expandSelection(type: SelectionExpansion) {
		const selection = this.monacoEditor.getSelection()
		const newSelection = {
			startLineNumber: selection.startLineNumber,
			startColumn: selection.startColumn,
			endLineNumber: selection.endLineNumber,
			endColumn: selection.endColumn,
		}
		const model = this.monacoEditor.getModel()
		switch (type) {
			case SelectionExpansion.ExpandLeft:
				if (newSelection.startColumn > 1) {
					newSelection.startColumn--
				} else if (newSelection.startLineNumber > 1) {
					newSelection.startLineNumber--
					newSelection.startColumn = model.getLineLength(newSelection.startLineNumber)
				}
				break
			case SelectionExpansion.ShrinkLeft:
				if (newSelection.startLineNumber === newSelection.endLineNumber) {
					if (newSelection.startColumn < newSelection.endColumn) {
						newSelection.startColumn++
					}
				} else if (newSelection.startColumn < model.getLineLength(newSelection.startLineNumber)) {
					newSelection.startColumn++
				} else {
					newSelection.startLineNumber++
					newSelection.startColumn = 1
				}
				break
			case SelectionExpansion.ExpandRight:
				if (newSelection.endColumn < model.getLineLength(newSelection.endLineNumber)) {
					newSelection.endColumn++
				} else if (newSelection.endLineNumber < model.getLineCount()) {
					newSelection.endLineNumber++
					newSelection.endColumn = 1
				}
				break
			case SelectionExpansion.ShrinkRight:
				if (newSelection.startLineNumber === newSelection.endLineNumber) {
					if (newSelection.endColumn > newSelection.startColumn) {
						newSelection.endColumn--
					}
				} else if (newSelection.endColumn > 1) {
					newSelection.endColumn--
				} else {
					newSelection.endLineNumber--
					newSelection.endColumn = model.getLineLength(newSelection.endLineNumber)
				}
				break
			case SelectionExpansion.LineUp:
				if (newSelection.startLineNumber > 1) {
					newSelection.startLineNumber--
					newSelection.startColumn = model.getLineLength(newSelection.startLineNumber)
				} else {
					newSelection.startColumn = 1
				}
				break
			case SelectionExpansion.LineDown:
				if (newSelection.endLineNumber < this.monacoEditor.getModel().getLineCount()) {
					newSelection.endLineNumber++
					newSelection.endColumn = 1
				} else {
					newSelection.endColumn = this.monacoEditor.getModel().getLineLength(newSelection.endLineNumber)
				}
				break
		}
		this.monacoEditor.setSelection(newSelection)
		this.monacoEditor.focus()
	}

	public selectAll() {
		this.monacoEditor.setSelection(this.monacoEditor.getModel().getFullModelRange())
		this.monacoEditor.focus()
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
			this._plugins.forEach(plugin => {
				plugin.active = this._active
			})
		}
	}

	public get readonly() {
		return this.monacoEditor.getOption(editor.EditorOption.readOnly)
	}

	public set readonly(value: boolean) {
		this.monacoEditor.updateOptions({ readOnly: value })
	}

	public get scrollTop() {
		return this.monacoEditor.getScrollTop()
	}

	get initialText(): string {
		return this._initialText
	}

	public get text() {
		return this._text
	}

	public get changed() {
		return this._state.changed
	}
}
