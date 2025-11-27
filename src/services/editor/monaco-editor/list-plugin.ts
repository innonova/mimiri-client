import { KeyCode, type editor } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'

const checkBoxListRegex = /^(?<indent>(\s*))(?<checkbox>(?<bullet>[-\*]\s)?\[(?:x| )\])(?<space>\s)/
const numberedListRegex = /^(?<indent>\s*)(?<number>\d+)(?<delimiter>[.)])(?<space>\s)/
const listItemRegex = /^(?<indent>\s*)(?<symbol>[^\w\s])(?<space>\s)/
const indentRegex = /^(?<indent>\s*)(?<content>.*)/

export class ListPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private skipNextEnterUp: boolean = false

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()
		this.monacoEditor.onKeyUp(e => {
			if (this._active) {
				if (e.keyCode === KeyCode.Enter) {
					if (this.skipNextEnterUp) {
						this.skipNextEnterUp = false
						return
					}
					const selection = this.monacoEditor.getSelection()
					if (selection.startLineNumber === selection.endLineNumber) {
						const currentLine = selection.startLineNumber
						const prevLine = currentLine - 1
						const prevLineContent = this.monacoEditorModel.getLineContent(prevLine)

						const currentLineContent = this.monacoEditorModel.getLineContent(currentLine)

						const checkboxMatch = checkBoxListRegex.exec(prevLineContent)
						const numberedListMatch = numberedListRegex.exec(prevLineContent)
						const listItemMatch = listItemRegex.exec(prevLineContent)

						let newContent = ''
						let deletePrevLine = false
						let renumber = false
						if (checkboxMatch) {
							if (checkboxMatch[0] === prevLineContent) {
								deletePrevLine = true
							} else {
								newContent = `${checkboxMatch.groups.indent}${checkboxMatch.groups.bullet}[ ] ${currentLineContent}`
							}
						} else if (numberedListMatch) {
							if (numberedListMatch[0] === prevLineContent) {
								deletePrevLine = true
							} else {
								const itemNumber = parseInt(numberedListMatch.groups.number)
								const newLineNumber = itemNumber + 1
								newContent = `${numberedListMatch.groups.indent}${newLineNumber}${numberedListMatch.groups.delimiter} ${currentLineContent}`
								const nextLineContent = this.monacoEditorModel.getLineContent(currentLine + 1)
								renumber = !!numberedListRegex.exec(nextLineContent)
							}
						} else if (listItemMatch) {
							if (listItemMatch[0] === prevLineContent) {
								deletePrevLine = true
							} else {
								newContent = `${listItemMatch[0]}${currentLineContent}`
							}
						}

						if (deletePrevLine) {
							const action = {
								range: {
									startLineNumber: prevLine,
									startColumn: 1,
									endLineNumber: prevLine,
									endColumn: this.monacoEditorModel.getLineMaxColumn(prevLine),
								},
								text: '',
							}
							this.monacoEditor.executeEdits(undefined, [action])
						} else if (newContent) {
							const action = {
								range: {
									startLineNumber: currentLine,
									startColumn: 1,
									endLineNumber: currentLine,
									endColumn: this.monacoEditorModel.getLineContent(currentLine).length + 1,
								},
								text: newContent,
							}
							this.monacoEditor.executeEdits(undefined, [action])
							if (renumber) {
								this.renumberListFromLine(currentLine)
							}
						}
					}
				}
			}
		})
		this.monacoEditor.onKeyDown(e => {
			if (this._active) {
				if (e.keyCode === KeyCode.Tab) {
					const selection = this.monacoEditor.getSelection()
					if (selection.isEmpty()) {
						const currentLine = selection.startLineNumber
						const lineContent = this.monacoEditorModel.getLineContent(currentLine)
						const checkboxMatch = checkBoxListRegex.exec(lineContent)
						const numberedListMatch = numberedListRegex.exec(lineContent)
						const listItemMatch = listItemRegex.exec(lineContent)
						if (checkboxMatch || numberedListMatch || listItemMatch) {
							if (e.shiftKey) {
								void this.monacoEditor.getAction('editor.action.outdentLines').run()
							} else {
								void this.monacoEditor.getAction('editor.action.indentLines').run()
							}
							e.stopPropagation()
							e.preventDefault()
							this.renumberListFromLine(currentLine)
						}
					}
				}

				if (e.keyCode === KeyCode.Enter) {
					const selection = this.monacoEditor.getSelection()
					const currentLine = selection.startLineNumber
					const lineContent = this.monacoEditorModel.getLineContent(currentLine)

					const checkboxMatch = checkBoxListRegex.exec(lineContent)
					const numberedListMatch = numberedListRegex.exec(lineContent)
					const listItemMatch = listItemRegex.exec(lineContent)
					let leaveList = false
					if (checkboxMatch) {
						if (checkboxMatch[0] === lineContent) {
							leaveList = true
						}
					} else if (numberedListMatch) {
						if (numberedListMatch[0] === lineContent) {
							leaveList = true
						}
					} else if (listItemMatch) {
						if (listItemMatch[0] === lineContent) {
							leaveList = true
						}
					}
					if (leaveList) {
						this.skipNextEnterUp = true
						e.stopPropagation()
						e.preventDefault()
						const action = {
							range: {
								startLineNumber: currentLine,
								startColumn: 1,
								endLineNumber: currentLine,
								endColumn: this.monacoEditorModel.getLineMaxColumn(currentLine),
							},
							text: '',
						}
						this.monacoEditor.executeEdits(undefined, [action])
					}
				}
			}
		})

		this.monacoEditorModel.onDidChangeContent(e => {
			if (this._active) {
				if (e.changes.length > 0 && !e.isUndoing && !e.isRedoing) {
					const change = e.changes[0]
					if (change.text === '' && change.range.startLineNumber !== change.range.endLineNumber) {
						const lineCount = this.monacoEditorModel.getLineCount()
						const nextLine = change.range.startLineNumber
						if (lineCount < nextLine) {
							return
						}
						const nextLineContent = this.monacoEditorModel.getLineContent(nextLine)

						if (numberedListRegex.exec(nextLineContent)) {
							this.renumberListFromLine(nextLine)
						}
					}
				}
			}
		})
	}

	private renumberListFromLine(startLine: number) {
		const lineCount = this.monacoEditorModel.getLineCount()
		let currentLine = startLine
		while (currentLine >= 1) {
			const lineContent = this.monacoEditorModel.getLineContent(currentLine)
			const match = numberedListRegex.exec(lineContent)
			if (match) {
				currentLine--
			} else {
				currentLine++
				break
			}
		}

		const indentLevelState: Map<number, number> = new Map()
		const indentLevels: number[] = []
		const edits = []

		let previousIndentLength = -1

		while (currentLine <= lineCount) {
			const lineContent = this.monacoEditorModel.getLineContent(currentLine)
			const match = numberedListRegex.exec(lineContent)
			if (match) {
				const indentLength = match.groups.indent.length

				if (previousIndentLength !== -1 && indentLength <= previousIndentLength) {
					const keysToDelete = []
					for (const [key] of indentLevelState) {
						if (key > indentLength) {
							keysToDelete.push(key)
						}
					}
					keysToDelete.forEach(key => {
						indentLevelState.delete(key)
						const index = indentLevels.indexOf(key)
						if (index > -1) {
							indentLevels.splice(index, 1)
						}
					})
				}

				previousIndentLength = indentLength

				if (!indentLevelState.has(indentLength)) {
					indentLevelState.set(indentLength, 1)
					indentLevels.push(indentLength)
				}

				const counter = indentLevelState.get(indentLength)
				const expectedNumber = `${counter}`

				if (match.groups.number !== expectedNumber) {
					const newLineContent = lineContent.replace(
						`${match.groups.number}${match.groups.delimiter}`,
						`${expectedNumber}${match.groups.delimiter}`,
					)
					const action = {
						range: {
							startLineNumber: currentLine,
							startColumn: 1,
							endLineNumber: currentLine,
							endColumn: lineContent.length + 1,
						},
						text: newLineContent,
					}
					edits.push(action)
				}

				indentLevelState.set(indentLength, counter + 1)
				currentLine++
			} else {
				break
			}
		}
		if (edits.length > 0) {
			this.monacoEditor.executeEdits(undefined, edits)
		}
	}

	public executeFormatAction(action: string): boolean {
		if (action === 'insert-checkbox-list' || action === 'insert-unordered-list' || action === 'insert-ordered-list') {
			const selection = this.monacoEditor.getSelection()
			let expandedSelection = {
				...selection,
				startColumn: 1,
				endColumn: this.monacoEditorModel.getLineMaxColumn(selection.endLineNumber),
			}
			let newText = ''
			if (selection.isEmpty()) {
				expandedSelection = {
					...selection,
					startColumn: 1,
					endColumn: 1,
				}
				if (action === 'insert-checkbox-list') {
					newText = '[ ] '
				} else if (action === 'insert-unordered-list') {
					newText = '- '
				} else if (action === 'insert-ordered-list') {
					newText = '1. '
				}
			} else {
				const text = this.monacoEditor.getModel().getValueInRange(expandedSelection)
				if (action === 'insert-checkbox-list') {
					newText = text
						.replace(/\r/g, '')
						.split('\n')
						.map(line => {
							const checkboxMatch = checkBoxListRegex.exec(line)
							const numberedListMatch = numberedListRegex.exec(line)
							const listItemMatch = listItemRegex.exec(line)
							if (checkboxMatch) {
								return line
							} else if (numberedListMatch) {
								return line.replace(
									`${numberedListMatch.groups.number}${numberedListMatch.groups.delimiter}${numberedListMatch.groups.space}`,
									'- [ ] ',
								)
							} else if (listItemMatch) {
								return line.replace(`${listItemMatch.groups.symbol}${listItemMatch.groups.space}`, '- [ ] ')
							}
							return line.replace(indentRegex, (match, indent, content) => `${indent}- [ ] ${content}`)
						})
						.join('\n')
				} else if (action === 'insert-unordered-list') {
					newText = text
						.replace(/\r/g, '')
						.split('\n')
						.map(line => {
							const checkboxMatch = checkBoxListRegex.exec(line)
							const numberedListMatch = numberedListRegex.exec(line)
							const listItemMatch = listItemRegex.exec(line)
							if (checkboxMatch) {
								return line.replace(`${checkboxMatch.groups.checkbox}${checkboxMatch.groups.space}`, '- ')
							} else if (numberedListMatch) {
								return line.replace(
									`${numberedListMatch.groups.number}${numberedListMatch.groups.delimiter}${numberedListMatch.groups.space}`,
									'- ',
								)
							} else if (listItemMatch) {
								return line.replace(`${listItemMatch.groups.symbol}${listItemMatch.groups.space}`, '- ')
							}
							return line.replace(indentRegex, (match, indent, content) => `${indent}- ${content}`)
						})
						.join('\n')
				} else if (action === 'insert-ordered-list') {
					newText = text
						.replace(/\r/g, '')
						.split('\n')
						.map((line, index) => {
							const checkboxMatch = checkBoxListRegex.exec(line)
							const numberedListMatch = numberedListRegex.exec(line)
							const listItemMatch = listItemRegex.exec(line)
							if (checkboxMatch) {
								return line.replace(`${checkboxMatch.groups.checkbox}${checkboxMatch.groups.space}`, `${index + 1}. `)
							} else if (numberedListMatch) {
								return line.replace(
									`${numberedListMatch.groups.number}${numberedListMatch.groups.delimiter}${numberedListMatch.groups.space}`,
									`${index + 1}. `,
								)
							} else if (listItemMatch) {
								return line.replace(`${listItemMatch.groups.symbol}${listItemMatch.groups.space}`, `${index + 1}. `)
							}
							return line.replace(indentRegex, (match, indent, content) => `${indent}${index + 1}. ${content}`)
						})
						.join('\n')
				}
			}
			if (newText) {
				this.monacoEditor.executeEdits(undefined, [
					{
						range: expandedSelection,
						text: newText,
					},
				])
				if (action === 'insert-ordered-list') {
					this.renumberListFromLine(selection.startLineNumber)
				}
			}
			if (!selection.isEmpty()) {
				this.monacoEditor.setSelection({
					startLineNumber: selection.startLineNumber,
					startColumn: 1,
					endLineNumber: selection.endLineNumber,
					endColumn: this.monacoEditorModel.getLineMaxColumn(selection.endLineNumber),
				})
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
