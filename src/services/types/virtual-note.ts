import type { NoteManager } from '../note-manager'
import { dateTimeNow } from './date-time'
import type { Guid } from './guid'
import { MimerNote } from './mimer-note'
import { Note } from './note'

export interface VirtualTree {
	id: Guid
	type: string
	title: string
	icon: string
	children: VirtualTree[]
}

export class VirtualNote extends MimerNote {
	private _vChildren: MimerNote[] = []

	constructor(
		owner: NoteManager,
		parent: MimerNote | undefined,
		private _tree: VirtualTree,
	) {
		const note = new Note()
		note.id = _tree.id
		super(owner, parent, note, false)
		for (const child of _tree.children) {
			this._vChildren.push(new VirtualNote(owner, this, child))
		}
		this.updateViewModel()
	}

	public async ensureChildren(skipUpdateViewModel: boolean = false) {}

	public async refresh() {}
	public async save() {
		throw new Error('Cannot save virtual')
	}

	public async copy(target: MimerNote, index: number = -1) {
		throw new Error('Cannot copy virtual')
	}

	public async move(target: MimerNote, index: number = -1) {
		throw new Error('Cannot move virtual')
	}

	public get type() {
		return this._tree?.type ?? 'none'
	}

	public get hasChildren() {
		return false
	}

	public get isChildrenLoaded() {
		return true
	}

	public get childIds() {
		return this._vChildren.map(c => c.id)
	}

	public get children() {
		return this._vChildren
	}

	public get isSystem() {
		return true
	}

	public get isShared() {
		return false
	}

	public get isShareRoot() {
		return false
	}

	public get title() {
		return this._tree?.title
	}

	public set title(value: string) {}

	public get created() {
		return dateTimeNow()
	}

	public get updated() {
		return dateTimeNow()
	}

	public get icon(): string {
		return this._tree?.icon ?? 'cog'
	}
}
