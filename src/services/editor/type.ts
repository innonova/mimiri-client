export interface MimiriEditorState {
	canUndo: boolean
	canRedo: boolean
	changed: boolean
	supportedActions: string[]
	mode: string
}

export enum SelectionExpansion {
	LineUp,
	ExpandLeft,
	ShrinkLeft,
	ShrinkRight,
	ExpandRight,
	LineDown,
}

export interface TextEditorListener {
	onSaveRequested()
	onSearchAllRequested()
	onScroll(position: number)
	onPasswordClicked(top: number, left: number, text: string)
	onStateUpdated(state: Omit<MimiriEditorState, 'mode' | 'changed'>)
}

export interface TextEditor {
	show(text: string, scrollTop: number)
	updateText(text: string)
	switchTo(text: string)
	clear()
	resetChanged()
	setHistoryText(text: string)
	hideHistory()
	showHistory()
	undo()
	redo()
	clearSearchHighlights()
	setSearchHighlights(text: string)
	find()
	toggleWordWrap()
	syncSettings()
	expandSelection(type: SelectionExpansion)
	focus()
	selectAll()
	cut()
	copy()
	paste(text: string)
	executeFormatAction(action: string)

	get readonly()
	set readonly(value: boolean)
	get scrollTop(): number
	// get initialText(): string
	get text(): string
	get changed(): boolean
	get supportsWordWrap(): boolean
	get hasOpenDocument(): boolean
}
