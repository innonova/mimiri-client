import { computed } from 'vue'
import { blogManager, updateManager } from '../../global'
import type { MimiriStore } from '../storage/mimiri-store'
import { settingsManager, UpdateMode } from '../settings-manager'
import { dateTimeNow } from './date-time'
import type { Guid } from './guid'
import { MimerNote } from './mimer-note'
import { Note } from './note'
import { differenceInHours } from 'date-fns'

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
		owner: MimiriStore,
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

	public async ensureChildren(_skipUpdateViewModel: boolean = false) {}

	public async refresh() {}
	public async save() {
		throw new Error('Cannot save virtual')
	}

	public async copy(target: MimerNote, _index: number = -1) {
		throw new Error('Cannot copy virtual')
	}

	public async move(target: MimerNote, _index: number = -1) {
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

	public get hasInfo() {
		if (this.id === 'settings-update') {
			return computed(
				() =>
					updateManager.isUpdateAvailable &&
					(settingsManager.updateMode === UpdateMode.StrongNotify ||
						settingsManager.updateMode === UpdateMode.DiscreteNotify),
			)
		}
		if (this.id === 'settings-blog') {
			return computed(() => blogManager.hasNewPost.value && settingsManager.blogPostNotificationLevel !== 'never')
		}
		if (this.id === 'settings-create-account') {
			return computed(
				() =>
					!this.owner.state.flags['create-account-read'] &&
					differenceInHours(new Date(), this.owner.state.created) > 24,
			)
		}
		if (this.id === 'settings-create-password' || this.id === 'settings-account') {
			return computed(() => !this.owner.state.flags['create-account-read'] && this.owner.state.isAnonymous)
		}
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
