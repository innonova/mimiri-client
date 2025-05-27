export interface EditorState {
	text: string
	initialText: string
	canUndo: boolean
	canRedo: boolean
	changed: boolean
	canMarkAsPassword: boolean
	canUnMarkAsPassword: boolean
}

export interface TextEditorListener {
	onSaveRequested()
	onSearchAllRequested()
	onBlur()
	onScroll(position: number)
	onPasswordClicked(top: number, left: number, text: string)
}

export interface TextEditor {}
