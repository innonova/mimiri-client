import { editor } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'
import { Debounce } from '../../helpers'

export class InlineMarkdownPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private lineDecorations: Map<number, string[]> = new Map() // line number -> decoration IDs
	private pendingLines: Set<number> = new Set() // Accumulate affected lines across multiple changes
	private debounce: Debounce

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()

		this.debounce = new Debounce(
			() => {
				const linesToUpdate = Array.from(this.pendingLines)
				this.pendingLines.clear()
				this.updateLines(linesToUpdate)
			},
			50,
			100,
		)

		this.monacoEditorModel.onDidChangeContent(e => {
			if (!this._active) {
				return
			}

			// Get affected lines from changes
			const affectedLines = new Set<number>()

			for (const change of e.changes) {
				const startLine = change.range.startLineNumber
				const endLine = change.range.endLineNumber
				const newLineCount = change.text.split('\n').length - 1
				const oldLineCount = endLine - startLine

				// Mark changed lines for update
				for (let i = 0; i <= newLineCount; i++) {
					affectedLines.add(startLine + i)
				}

				// Adjust line numbers for decorations below the change
				const lineDelta = newLineCount - oldLineCount
				if (lineDelta !== 0) {
					this.adjustLineNumbers(startLine, endLine, lineDelta)
				}
			}

			// Schedule update for affected lines
			this.scheduleUpdate(Array.from(affectedLines))
		})
	}

	private adjustLineNumbers(startLine: number, afterLine: number, delta: number): void {
		if (delta === 0) {
			return
		}

		const newMap = new Map<number, string[]>()
		const newPendingLines = new Set<number>()
		const decorationsToRemove: string[] = []

		// Adjust line numbers in the decoration map
		for (const [lineNumber, decorationIds] of this.lineDecorations.entries()) {
			if (delta < 0 && lineNumber >= startLine && lineNumber <= afterLine) {
				// Lines being deleted - collect their decorations for removal
				decorationsToRemove.push(...decorationIds)
			} else if (lineNumber > afterLine) {
				// Move decoration tracking to new line number
				newMap.set(lineNumber + delta, decorationIds)
			} else {
				// Keep decoration tracking at same line
				newMap.set(lineNumber, decorationIds)
			}
		}

		// Remove decorations from deleted lines
		if (decorationsToRemove.length > 0) {
			this.monacoEditorModel.deltaDecorations(decorationsToRemove, [])
		}

		// Adjust line numbers in pending updates
		for (const lineNumber of this.pendingLines) {
			if (delta < 0 && lineNumber >= startLine && lineNumber <= afterLine) {
				// Skip pending updates for deleted lines
				continue
			} else if (lineNumber > afterLine) {
				newPendingLines.add(lineNumber + delta)
			} else {
				newPendingLines.add(lineNumber)
			}
		}

		this.lineDecorations = newMap
		this.pendingLines = newPendingLines
	}

	private scheduleUpdate(affectedLines: number[]): void {
		// Accumulate affected lines
		for (const line of affectedLines) {
			this.pendingLines.add(line)
		}

		this.debounce.activate()
	}

	private updateLines(lineNumbers: number[]): void {
		const model = this.monacoEditorModel

		// Skip for extremely large documents
		if (model.getLineCount() > 100000) {
			return
		}

		for (const lineNumber of lineNumbers) {
			// Skip invalid line numbers
			if (lineNumber < 1 || lineNumber > model.getLineCount()) {
				// Remove decorations for deleted lines
				if (this.lineDecorations.has(lineNumber)) {
					const oldIds = this.lineDecorations.get(lineNumber)!
					model.deltaDecorations(oldIds, [])
					this.lineDecorations.delete(lineNumber)
				}
				continue
			}

			// Clear old decorations for this line
			const oldDecorationIds = this.lineDecorations.get(lineNumber) || []

			// Get new decorations for this line
			const line = model.getLineContent(lineNumber)
			const decorations: editor.IModelDeltaDecoration[] = []

			// Check for heading pattern
			const headingMatches = this.findHeadingPatterns(line, lineNumber)
			decorations.push(...headingMatches)

			// Check for password pattern
			const passwordMatches = this.findPasswordPatterns(line, lineNumber)
			decorations.push(...passwordMatches)

			// Check for checkbox pattern
			const checkboxMatches = this.findCheckboxPatterns(line, lineNumber)
			decorations.push(...checkboxMatches)

			// Check for bold/italic patterns (only if not in a heading)
			if (headingMatches.length === 0) {
				const textStyleMatches = this.findTextStylePatterns(line, lineNumber)
				decorations.push(...textStyleMatches)
			}

			// Update decorations for this line
			const newDecorationIds = model.deltaDecorations(oldDecorationIds, decorations)

			if (newDecorationIds.length > 0) {
				this.lineDecorations.set(lineNumber, newDecorationIds)
			} else {
				this.lineDecorations.delete(lineNumber)
			}
		}
	}

	private fullScan(): void {
		const model = this.monacoEditorModel
		const lineCount = model.getLineCount()

		// Skip for extremely large documents
		if (lineCount > 100000) {
			return
		}

		// Clear all existing decorations
		for (const decorationIds of this.lineDecorations.values()) {
			model.deltaDecorations(decorationIds, [])
		}
		this.lineDecorations.clear()

		// Update all lines
		const allLines: number[] = []
		for (let i = 1; i <= lineCount; i++) {
			allLines.push(i)
		}
		this.updateLines(allLines)
	}

	private findPasswordPatterns(line: string, lineNumber: number): editor.IModelDeltaDecoration[] {
		const decorations: editor.IModelDeltaDecoration[] = []
		const regex = /p`([^`]+)`/g
		let match: RegExpExecArray | null

		while ((match = regex.exec(line)) !== null) {
			const startCol = match.index + 1
			const delimiterLength = 2 // p`
			const contentLength = match[1].length
			const endDelimiterStart = startCol + delimiterLength + contentLength

			// Opening delimiter `p`
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol,
					endLineNumber: lineNumber,
					endColumn: startCol + delimiterLength,
				},
				options: {
					inlineClassName: 'password-delimiter',
				},
			})

			// Password content (will be masked with CSS)
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol + delimiterLength,
					endLineNumber: lineNumber,
					endColumn: endDelimiterStart,
				},
				options: {
					inlineClassName: 'password-content',
				},
			})

			// Closing delimiter `
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: endDelimiterStart,
					endLineNumber: lineNumber,
					endColumn: endDelimiterStart + 1,
				},
				options: {
					inlineClassName: 'password-delimiter',
				},
			})
		}

		return decorations
	}

	private findHeadingPatterns(line: string, lineNumber: number): editor.IModelDeltaDecoration[] {
		const decorations: editor.IModelDeltaDecoration[] = []
		const regex = /^(#{1,6}\s)(.*)/
		const match = regex.exec(line)

		if (match) {
			const startCol = match.index + 1
			const fullLength = match[0].length

			// Entire heading line
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol,
					endLineNumber: lineNumber,
					endColumn: startCol + fullLength,
				},
				options: {
					inlineClassName: 'md-heading',
				},
			})

			// Apply text style decorations within the heading text
			const headingText = match[2]
			const headingStartCol = startCol + match[1].length
			const textStyleDecorations = this.findTextStylePatterns(headingText, lineNumber, headingStartCol)
			decorations.push(...textStyleDecorations)
		}

		return decorations
	}

	private findTextStylePatterns(line: string, lineNumber: number, offset: number = 0): editor.IModelDeltaDecoration[] {
		const decorations: editor.IModelDeltaDecoration[] = []

		// Define patterns in order of precedence (longest matches first)
		const patterns = [
			// Bold+Italic with underscores
			{ regex: /___([^_]+)___/g, className: 'md-bold-italic' },
			// Bold+Italic with asterisks
			{ regex: /\*{3}([^\*]+)\*{3}/g, className: 'md-bold-italic' },
			// Bold with underscores
			{ regex: /(?<!_)__(?!_)([^_]+)(?<!_)__(?!_)/g, className: 'md-bold' },
			// Bold with asterisks
			{ regex: /(?<!\*)\*{2}(?!\*)([^\*]+)(?<!\*)\*{2}(?!\*)/g, className: 'md-bold' },
			// Italic with underscores
			{ regex: /(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, className: 'md-italic' },
			// Italic with asterisks
			{ regex: /(?<!\*)\*(?!\*)([^\*]+)(?<!\*)\*(?!\*)/g, className: 'md-italic' },
		]

		for (const pattern of patterns) {
			let match: RegExpExecArray | null
			while ((match = pattern.regex.exec(line)) !== null) {
				const startCol = match.index + 1 + offset
				const fullLength = match[0].length

				// Entire styled text with delimiters
				decorations.push({
					range: {
						startLineNumber: lineNumber,
						startColumn: startCol,
						endLineNumber: lineNumber,
						endColumn: startCol + fullLength,
					},
					options: {
						inlineClassName: pattern.className,
					},
				})
			}
		}

		return decorations
	}

	private findCheckboxPatterns(line: string, lineNumber: number): editor.IModelDeltaDecoration[] {
		const decorations: editor.IModelDeltaDecoration[] = []
		const regex = /\[([ Xx])\]/g
		let match: RegExpExecArray | null

		while ((match = regex.exec(line)) !== null) {
			const startCol = match.index + 1
			const isChecked = match[1].toLowerCase() === 'x'

			// Opening bracket [
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol,
					endLineNumber: lineNumber,
					endColumn: startCol + 1,
				},
				options: {
					inlineClassName: 'checkbox-bracket',
				},
			})

			// Checkmark or space
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol + 1,
					endLineNumber: lineNumber,
					endColumn: startCol + 2,
				},
				options: {
					inlineClassName: isChecked ? 'checkbox-checked' : 'checkbox-unchecked',
				},
			})

			// Closing bracket ]
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol + 2,
					endLineNumber: lineNumber,
					endColumn: startCol + 3,
				},
				options: {
					inlineClassName: 'checkbox-bracket',
				},
			})

			// Add a whole-element decoration for hover/click behavior
			decorations.push({
				range: {
					startLineNumber: lineNumber,
					startColumn: startCol,
					endLineNumber: lineNumber,
					endColumn: startCol + 3,
				},
				options: {
					inlineClassName: 'checkbox-interactive',
				},
			})
		}

		if (decorations.length > 0) {
			console.log('checkbox decos', decorations)
		}

		return decorations
	}

	show(): void {}

	updateText(): void {}

	executeFormatAction(_action: string): boolean {
		return false
	}

	get active(): boolean {
		return this._active
	}

	set active(value: boolean) {
		if (this._active !== value) {
			this._active = value
			if (this._active) {
				this.fullScan()
			} else {
				// Clear all decorations when disabled
				for (const decorationIds of this.lineDecorations.values()) {
					this.monacoEditorModel.deltaDecorations(decorationIds, [])
				}
				this.lineDecorations.clear()
			}
		}
	}
}
