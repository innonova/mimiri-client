import { reactive } from 'vue'
import type { HistoryItem } from '../types/mimer-note'
import type { MimiriEditor } from './mimiri-editor'

export interface NoteHistoryState {
	showingHistory: boolean
	selectedHistoryIndex: number
	selectedHistoryItem: HistoryItem | null
}

export class NoteHistory {
	public state: NoteHistoryState

	constructor(private mimiriEditor: MimiriEditor) {
		this.state = reactive({
			showingHistory: false,
			selectedHistoryIndex: 0,
			selectedHistoryItem: null,
		})
	}

	public reset() {
		this.state.showingHistory = false
		this.state.selectedHistoryIndex = 0
		this.mimiriEditor.setHistoryText('')
		this.mimiriEditor.hideHistory()
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
		this.state.selectedHistoryItem = this.mimiriEditor.note?.historyItems[index]
		this.mimiriEditor.setHistoryText(this.state.selectedHistoryItem?.text ?? '')
	}

	public get isShowing() {
		return this.state.showingHistory
	}

	public set isShowing(value: boolean) {
		if (this.state.showingHistory !== value) {
			this.state.showingHistory = value
			if (value) {
				this.mimiriEditor.showHistory()
				void this.checkLoadHistory()
			} else {
				this.mimiriEditor.hideHistory()
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
