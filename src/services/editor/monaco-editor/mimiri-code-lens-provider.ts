import { editor, languages, Emitter } from 'monaco-editor'

export interface MimiriCodeLensItem {
	startLine: number
}

export interface MimiriCodeLensCommand {
	title: string
	commandId: string
}

export interface MimiriCodeLensProviderOptions {
	getItems: () => MimiriCodeLensItem[]
	commands: MimiriCodeLensCommand[]
}

export class MimiriCodeLensProvider implements languages.CodeLensProvider {
	public static suspended: boolean = false
	private readonly changeEmitter = new Emitter<void>()
	// monaco types CodeLensProvider.onDidChange as IEvent<this>; cast the void emitter event to satisfy the override
	public readonly onDidChange = this.changeEmitter.event as any

	constructor(private readonly options: MimiriCodeLensProviderOptions) {}

	provideCodeLenses(model: editor.ITextModel): languages.CodeLensList {
		if (MimiriCodeLensProvider.suspended) {
			return {
				lenses: [],
				dispose: () => {},
			}
		}
		const lenses: languages.CodeLens[] = []
		const items = this.options.getItems()

		for (const item of items) {
			const startLine = item.startLine

			if (!Number.isFinite(startLine)) {
				continue
			}

			const normalizedStartLine = Math.floor(startLine)

			if (normalizedStartLine < 1 || normalizedStartLine > model.getLineCount()) {
				continue
			}

			const range = {
				startLineNumber: normalizedStartLine,
				startColumn: 1,
				endLineNumber: normalizedStartLine,
				endColumn: 1,
			}

			for (const command of this.options.commands) {
				lenses.push({
					range,
					command: {
						id: command.commandId,
						title: command.title,
						arguments: [item],
					},
				})
			}
		}

		return {
			lenses,
			dispose: () => {},
		}
	}

	refresh(): void {
		this.changeEmitter.fire()
	}

	dispose(): void {
		this.changeEmitter.dispose()
	}
}
