export interface EditorState {
	canUndo: boolean
	canRedo: boolean
	changed: boolean
	canMarkAsPassword: boolean
	canUnMarkAsPassword: boolean
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
	onEditorBlur()
	onScroll(position: number)
	onPasswordClicked(top: number, left: number, text: string)
	onStateUpdated(state: Omit<EditorState, 'mode'>)
}

export interface TextEditor {
	show(text: string, scrollTop: number)
	updateText(text: string)
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
	syncSettings()
	expandSelection(type: SelectionExpansion)
	focus()
	selectAll()
	cut()
	copy()
	paste(text: string)
	unMarkSelectionAsPassword()
	markSelectionAsPassword()

	get readonly()
	set readonly(value: boolean)
	get scrollTop(): number
	get text()
}
