import { editor, languages } from 'monaco-editor'
import type { EditorPlugin } from '../editor-plugin'
import { Debounce } from '../../helpers'

interface CodeBlockState {
	start: number // Opening fence line number
	end: number // Closing fence line number
	language: string // Language identifier (e.g., 'javascript')
	decorationIds: string[] // All decoration IDs for this block
}

export class CodeBlockPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private codeBlockStates: CodeBlockState[] = []
	private pendingBlocks: Set<CodeBlockState> = new Set()
	private debounce: Debounce
	private loadedLanguages: Set<string> = new Set()
	private newLanguageDetected: boolean = false

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()

		this.debounce = new Debounce(
			() => {
				const blocksToUpdate = Array.from(this.pendingBlocks)
				this.pendingBlocks.clear()
				this.updateBlocks(blocksToUpdate)
			},
			100,
			200,
		)

		this.monacoEditorModel.onDidChangeContent(e => {
			if (!this._active) return

			// Determine what kind of update is needed
			const hasFenceChange = e.changes.some(change => {
				// Check if the inserted text contains backticks
				if (change.text.includes('```')) {
					return true
				}

				// Calculate which lines were affected by this change
				const deletedLines: number[] = []
				const insertedLines: number[] = []

				// Lines affected by deletion (before the change)
				if (change.rangeLength > 0) {
					for (let line = change.range.startLineNumber; line <= change.range.endLineNumber; line++) {
						deletedLines.push(line)
					}
				}

				// Lines affected by insertion (after the change)
				const insertedLineCount = change.text.split('\n').length - 1
				const insertionStartLine = change.range.startLineNumber
				for (let i = 0; i <= insertedLineCount; i++) {
					insertedLines.push(insertionStartLine + i)
				}

				// Check if any deleted line was a fence line (check old state)
				for (const line of deletedLines) {
					for (const block of this.codeBlockStates) {
						if (line === block.start || line === block.end) {
							return true
						}
					}
				}

				// Check if any inserted line now contains a fence (check new content)
				for (const line of insertedLines) {
					if (line <= this.monacoEditorModel.getLineCount()) {
						const lineContent = this.monacoEditorModel.getLineContent(line)
						if (lineContent.trim().startsWith('```')) {
							return true
						}
					}
				}

				return false
			})

			if (hasFenceChange) {
				// Structural change - do full scan immediately
				this.fullScan()
			} else {
				// Check if change affects any code blocks
				const affectedBlocks = this.getAffectedBlocks(e.changes)

				if (affectedBlocks.length > 0) {
					// Content change in blocks - debounced update
					this.scheduleBlockUpdate(affectedBlocks)
				} else {
					// Change outside blocks - check if line numbers need adjustment
					this.adjustBlockLineNumbers(e.changes)
				}
				this.checkForNewLanguage()
			}
		})
	}

	private checkForNewLanguage(): void {
		if (this.newLanguageDetected) {
			this.newLanguageDetected = false
			setTimeout(() => {
				this.fullScan()
			}, 100)
		}
	}

	private getAffectedBlocks(changes: editor.IModelContentChange[]): CodeBlockState[] {
		const affected: CodeBlockState[] = []

		for (const change of changes) {
			const startLine = change.range.startLineNumber
			const endLine = change.range.endLineNumber

			// Find blocks that overlap with the changed range
			for (const block of this.codeBlockStates) {
				if (startLine <= block.end && endLine >= block.start) {
					if (!affected.includes(block)) {
						affected.push(block)
					}
				}
			}
		}

		return affected
	}

	private adjustBlockLineNumbers(changes: editor.IModelContentChange[]): void {
		// Changes are ordered from end to beginning, so process in order
		for (const change of changes) {
			const startLine = change.range.startLineNumber
			const oldEndLine = change.range.endLineNumber
			const newLineCount = change.text.split('\n').length - 1
			const oldLineCount = oldEndLine - startLine
			const lineDelta = newLineCount - oldLineCount

			if (lineDelta !== 0) {
				// Adjust line numbers for blocks below the change
				for (const block of this.codeBlockStates) {
					if (block.start > oldEndLine) {
						block.start += lineDelta
						block.end += lineDelta
					}
				}
			}
		}
	}

	private scheduleBlockUpdate(blocks: CodeBlockState[]): void {
		// Accumulate affected blocks
		for (const block of blocks) {
			this.pendingBlocks.add(block)
		}

		this.debounce.activate()
	}

	private fullScan() {
		const model = this.monacoEditorModel
		const lineCount = model.getLineCount()
		this.newLanguageDetected = false

		// Skip code block processing for extremely large documents to prevent UI hangs
		if (lineCount > 100000) {
			return
		}

		// Clear all existing decorations
		for (const block of this.codeBlockStates) {
			model.deltaDecorations(block.decorationIds, [])
		}
		this.codeBlockStates = []

		// Scan for code blocks
		let inCodeBlock = false
		let codeBlockStart = -1
		let codeBlockLanguage = ''

		for (let i = 1; i <= lineCount; i++) {
			const line = model.getLineContent(i)
			const trimmedLine = line.trim()

			if (trimmedLine.startsWith('```')) {
				if (!inCodeBlock) {
					// Starting a code block
					inCodeBlock = true
					codeBlockStart = i
					codeBlockLanguage = trimmedLine.substring(3).trim()
				} else {
					// Ending a code block - generate decorations
					inCodeBlock = false

					const decorations = this.generateBlockDecorations(codeBlockStart, i, codeBlockLanguage)

					const decorationIds = model.deltaDecorations([], decorations)

					this.codeBlockStates.push({
						start: codeBlockStart,
						end: i,
						language: codeBlockLanguage,
						decorationIds,
					})
				}
			}
		}
		this.checkForNewLanguage()
	}

	private updateBlocks(blocks: CodeBlockState[]): void {
		const model = this.monacoEditorModel

		for (const block of blocks) {
			// Remove old decorations for this block
			model.deltaDecorations(block.decorationIds, [])

			// Rescan to find the actual current end of this block
			// (it may have grown or shrunk due to line insertions/deletions)
			let actualEnd = block.end
			for (let i = block.start + 1; i <= model.getLineCount(); i++) {
				const line = model.getLineContent(i)
				if (line.trim().startsWith('```')) {
					actualEnd = i
					break
				}
			}

			// Update the block's end line in our state
			block.end = actualEnd

			// Regenerate decorations for the block with updated boundaries
			const decorations = this.generateBlockDecorations(block.start, block.end, block.language)
			block.decorationIds = model.deltaDecorations([], decorations)
		}
	}

	private generateBlockDecorations(
		startLine: number,
		endLine: number,
		language: string,
	): editor.IModelDeltaDecoration[] {
		const model = this.monacoEditorModel
		const decorations: editor.IModelDeltaDecoration[] = []

		// Add decorations for opening fence
		decorations.push({
			range: {
				startLineNumber: startLine,
				startColumn: 1,
				endLineNumber: startLine,
				endColumn: model.getLineMaxColumn(startLine),
			},
			options: {
				isWholeLine: true,
				className: 'code-block-line',
				inlineClassName: 'code-block-fence',
			},
		})

		// Add decorations for closing fence
		decorations.push({
			range: {
				startLineNumber: endLine,
				startColumn: 1,
				endLineNumber: endLine,
				endColumn: model.getLineMaxColumn(endLine),
			},
			options: {
				isWholeLine: true,
				className: 'code-block-line',
				inlineClassName: 'code-block-fence',
			},
		})

		// Add syntax-highlighted decorations for content lines
		for (let j = startLine + 1; j < endLine; j++) {
			const contentLine = model.getLineContent(j)

			// Background decoration for the line
			decorations.push({
				range: {
					startLineNumber: j,
					startColumn: 1,
					endLineNumber: j,
					endColumn: model.getLineMaxColumn(j),
				},
				options: {
					isWholeLine: true,
					className: 'code-block-line',
				},
			})

			// Add syntax highlighting if language is specified
			if (language && contentLine.trim().length > 0) {
				const syntaxDecorations = this.getSyntaxHighlightingDecorations(contentLine, j, language)
				decorations.push(...syntaxDecorations)
			}
		}

		return decorations
	}

	private getSyntaxHighlightingDecorations(
		line: string,
		lineNumber: number,
		language: string,
	): editor.IModelDeltaDecoration[] {
		const decorations: editor.IModelDeltaDecoration[] = []

		try {
			// Map common language aliases to Monaco language IDs
			const languageMap: { [key: string]: string } = {
				js: 'javascript',
				ts: 'typescript',
				py: 'python',
				rb: 'ruby',
				sh: 'shell',
				bash: 'shell',
				cs: 'csharp',
				md: 'markdown',
				json: 'json',
				xml: 'xml',
				html: 'html',
				css: 'css',
				sql: 'sql',
				yaml: 'yaml',
				dockerfile: 'dockerfile',
			}

			const monacoLanguage = languageMap[language.toLowerCase()] || language.toLowerCase()

			if (!this.loadedLanguages.has(monacoLanguage)) {
				this.loadedLanguages.add(monacoLanguage)
				this.newLanguageDetected = true
			}

			// Check if the language is available
			const availableLanguages = languages.getLanguages()
			const isLanguageAvailable = availableLanguages.some(lang => lang.id === monacoLanguage)

			// Tokenize the line using Monaco's tokenizer
			const tokens = editor.tokenize(line, monacoLanguage)

			if (tokens && tokens[0]) {
				for (let i = 0; i < tokens[0].length; i++) {
					const token = tokens[0][i]
					const nextToken = tokens[0][i + 1]
					const startColumn = token.offset + 1
					const endColumn = nextToken ? nextToken.offset + 1 : line.length + 1

					if (startColumn < endColumn && token.type) {
						// Extract the base token type (e.g., 'keyword.js' -> 'keyword')
						const tokenType = token.type.split('.')[0]

						decorations.push({
							range: {
								startLineNumber: lineNumber,
								startColumn: startColumn,
								endLineNumber: lineNumber,
								endColumn: endColumn,
							},
							options: {
								inlineClassName: `syntax-${tokenType}`,
							},
						})
					}
				}
			}
		} catch (error) {
			// If tokenization fails, silently skip syntax highlighting for this line
			console.warn(`Failed to tokenize line as ${language}:`, error)
		}

		return decorations
	}

	show(): void {}

	updateText(): void {}

	executeFormatAction(action: string): boolean {
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
			}
		}
	}
}
