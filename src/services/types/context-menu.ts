export interface ContextMenuItem {
	id: string
	title: string
	icon?: string
	shortcut?: string
	separatorAfter?: boolean
	enabled?: boolean
	visible?: boolean
}

export interface ContextMenu {
	items: ContextMenuItem[]
}

export interface ContextMenuPosition {
	x: number
	y: number
	backdropTop?: number
	alignRight?: boolean
}

export interface ContextMenuControl {
	show(position: ContextMenuPosition, conf: ContextMenu, callback: (item: ContextMenuItem) => void)
	close()
}
