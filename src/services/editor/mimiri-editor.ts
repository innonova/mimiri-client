import { editor, KeyCode, languages } from 'monaco-editor'
import type { MimerNote } from '../types/mimer-note'
import { settingsManager } from '../settings-manager'
import { reactive } from 'vue'
import { NoteHistory } from './note-history'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { mimiriPlatform } from '../mimiri-platform'
import { Debounce } from '../helpers'
import { mobileLog } from '../../global'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export interface EditorState {
	text: string
	initialText: string
	canUndo: boolean
	canRedo: boolean
	changed: boolean
	canMarkAsPassword: boolean
	canUnMarkAsPassword: boolean
}

export enum SelectionExpansion {
	LineUp,
	ExpandLeft,
	ShrinkLeft,
	ShrinkRight,
	ExpandRight,
	LineDown,
}

export class MimiriEditor {
	private backgroundEditor: editor.IStandaloneCodeEditor
	private monacoEditor: editor.IStandaloneCodeEditor
	private monacoEditorModel: editor.ITextModel
	private backgroundModel: editor.ITextModel
	private decorations: string[] = []
	private _history = new NoteHistory(this)
	private _note: MimerNote
	private styleElement: HTMLStyleElement
	private backgroundElement: HTMLDivElement
	private infoElement: HTMLDivElement
	private clipboard: any
	private styleOverridesDirty = false
	private styleUpdateRunning = false
	private skipScrollOnce = false
	private styleUpdateStartTime = Date.now()

	public state: EditorState

	private saveListener: () => void
	public onSave(listener: () => void) {
		this.saveListener = listener
	}

	private searchAllListener: () => void
	public onSearchAll(listener: () => void) {
		this.searchAllListener = listener
	}

	private blurListener: () => void
	public onBlur(listener: () => void) {
		this.blurListener = listener
	}

	constructor() {
		this.state = reactive({
			text: '',
			initialText: '',
			canUndo: false,
			canRedo: false,
			showingHistory: false,
			changed: false,
			selectedHistoryIndex: 0,
			canMarkAsPassword: false,
			canUnMarkAsPassword: false,
		})

		if (Capacitor.isPluginAvailable('MimiriClipboard')) {
			this.clipboard = registerPlugin<any>('MimiriClipboard')
		}

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
				root: [[/(p`)([^``]+)(`)/, ['directive', 'password', 'directive']]],
			},
		})

		// editor.addCommand({ id: 'copy-password', run: (_, token) => navigator.clipboard.writeText(token) })
		// editor.addCommand({
		// 	id: 'show-password',
		// 	run: (_, fn) => fn(),
		// })

		editor.defineTheme('mimiri-dark', {
			base: 'vs-dark',
			inherit: true,
			rules: [
				{ token: 'directive', foreground: '666666' },
				{ token: 'password', foreground: 'd4d4d5' },
			],
			colors: {},
		})

		editor.defineTheme('mimiri-light', {
			base: 'vs',
			inherit: true,
			rules: [
				{ token: 'directive', foreground: 'AAAAAA' },
				{ token: 'password', foreground: '000001' },
			],
			colors: {},
		})
	}

	private executeUpdateStyleOverrides() {
		if (this.styleOverridesDirty) {
			for (const span of this.backgroundEditor.getDomNode().getElementsByTagName('span')) {
				if (!span.innerHTML.includes('<') && span.innerHTML.includes('password')) {
					if (span.className !== 'mtk1') {
						mobileLog.log('Styles Updated')
						this.styleOverridesDirty = false
						this.styleElement.innerHTML = `.${span.className} { -webkit-text-security: disc; }`
					}
					break
				}
			}
		}
		if (this.styleOverridesDirty && Date.now() - this.styleUpdateStartTime < 600000) {
			this.styleUpdateRunning = true
			setTimeout(() => this.executeUpdateStyleOverrides(), 100)
		} else {
			if (this.styleOverridesDirty) {
				mobileLog.log('failed to update styles')
			}
			this.styleUpdateRunning = false
		}
	}

	private async updateStyleOverrides() {
		if (settingsManager.darkMode) {
			this.backgroundEditor.updateOptions({
				theme: 'mimiri-dark',
			})
		} else {
			this.backgroundEditor.updateOptions({
				theme: 'mimiri-light',
			})
		}
		mobileLog.log('Updating Style')
		const passwordSyntax = 'p`password`'
		this.backgroundModel.setValue(passwordSyntax)
		if (!this.styleUpdateRunning) {
			this.styleOverridesDirty = true
			this.styleUpdateStartTime = Date.now()
			this.executeUpdateStyleOverrides()
		}
	}

	private animateNotification(line: number, column: number, text: string) {
		const rect = this.monacoEditor.getDomNode().getBoundingClientRect()
		const lineTop = this.monacoEditor.getTopForLineNumber(line)
		const columnOffset = this.monacoEditor.getOffsetForColumn(line, column)
		const left = columnOffset + rect.left - this.monacoEditor.getScrollLeft()
		const top = lineTop + rect.top - this.monacoEditor.getScrollTop()
		this.infoElement.style.top = `${top - this.infoElement.offsetHeight}px`
		this.infoElement.style.left = `${left}px`
		this.infoElement.classList.add('animate-ping')
		setTimeout(() => {
			this.infoElement.style.left = '-2000px'
			this.infoElement.classList.remove('animate-ping')
		}, 900)
	}

	public init(domElement: HTMLElement) {
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

		this.infoElement = document.getElementById('mimiri-editor-info') as HTMLDivElement
		if (!this.infoElement) {
			this.infoElement = document.createElement('div')
			this.infoElement.id = 'mimiri-editor-info'
			this.infoElement.style.position = 'absolute'
			this.infoElement.style.left = '-2000px'
			this.infoElement.style.top = '0'
			this.infoElement.className = 'bg-warning p-1 rounded shadow'
			this.infoElement.innerHTML = 'copied'
			document.body.appendChild(this.infoElement)
		}

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
			// domReadOnly: true,
			// contextmenu: false,
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
		}
		this.backgroundEditor = editor.create(this.backgroundElement, config)
		this.monacoEditor = editor.create(domElement, config)

		this.monacoEditorModel = editor.createModel('', 'mimiri')
		this.backgroundModel = editor.createModel('', 'mimiri')
		this.monacoEditor.setModel(this.monacoEditorModel)
		this.backgroundEditor.setModel(this.backgroundModel)

		this.updateStyleOverrides()

		// this.monacoEditor
		// 	.addAction({
		// 		id: 'myPaste',
		// 		label: '423',
		// 		contextMenuGroupId: '9_cutcopypaste',
		// 		run: editor => {
		// 			alert('Add your custom pasting code here')
		// 		},
		// 	})
		// 	.dispose()

		this.monacoEditor.onKeyDown(e => {
			if (e.keyCode === KeyCode.KeyS && e.ctrlKey && !this.history.isShowing) {
				this.saveListener?.()
			}
			if (e.keyCode === KeyCode.KeyF && e.ctrlKey && e.shiftKey) {
				this.searchAllListener?.()
			}
		})

		this.monacoEditorModel.onDidChangeContent(event => {
			this.state.text = this.monacoEditorModel.getValue()
			this.state.canUndo = (this.monacoEditorModel as any).canUndo()
			this.state.canRedo = (this.monacoEditorModel as any).canRedo()
			this.state.changed = this.state.text !== this.state.initialText
		})

		this.monacoEditor.onDidChangeCursorSelection(e => {
			if (
				e.reason === editor.CursorChangeReason.Explicit &&
				e.selection &&
				e.selection.startLineNumber === e.selection.endLineNumber
			) {
				const line = this.monacoEditor.getModel().getLineContent(e.selection.startLineNumber)
				const selectionStart = e.selection.startColumn
				const selectionEnd = e.selection.endColumn
				if (selectionEnd - selectionStart > 0 || !mimiriPlatform.isPc) {
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
								if (!mimiriPlatform.isPc) {
									const text = line.substring(tokenStart - 1, tokenEnd - 1)
									if (this.clipboard) {
										this.clipboard.write({ text })
									} else {
										navigator.clipboard.writeText(line.substring(tokenStart - 1, tokenEnd - 1))
										if (!mimiriPlatform.isAndroid) {
											this.animateNotification(e.selection.startLineNumber, tokenEnd, 'copied')
										}
									}
								}
							}
						}
					}
				}
			}
			this.updateAbilities()
		})

		this.monacoEditor.onDidBlurEditorText(e => {
			this.blurListener?.()
		})

		const scrollDebounce = new Debounce(async () => {
			if (this.note) {
				this.note.scrollTop = this.monacoEditor.getScrollTop()
			}
		}, 250)

		this.monacoEditor.onDidScrollChange(() => {
			if (this.skipScrollOnce) {
				this.skipScrollOnce = false
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
							navigator.clipboard.writeText(line.substring(tokenStart - 1, tokenEnd - 1))
							this.animateNotification(mouseInfo.line, tokenEnd, 'copied')
						}
						break
					}
				}
			}
		})
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
		if (this.state.canMarkAsPassword !== canMarkAsPassword) {
			this.state.canMarkAsPassword = canMarkAsPassword
		}
		if (this.state.canUnMarkAsPassword !== canUnMarkAsPassword) {
			this.state.canUnMarkAsPassword = canUnMarkAsPassword
		}
	}

	public open(note: MimerNote) {
		if (this.note && this.note.id !== note?.id) {
			this.note.scrollTop = this.monacoEditor.getScrollTop()
		}
		if (this.styleOverridesDirty && !this.styleUpdateRunning) {
			this.updateStyleOverrides()
		}

		if (!note) {
			this._note = undefined
			this.history.reset()
			this.state.initialText = ''
			this.state.text = ''
			this.state.changed = false
			this.state.canUndo = false
			this.state.canRedo = false
			this.monacoEditor.updateOptions({ readOnly: true })
			return
		}
		if (note.id !== this.note?.id) {
			this._note = note
			this.history.reset()
			this.state.initialText = note.text
			this.state.text = note.text
			this.state.changed = false
			this.monacoEditorModel.setValue(note.text)
			this.skipScrollOnce = true
			this.monacoEditor.setScrollTop(this.note.scrollTop, editor.ScrollType.Immediate)
		} else {
			this.state.initialText = note.text
			this.state.text = note.text
			if (this.monacoEditorModel.getValue() !== note.text) {
				this.monacoEditorModel.setValue(note.text)
			}
		}
		this.monacoEditor.updateOptions({ readOnly: note.isCache })
	}

	public reloadNode() {
		if (this.note) {
			this.state.initialText = this.note.text
			this.state.text = this.note.text
			this.monacoEditorModel.setValue(this.note.text)
		}
	}

	public resetChanged() {
		this.state.initialText = this.state.text
		this.state.changed = false
	}

	public displayModel(model: editor.ITextModel, readOnly: boolean) {
		this.monacoEditor.setModel(model)
		this.monacoEditor.updateOptions({ readOnly })
	}

	public resetModel() {
		this.monacoEditor.setModel(this.monacoEditorModel)
		this.monacoEditor.updateOptions({ readOnly: this.note?.isCache ?? true })
	}

	public undo() {
		;(this.monacoEditorModel as any).undo()
		this.monacoEditor.focus()
	}

	public redo() {
		;(this.monacoEditorModel as any).redo()
		this.monacoEditor.focus()
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
		this.monacoEditor.getAction('actions.find').run()
	}

	public syncSettings() {
		if (settingsManager.darkMode) {
			this.monacoEditor.updateOptions({
				theme: 'mimiri-dark',
			})
		} else {
			this.monacoEditor.updateOptions({
				theme: 'mimiri-light',
			})
		}
		this.updateStyleOverrides()
		this.monacoEditor.updateOptions({ wordWrap: settingsManager.wordwrap ? 'on' : 'off' })
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

	public cut() {
		const selection = this.monacoEditor.getSelection()
		if (!selection.isEmpty()) {
			const text = this.monacoEditor.getModel().getValueInRange(selection)
			this.monacoEditor.executeEdits(undefined, [{ range: selection, text: '', forceMoveMarkers: true }])
			navigator.clipboard.writeText(text)
		}
		this.monacoEditor.focus()
	}

	public copy() {
		const selection = this.monacoEditor.getSelection()
		if (!selection.isEmpty()) {
			const text = this.monacoEditor.getModel().getValueInRange(selection)
			navigator.clipboard.writeText(text)
		}
		this.monacoEditor.focus()
	}

	public async paste() {
		const selection = this.monacoEditor.getSelection()
		const action = { range: selection, text: await navigator.clipboard.readText(), forceMoveMarkers: true }
		this.monacoEditor.executeEdits(undefined, [action])
		this.monacoEditor.focus()
	}

	public toggleSelectionAsPassword() {
		if (this.canUnMarkAsPassword) {
			this.unMarkSelectionAsPassword()
		} else if (this.canMarkAsPassword) {
			this.markSelectionAsPassword()
		}
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

	public focus() {
		this.monacoEditor.focus()
	}

	public get note() {
		return this._note
	}

	public get history() {
		return this._history
	}

	public get canMarkAsPassword() {
		return this.state.canMarkAsPassword
	}

	public get canUnMarkAsPassword() {
		return this.state.canUnMarkAsPassword
	}
}
