import { editor, languages, type IDisposable, type IRange } from 'monaco-editor'
import { Debounce } from '../../helpers'
import type { EditorPlugin } from '../editor-plugin'
import { MimiriCodeLensProvider, type MimiriCodeLensItem } from './mimiri-code-lens-provider'

interface ConflictBlockState {
	start: number // <<<<<<< Local line number
	separator: number // ======= line number
	end: number // >>>>>>> Server line number
	decorationIds: string[] // All decoration IDs for this block
}

export class ConflictBlockPlugin implements EditorPlugin {
	private _active: boolean = true
	private monacoEditorModel: editor.ITextModel
	private conflictBlockStates: ConflictBlockState[] = []
	private pendingBlocks: Set<ConflictBlockState> = new Set()
	private debounce: Debounce
	private codeLensDisposable: IDisposable | null = null
	private acceptCurrentCommandId: string
	private acceptIncomingCommandId: string
	private acceptBothCommandId: string
	private codeLensProvider: MimiriCodeLensProvider

	constructor(private monacoEditor: editor.IStandaloneCodeEditor) {
		this.monacoEditorModel = this.monacoEditor.getModel()

		// Command: Accept Local changes
		this.acceptCurrentCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			this.resolveConflict(block, 'current')
		})

		// Command: Accept Server changes
		this.acceptIncomingCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			this.resolveConflict(block, 'incoming')
		})

		// Command: Accept Both changes
		this.acceptBothCommandId = this.monacoEditor.addCommand(0, (_, args?: MimiriCodeLensItem) => {
			if (!args) {
				return
			}
			const block = this.findBlockByStartLine(args.startLine)
			if (!block) {
				return
			}
			this.resolveConflict(block, 'both')
		})

		this.codeLensProvider = new MimiriCodeLensProvider({
			getItems: () => this.conflictBlockStates.map(block => ({ startLine: block.start })),
			commands: [
				{ title: 'Keep Local', commandId: this.acceptCurrentCommandId },
				{ title: 'Keep Server', commandId: this.acceptIncomingCommandId },
				{ title: 'Keep Both', commandId: this.acceptBothCommandId },
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
			const hasMarkerChange = e.changes.some(change => {
				// Check if the inserted text contains conflict markers
				if (change.text.includes('<<<<<<<') || change.text.includes('=======') || change.text.includes('>>>>>>>')) {
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

				// Check if any deleted line was a marker line (check old state)
				for (const line of deletedLines) {
					for (const block of this.conflictBlockStates) {
						if (line === block.start || line === block.separator || line === block.end) {
							return true
						}
					}
				}

				// Check if any inserted line now contains a marker (check new content)
				for (const line of insertedLines) {
					if (line <= this.monacoEditorModel.getLineCount()) {
						const lineContent = this.monacoEditorModel.getLineContent(line)
						const trimmed = lineContent.trim()
						if (trimmed.startsWith('<<<<<<<') || trimmed.startsWith('=======') || trimmed.startsWith('>>>>>>>')) {
							return true
						}
					}
				}

				return false
			})

			if (hasMarkerChange) {
				// Structural change - do full scan immediately
				this.fullScan()
			} else {
				// Check if change affects any conflict blocks
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

	private getAffectedBlocks(changes: editor.IModelContentChange[]): ConflictBlockState[] {
		const affected: ConflictBlockState[] = []

		for (const change of changes) {
			const startLine = change.range.startLineNumber
			const endLine = change.range.endLineNumber

			// Find blocks that overlap with the changed range
			for (const block of this.conflictBlockStates) {
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
				for (const block of this.conflictBlockStates) {
					if (block.start > oldEndLine) {
						block.start += lineDelta
						block.separator += lineDelta
						block.end += lineDelta
					}
				}
			}
		}
	}

	private scheduleBlockUpdate(blocks: ConflictBlockState[]): void {
		// Accumulate affected blocks
		for (const block of blocks) {
			this.pendingBlocks.add(block)
		}

		this.debounce.activate()
	}

	private fullScan() {
		const model = this.monacoEditorModel
		const lineCount = model.getLineCount()

		// Skip processing for extremely large documents to prevent UI hangs
		if (lineCount > 100000) {
			return
		}

		// Clear all existing decorations
		for (const block of this.conflictBlockStates) {
			model.deltaDecorations(block.decorationIds, [])
		}
		this.conflictBlockStates = []

		// Scan for conflict blocks
		let conflictStart = -1
		let conflictSeparator = -1

		for (let i = 1; i <= lineCount; i++) {
			const line = model.getLineContent(i)
			const trimmedLine = line.trim()

			if (trimmedLine.startsWith('<<<<<<<')) {
				// Starting a conflict block
				conflictStart = i
				conflictSeparator = -1
			} else if (trimmedLine.startsWith('=======') && conflictStart !== -1) {
				// Found separator
				conflictSeparator = i
			} else if (trimmedLine.startsWith('>>>>>>>') && conflictStart !== -1 && conflictSeparator !== -1) {
				// Ending a conflict block - generate decorations
				const decorations = this.generateBlockDecorations(conflictStart, conflictSeparator, i)
				const decorationIds = model.deltaDecorations([], decorations)

				this.conflictBlockStates.push({
					start: conflictStart,
					separator: conflictSeparator,
					end: i,
					decorationIds,
				})

				// Reset state
				conflictStart = -1
				conflictSeparator = -1
			}
		}

		this.refreshCodeLens()
	}

	private updateBlocks(blocks: ConflictBlockState[]): void {
		const model = this.monacoEditorModel

		for (const block of blocks) {
			// Remove old decorations for this block
			model.deltaDecorations(block.decorationIds, [])

			// Rescan to find the actual current separator and end of this block
			let actualSeparator = block.separator
			let actualEnd = block.end

			for (let i = block.start + 1; i <= model.getLineCount(); i++) {
				const line = model.getLineContent(i)
				const trimmed = line.trim()

				if (trimmed.startsWith('=======') && i < actualEnd) {
					actualSeparator = i
				} else if (trimmed.startsWith('>>>>>>>')) {
					actualEnd = i
					break
				}
			}

			// Update the block's positions in our state
			block.separator = actualSeparator
			block.end = actualEnd

			// Regenerate decorations for the block with updated boundaries
			const decorations = this.generateBlockDecorations(block.start, block.separator, block.end)
			block.decorationIds = model.deltaDecorations([], decorations)
		}

		this.refreshCodeLens()
	}

	private generateBlockDecorations(
		startLine: number,
		separatorLine: number,
		endLine: number,
	): editor.IModelDeltaDecoration[] {
		const model = this.monacoEditorModel
		const decorations: editor.IModelDeltaDecoration[] = []

		// Add decoration for opening marker (<<<<<<< Local)
		decorations.push({
			range: {
				startLineNumber: startLine,
				startColumn: 1,
				endLineNumber: startLine,
				endColumn: model.getLineMaxColumn(startLine),
			},
			options: {
				isWholeLine: true,
				className: 'conflict-marker-line',
				inlineClassName: 'conflict-marker-start',
			},
		})

		// Add decorations for local content lines
		for (let j = startLine + 1; j < separatorLine; j++) {
			decorations.push({
				range: {
					startLineNumber: j,
					startColumn: 1,
					endLineNumber: j,
					endColumn: model.getLineMaxColumn(j),
				},
				options: {
					isWholeLine: true,
					className: 'conflict-current-line',
				},
			})
		}

		// Add decoration for separator (=======)
		decorations.push({
			range: {
				startLineNumber: separatorLine,
				startColumn: 1,
				endLineNumber: separatorLine,
				endColumn: model.getLineMaxColumn(separatorLine),
			},
			options: {
				isWholeLine: true,
				className: 'conflict-marker-line',
				inlineClassName: 'conflict-marker-separator',
			},
		})

		// Add decorations for server content lines
		for (let j = separatorLine + 1; j < endLine; j++) {
			decorations.push({
				range: {
					startLineNumber: j,
					startColumn: 1,
					endLineNumber: j,
					endColumn: model.getLineMaxColumn(j),
				},
				options: {
					isWholeLine: true,
					className: 'conflict-incoming-line',
				},
			})
		}

		// Add decoration for closing marker (>>>>>>> Server)
		decorations.push({
			range: {
				startLineNumber: endLine,
				startColumn: 1,
				endLineNumber: endLine,
				endColumn: model.getLineMaxColumn(endLine),
			},
			options: {
				isWholeLine: true,
				className: 'conflict-marker-line',
				inlineClassName: 'conflict-marker-end',
			},
		})

		return decorations
	}

	private resolveConflict(block: ConflictBlockState, resolution: 'current' | 'incoming' | 'both'): void {
		const model = this.monacoEditorModel
		let replacementText = ''

		if (resolution === 'current') {
			// Keep only the local changes
			const currentRange = this.getCurrentRange(block)
			if (currentRange) {
				replacementText = model.getValueInRange(currentRange)
			}
		} else if (resolution === 'incoming') {
			// Keep only the server changes
			const incomingRange = this.getIncomingRange(block)
			if (incomingRange) {
				replacementText = model.getValueInRange(incomingRange)
			}
		} else if (resolution === 'both') {
			// Keep both changes
			const currentRange = this.getCurrentRange(block)
			const incomingRange = this.getIncomingRange(block)
			const parts: string[] = []

			if (currentRange) {
				parts.push(model.getValueInRange(currentRange))
			}
			if (incomingRange) {
				parts.push(model.getValueInRange(incomingRange))
			}

			replacementText = parts.join('\n')
		}

		// Replace the entire conflict block (including markers) with the resolution
		const fullRange = this.getBlockFullRange(block)
		this.monacoEditor.executeEdits('conflict-resolution', [
			{
				range: fullRange,
				text: replacementText,
			},
		])

		// The fullScan will be triggered by the content change event
	}

	show(): void {}

	updateText(): void {}

	executeFormatAction(_action: string): boolean {
		// Future: Could add actions like "insert-conflict-block" for testing
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
		if (this.codeLensDisposable) {
			this.codeLensDisposable.dispose()
			this.codeLensDisposable = null
		}

		this.codeLensProvider.dispose()
	}

	private findBlockByStartLine(startLine: number): ConflictBlockState | undefined {
		return this.conflictBlockStates.find(block => block.start === startLine)
	}

	private getCurrentRange(block: ConflictBlockState): IRange | null {
		if (block.separator - block.start <= 1) {
			return null
		}

		const lastContentLine = block.separator - 1
		return {
			startLineNumber: block.start + 1,
			startColumn: 1,
			endLineNumber: lastContentLine,
			endColumn: this.monacoEditorModel.getLineMaxColumn(lastContentLine),
		}
	}

	private getIncomingRange(block: ConflictBlockState): IRange | null {
		if (block.end - block.separator <= 1) {
			return null
		}

		const lastContentLine = block.end - 1
		return {
			startLineNumber: block.separator + 1,
			startColumn: 1,
			endLineNumber: lastContentLine,
			endColumn: this.monacoEditorModel.getLineMaxColumn(lastContentLine),
		}
	}

	private getBlockFullRange(block: ConflictBlockState): IRange {
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
