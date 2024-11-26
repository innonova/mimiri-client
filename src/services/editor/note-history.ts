import { reactive } from 'vue'
import type { MimiriEditor } from './mimiri-editor'
import { editor } from 'monaco-editor'

export interface NoteHistoryState {
	showingHistory: boolean
	selectedHistoryIndex: number
}

export class NoteHistory {
	public state: NoteHistoryState
	private monacoEditorHistoryModel: editor.ITextModel

	constructor(private mimiriEditor: MimiriEditor) {
		this.state = reactive({
			showingHistory: false,
			selectedHistoryIndex: 0,
		})
		this.monacoEditorHistoryModel = editor.createModel('', 'mimiri')
	}

	public reset() {
		this.state.showingHistory = false
		this.state.selectedHistoryIndex = 0
		this.monacoEditorHistoryModel.setValue('')
		this.mimiriEditor.resetModel()
	}

	public async loadMoreHistory() {
		if (this.mimiriEditor.note) {
			await this.mimiriEditor.note.loadHistory()
		}
	}

	public async checkLoadHistory() {
		if (this.mimiriEditor.note) {
			if (this.mimiriEditor.note.historyItems.length === 0) {
				await this.mimiriEditor.note.loadHistory()
			}
			this.selectHistoryItem(this.state.selectedHistoryIndex)
		}
	}

	public selectHistoryItem(index: number) {
		this.state.selectedHistoryIndex = index
		this.monacoEditorHistoryModel.setValue(this.mimiriEditor.note?.historyItems[index]?.text ?? '')
	}

	public get isShowing() {
		return this.state.showingHistory
	}

	public set isShowing(value: boolean) {
		if (this.state.showingHistory !== value) {
			this.state.showingHistory = value
			if (value) {
				this.mimiriEditor.displayModel(this.monacoEditorHistoryModel, true)
				void this.checkLoadHistory()
			} else {
				this.mimiriEditor.resetModel()
			}
		}
	}

	public get historyItems() {
		return this.mimiriEditor.note?.historyItems ?? []
	}

	public get hasMoreHistory() {
		return this.mimiriEditor.note.viewModel.hasMoreHistory
	}
}
