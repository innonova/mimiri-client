import { editor, languages, type IDisposable, type IRange } from 'monaco-editor'
import { Debounce } from '../../helpers'
import type { EditorPlugin } from '../editor-plugin'
import { mimiriCompletionProvider } from './mimiri-provider'
import { MimiriCodeLensProvider, type MimiriCodeLensItem } from './mimiri-code-lens-provider'
import { clipboardManager } from '../../../global'

interface CodeBlockState {
	start: number // Opening fence line number
	end: number // Closing fence line number
	decorationIds: string[] // All decoration IDs for this block
}

export class CodeBlockPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private codeBlockStates: CodeBlockState[] = []
	private pendingBlocks: Set<CodeBlockState> = new Set()
	private debounce: Debounce
	private completionProvider: IDisposable | null = null
	private codeLensDisposable: IDisposable | null = null
	private copyCodeBlockCommandId: string
	private selectCodeBlockCommandId: string
	private copyNextLineCommandId: string
	private codeLensProvider: MimiriCodeLensProvider
	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()

		this.completionProvider = languages.registerCompletionItemProvider(
			this.monacoEditorModel.getLanguageId(),
			mimiriCompletionProvider,
		)

		this.copyCodeBlockCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			const contentRange = this.getBlockContentRange(block)
			if (!contentRange) {
				return
			}

			const text = this.monacoEditorModel.getValueInRange(contentRange)
			if (!text) {
				return
			}

			clipboardManager.write(text.replace(/p`([^`]+)`/g, '$1'))
		})

		this.selectCodeBlockCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			const range = this.getBlockFullRange(block)
			this.monacoEditor.setSelection(range)
			this.monacoEditor.revealRangeInCenter(range)
		})

		this.copyNextLineCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			const selection = this.monacoEditor.getSelection()
			if (
				selection.isEmpty() ||
				selection.startLineNumber <= block.start ||
				selection.startLineNumber !== selection.endLineNumber
			) {
				this.monacoEditor.setSelection({
					startLineNumber: block.start + 1,
					startColumn: 1,
					endLineNumber: block.start + 1,
					endColumn: this.monacoEditorModel.getLineMaxColumn(block.start + 1),
				})
			} else {
				let lineToCopy = selection.startLineNumber + 1
				let endColumn = this.monacoEditorModel.getLineMaxColumn(lineToCopy)
				while (endColumn === 1 && lineToCopy < block.end && lineToCopy < this.monacoEditorModel.getLineCount()) {
					endColumn = this.monacoEditorModel.getLineMaxColumn(++lineToCopy)
				}
				if (lineToCopy >= block.end) {
					lineToCopy = block.start + 1
					endColumn = this.monacoEditorModel.getLineMaxColumn(lineToCopy)
				}
				this.monacoEditor.setSelection({
					startLineNumber: lineToCopy,
					startColumn: 1,
					endLineNumber: lineToCopy,
					endColumn,
				})
			}
			const text = this.monacoEditorModel.getValueInRange(this.monacoEditor.getSelection())
			if (!text) {
				return
			}
			clipboardManager.write(text.replace(/p`([^`]+)`/g, '$1'))
		})

		this.codeLensProvider = new MimiriCodeLensProvider({
			getItems: () => this.codeBlockStates.map(block => ({ startLine: block.start })),
			commands: [
				{ title: 'Copy block', commandId: this.copyCodeBlockCommandId },
				{ title: 'Select block', commandId: this.selectCodeBlockCommandId },
				{ title: 'Copy Next Line', commandId: this.copyNextLineCommandId },
			],
		})

		this.codeLensDisposable = languages.registerCodeLensProvider(
			this.monacoEditorModel.getLanguageId(),
			this.codeLensProvider,
		)

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
			if (!this._active) {
				return
			}

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
			}
		})
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

		for (let i = 1; i <= lineCount; i++) {
			const line = model.getLineContent(i)
			const trimmedLine = line.trim()

			if (trimmedLine.startsWith('```')) {
				if (!inCodeBlock) {
					// Starting a code block
					inCodeBlock = true
					codeBlockStart = i
				} else {
					// Ending a code block - generate decorations
					inCodeBlock = false

					const decorations = this.generateBlockDecorations(codeBlockStart, i)

					const decorationIds = model.deltaDecorations([], decorations)

					this.codeBlockStates.push({
						start: codeBlockStart,
						end: i,
						decorationIds,
					})
				}
			}
		}
		this.refreshCodeLens()
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
			const decorations = this.generateBlockDecorations(block.start, block.end)
			block.decorationIds = model.deltaDecorations([], decorations)
		}

		this.refreshCodeLens()
	}

	private generateBlockDecorations(startLine: number, endLine: number): editor.IModelDeltaDecoration[] {
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

		// Add background decorations for content lines
		// Syntax highlighting is now handled by Monaco's tokenizer via nextEmbedded
		for (let j = startLine + 1; j < endLine; j++) {
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
		}

		return decorations
	}

	show(): void {}

	updateText(): void {}

	getSupportedActions(): string[] {
		return ['insert-code-block']
	}

	executeFormatAction(action: string): boolean {
		if (action === 'insert-code-block') {
			const selection = this.monacoEditor.getSelection()
			const expandedSelection = {
				...selection,
				startColumn: 1,
				endColumn: this.monacoEditorModel.getLineMaxColumn(selection.endLineNumber),
			}
			if (selection.isEmpty()) {
				// Insert code block and position cursor for language input
				this.monacoEditor.executeEdits(undefined, [
					{
						range: selection,
						text: '```\n\n```\n',
					},
				])

				// Position cursor right after the opening ```
				const newPosition = {
					lineNumber: selection.startLineNumber,
					column: 4, // After ```
				}
				this.monacoEditor.setPosition(newPosition)

				// Trigger autocomplete to show language suggestions
				setTimeout(() => {
					this.monacoEditor.trigger('keyboard', 'editor.action.triggerSuggest', {})
				}, 50)
			} else {
				this.monacoEditor.executeEdits(undefined, [
					{
						range: {
							startLineNumber: expandedSelection.endLineNumber,
							startColumn: this.monacoEditorModel.getLineMaxColumn(expandedSelection.endLineNumber),
							endLineNumber: expandedSelection.endLineNumber,
							endColumn: this.monacoEditorModel.getLineMaxColumn(expandedSelection.endLineNumber),
						},
						text: '\n```\n',
					},
					{
						range: {
							startLineNumber: expandedSelection.startLineNumber,
							startColumn: 1,
							endLineNumber: expandedSelection.startLineNumber,
							endColumn: 1,
						},
						text: '```\n',
					},
				])

				// Position cursor after opening fence for language input
				const newPosition = {
					lineNumber: expandedSelection.startLineNumber,
					column: 4, // After ```
				}
				this.monacoEditor.setPosition(newPosition)

				// Trigger autocomplete to show language suggestions
				setTimeout(() => {
					this.monacoEditor.trigger('keyboard', 'editor.action.triggerSuggest', {})
				}, 50)
			}
			return true
		}
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

	dispose(): void {
		// Clean up completion provider when plugin is disposed
		if (this.completionProvider) {
			this.completionProvider.dispose()
			this.completionProvider = null
		}

		if (this.codeLensDisposable) {
			this.codeLensDisposable.dispose()
			this.codeLensDisposable = null
		}

		this.codeLensProvider.dispose()
	}

	private findBlockByStartLine(startLine: number): CodeBlockState | undefined {
		return this.codeBlockStates.find(block => block.start === startLine)
	}

	private getBlockContentRange(block: CodeBlockState): IRange | null {
		if (block.end - block.start <= 1) {
			return null
		}

		const lastContentLine = block.end - 1
		return {
			startLineNumber: block.start + 1,
			startColumn: 1,
			endLineNumber: lastContentLine,
			endColumn: this.monacoEditorModel.getLineMaxColumn(lastContentLine),
		}
	}

	private getBlockFullRange(block: CodeBlockState): IRange {
		return {
			startLineNumber: block.start,
			startColumn: 1,
			endLineNumber: block.end,
			endColumn: this.monacoEditorModel.getLineMaxColumn(block.end),
		}
	}

	private refreshCodeLens(): void {
		this.codeLensProvider.refresh()
	}
}
