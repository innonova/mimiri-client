import { type editor } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'

export class PasswordPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()
	}

	public getSupportedActions(): string[] {
		const selection = this.monacoEditor.getSelection()
		const actions: string[] = []

		if (selection.startLineNumber !== selection.endLineNumber) {
			return actions
		}

		const lineContent = this.monacoEditorModel.getLineContent(selection.startLineNumber)

		let canUnMarkAsPassword = false
		let canMarkAsPassword = false

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

		if (canMarkAsPassword) {
			actions.push('mark-password')
		}
		if (canUnMarkAsPassword) {
			actions.push('unmark-password')
		}

		return actions
	}

	public executeFormatAction(action: string): boolean {
		if (action === 'mark-password') {
			this.markSelectionAsPassword()
			return true
		} else if (action === 'unmark-password') {
			this.unMarkSelectionAsPassword()
			return true
		}
		return false
	}

	private markSelectionAsPassword() {
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

	private unMarkSelectionAsPassword() {
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

	show(): void {}

	updateText(): void {}

	public get active(): boolean {
		return this._active
	}

	public set active(value: boolean) {
		this._active = value
	}
}
