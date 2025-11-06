import { se } from 'date-fns/locale'
import { KeyCode, type editor } from 'monaco-editor'

const checkBoxListRegex = /^(?<indent>(\s*))(?<checkbox>\[(?:x| )\])(?<space>\s)/
const numberedListRegex = /^(?<indent>\s*)(?<number>\d+|[a-z])(?<delimiter>[.)])(?<space>\s)/
const listItemRegex = /^(?<indent>\s*)(?<symbol>\W)(?<space>\s)/
const indentRegex = /^(?<indent>\s*)(?<content>.*)/
const letters = [
	'a',
	'b',
	'c',
	'd',
	'e',
	'f',
	'g',
	'h',
	'i',
	'j',
	'k',
	'l',
	'm',
	'n',
	'o',
	'p',
	'q',
	'r',
	's',
	't',
	'u',
	'v',
	'w',
	'x',
	'y',
	'z',
]

export class ListPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()
		this.monacoEditor.onKeyUp(e => {
			if (this._active) {
				if (e.keyCode === KeyCode.Enter) {
					const selection = this.monacoEditor.getSelection()
					if (selection.startLineNumber === selection.endLineNumber) {
						const currentLine = selection.startLineNumber
						const prevLine = currentLine - 1
						const prevLineContent = this.monacoEditorModel.getLineContent(prevLine)

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
								newContent = `${checkboxMatch.groups.indent}[ ] `
							}
						} else if (numberedListMatch) {
							if (numberedListMatch[0] === prevLineContent) {
								deletePrevLine = true
							} else {
								const mode: 'number' | 'letter' = isNaN(parseInt(numberedListMatch.groups.number)) ? 'letter' : 'number'
								if (mode === 'letter') {
									const currentLetter = numberedListMatch.groups.number
									const currentIndex = letters.indexOf(currentLetter)
									const nextIndex = (currentIndex + 1) % letters.length
									const nextLetter = letters[nextIndex]
									newContent = `${numberedListMatch.groups.indent}${nextLetter}${numberedListMatch.groups.delimiter} `
								} else {
									const itemNumber = parseInt(numberedListMatch.groups.number)
									const newLineNumber = itemNumber + 1
									newContent = `${numberedListMatch.groups.indent}${newLineNumber}${numberedListMatch.groups.delimiter} `
								}
								const nextLineContent = this.monacoEditorModel.getLineContent(currentLine + 1)
								renumber = !!numberedListRegex.exec(nextLineContent)
							}
						} else if (listItemMatch) {
							if (listItemMatch[0] === prevLineContent) {
								deletePrevLine = true
							} else {
								newContent = listItemMatch[0]
							}
						}

						if (deletePrevLine) {
							const action = {
								range: {
									startLineNumber: prevLine,
									startColumn: 1,
									endLineNumber: currentLine,
									endColumn: 1,
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
								this.monacoEditor.getAction('editor.action.outdentLines').run()
							} else {
								this.monacoEditor.getAction('editor.action.indentLines').run()
							}
							e.stopPropagation()
							e.preventDefault()
							this.renumberListFromLine(currentLine)
						}
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
						const prevLine = change.range.startLineNumber - 1
						let nextLine = change.range.startLineNumber
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

		const indentLevelState: Map<number, { mode: 'number' | 'letter'; counter: number }> = new Map()
		const indentLevels: number[] = []
		const edits = []

		const firstLineContent = this.monacoEditorModel.getLineContent(currentLine)
		const firstMatch = numberedListRegex.exec(firstLineContent)
		const baseMode: 'number' | 'letter' = firstMatch && isNaN(parseInt(firstMatch.groups.number)) ? 'letter' : 'number'

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
					const depth = indentLevels.filter(level => level < indentLength).length
					let mode: 'number' | 'letter'
					if (depth % 2 === 0) {
						mode = baseMode
					} else {
						mode = baseMode === 'number' ? 'letter' : 'number'
					}
					indentLevelState.set(indentLength, { mode, counter: 1 })
					indentLevels.push(indentLength)
				}

				const state = indentLevelState.get(indentLength)
				let expectedNumber = ''
				if (state.mode === 'number') {
					expectedNumber = `${state.counter}`
				} else {
					expectedNumber = letters[(state.counter - 1) % letters.length]
				}

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

				state.counter++
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
									'[ ] ',
								)
							} else if (listItemMatch) {
								return line.replace(`${listItemMatch.groups.symbol}${listItemMatch.groups.space}`, '[ ] ')
							}
							return line.replace(indentRegex, (match, indent, content) => `${indent}[ ] ${content}`)
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
			this.monacoEditor.setSelection({
				startLineNumber: selection.startLineNumber,
				startColumn: 1,
				endLineNumber: selection.endLineNumber,
				endColumn: this.monacoEditorModel.getLineMaxColumn(selection.endLineNumber),
			})
			return true
		}
		return false
	}

	public get active(): boolean {
		return this._active
	}

	public set active(value: boolean) {
		this._active = value
	}
}
