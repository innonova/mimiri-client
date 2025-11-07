import { se } from 'date-fns/locale'
import { KeyCode, type editor } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'

export class HeadingPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()
	}

	public executeFormatAction(action: string): boolean {
		if (action === 'insert-heading') {
			const selection = this.monacoEditor.getSelection()
			const lineContent = this.monacoEditorModel.getLineContent(selection.startLineNumber)

			let newText = ''
			if (!lineContent.startsWith('#')) {
				newText = '# '
			} else if (!lineContent.startsWith('###')) {
				newText = '#'
			}
			if (newText) {
				this.monacoEditor.executeEdits(undefined, [
					{
						range: {
							startLineNumber: selection.startLineNumber,
							startColumn: 1,
							endLineNumber: selection.startLineNumber,
							endColumn: 1,
						},
						text: newText,
					},
				])
			}
			return true
		}
		return false
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
