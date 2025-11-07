export interface EditorPlugin {
	executeFormatAction(action: string): boolean
	show(): void
	updateText(): void
	get active(): boolean
	set active(value: boolean)
}
