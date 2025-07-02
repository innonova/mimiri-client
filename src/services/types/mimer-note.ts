import { computed, reactive } from 'vue'
import type { MimiriStore } from '../storage/mimiri-store'
import { dateTimeNow, type DateTime } from './date-time'
import { type Guid } from './guid'
import type { Note } from './note'
import { fromBase64, toBase64 } from '../hex-base64'
import { persistedState } from '../persisted-state'
import { blogManager, debug, updateManager } from '../../global'
import { settingsManager, UpdateMode } from '../settings-manager'

const zip = async (text: string) => {
	return toBase64(
		await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(),
	)
}
const unzip = async (text: string) => {
	return await new Response(new Blob([fromBase64(text)]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
}

export const controlPanel = {
	createChildren: (owner: MimiriStore, parent: MimerNote) => {
		return [] as MimerNote[]
	},
}

interface History {
	active?: HistoryItem[]
	hotArchive?: HistoryItem[]
	coldArchive?: string[]
}

export interface HistoryItem {
	timestamp: DateTime
	username: string
	text: string
}

export interface NoteViewModel {
	id: Guid
	type: string
	icon: string
	title: string
	text: string
	children: NoteViewModel[]
	history: HistoryItem[]
	expanded: boolean
	shared: boolean
	populated: boolean
	renaming: boolean
	hasMoreHistory: boolean
	isRecycleBin: boolean
	isControlPanel: boolean
	isSystem: boolean
	hasInfo: boolean
}

export class MimerNote {
	public viewModel: NoteViewModel

	private beforeChangeText: string = ''
	private _historyItems: HistoryItem[] = []
	private historyElementsLoaded: number = 0
	private childrenPopulated: boolean = false
	private _children: MimerNote[] = []
	private isUpdatingChildren: boolean = false
	private shouldRerunChildren: boolean = false
	private controlPanelLoadedAfterFeatures: boolean = false

	constructor(
		private owner: MimiriStore,
		private _parent: MimerNote | undefined,
		private _note: Note,
		updateViewModel = true,
	) {
		this.owner.tree.register(_note.id, this)
		this.beforeChangeText = this.text
		if (this.parent) {
			this.viewModel = reactive({
				id: this.id,
				type: this.type,
				icon: this.icon,
				title: this.title,
				text: this.text,
				children: [],
				history: this._historyItems,
				expanded: false,
				shared: this.isShared,
				populated: true,
				renaming: false,
				hasMoreHistory: true,
				isRecycleBin: this.isRecycleBin,
				isControlPanel: this.isControlPanel,
				isSystem: this.isSystem,
				hasInfo: this.hasInfo,
			})
			this._historyItems = this.viewModel.history
		} else {
			this.viewModel = reactive({
				id: this.id,
				type: this.type,
				icon: this.icon,
				title: this.title,
				text: this.text,
				children: [],
				history: this._historyItems,
				expanded: true,
				shared: false,
				populated: true,
				renaming: false,
				hasMoreHistory: true,
				isRecycleBin: this.isRecycleBin,
				isControlPanel: this.isControlPanel,
				isSystem: this.isSystem,
				hasInfo: this.hasInfo,
			})
			this._historyItems = this.viewModel.history
		}
		if (this.isControlPanel) {
			this._children = controlPanel.createChildren(owner, this)
			this.childrenPopulated = true
		}
		if (updateViewModel) {
			this.updateViewModel()
		}
	}

	public async update(note: Note) {
		this.note = note
		this.beforeChangeText = this.text
		if (this.historyElementsLoaded > 0) {
			this.historyElementsLoaded = 0
			this.historyItems = []
		}
		if (this.childrenPopulated) {
			await this.ensureChildren(true)
		}
		this.updateViewModel()
	}

	protected updateViewModel() {
		if (this.viewModel.title !== this.title) {
			this.viewModel.title = this.title
		}
		if (this.viewModel.type !== this.type) {
			this.viewModel.type = this.type
		}
		if (this.viewModel.icon !== this.icon) {
			this.viewModel.icon = this.icon
		}
		if (this.viewModel.text !== this.text) {
			this.viewModel.text = this.text
			this._historyItems = []
			this.viewModel.history = this._historyItems
			this.viewModel.hasMoreHistory = true
		}
		if (this.viewModel.shared !== this.isShared) {
			this.viewModel.shared = this.isShared
		}
		for (const childId of this.childIds) {
			if (!this.viewModel.children.find(c => c.id === childId)) {
				this.viewModel.children.push({
					id: childId,
					type: '',
					icon: '',
					title: 'Loading...',
					text: '',
					children: [],
					history: this._historyItems,
					expanded: false,
					shared: false,
					populated: false,
					renaming: false,
					hasMoreHistory: true,
					isRecycleBin: this.isRecycleBin,
					isControlPanel: this.isControlPanel,
					isSystem: this.isSystem,
					hasInfo: updateManager.isUpdateAvailable && settingsManager.updateMode === UpdateMode.StrongNotify,
				})
			}
		}
		for (const child of this.children) {
			const index = this.viewModel.children.findIndex(c => c.id === child.id)
			if (index >= 0) {
				if (!this.viewModel.children[index].populated) {
					this.viewModel.children[index] = child.viewModel
				}
			} else {
				this.viewModel.children.push(child.viewModel)
			}
		}
		for (let i = this.viewModel.children.length - 1; i >= 0; i--) {
			if (!this.childIds.includes(this.viewModel.children[i].id)) {
				this.viewModel.children.splice(i, 1)
			}
		}

		let outOfOrder = false
		for (let i = 0; i < this.children.length; i++) {
			if (this.children[i].id != this.viewModel.children[i].id) {
				outOfOrder = true
				break
			}
		}
		if (outOfOrder) {
			this.viewModel.children.sort((a, b) => {
				const indexA = this.children.findIndex(child => child.id === a.id)
				const indexB = this.children.findIndex(child => child.id === b.id)
				return indexA - indexB
			})
		}
	}

	public async ensureChildren(skipUpdateViewModel: boolean = false) {
		if (this.isControlPanel) {
			if (this.owner.state.clientConfig && !this.controlPanelLoadedAfterFeatures) {
				this.controlPanelLoadedAfterFeatures = true
				this._children = controlPanel.createChildren(this.owner, this)
			}
			return
		}
		if (this.isUpdatingChildren) {
			this.shouldRerunChildren = true
			return
		}
		this.isUpdatingChildren = true
		while (true) {
			try {
				this.childrenPopulated = true
				const children: MimerNote[] = []
				children.push(...this.children)
				let didChange = false
				const ids = this._note.getItem('metadata').notes
				for (const id of ids) {
					if (!children.find(child => child.id == id)) {
						const note = await this.owner.note.getNote(id)
						if (note) {
							children.push(new MimerNote(this.owner, this, note))
							didChange = true
						}
					}
				}
				for (let i = children.length - 1; i >= 0; i--) {
					if (!ids.includes(children[i].id)) {
						children.splice(i, 1)
						didChange = true
					}
				}
				children.sort((a, b) => {
					const indexA = ids.indexOf(a.id)
					const indexB = ids.indexOf(b.id)
					return indexA - indexB
				})
				if (!didChange) {
					for (let i = 0; i < children.length; i++) {
						if (this.children[i].id != children[i].id) {
							didChange = true
							break
						}
					}
				}

				if (didChange) {
					this._children = children
					if (!skipUpdateViewModel) {
						this.updateViewModel()
					}
				}
			} catch (ex) {
				debug.logError(`Failed to ensure children for note ${this.id}`, ex)
			}

			if (!this.shouldRerunChildren) {
				this.isUpdatingChildren = false
				break
			}
			this.shouldRerunChildren = false
		}
	}

	public static async addHistoryEntry(note: Note, text: string, username: string, timestamp: DateTime) {
		const history: History = note.changeItem('history')
		if (!history.active) {
			history.active = []
		}
		history.active.push({
			timestamp,
			username,
			text,
		})
		while (history.active.length > 10) {
			if (!history.hotArchive) {
				history.hotArchive = []
			}
			history.hotArchive.push(history.active.shift())
			if (history.hotArchive.length > 25) {
				if (!history.coldArchive) {
					history.coldArchive = []
				}
				history.coldArchive.unshift(await zip(JSON.stringify(history.hotArchive)))
				history.hotArchive = []
			}
		}
	}

	public async shareWith(username: string) {
		return this.owner.note.shareMimerNote(this, username)
	}

	public async save() {
		if (this.beforeChangeText !== this.text) {
			await MimerNote.addHistoryEntry(this.note, this.text, this.owner.state.username, dateTimeNow())
		}
		await this.owner.operations.saveNote(this)
	}

	public async expand() {
		if (this.childIds.length > 0) {
			this.viewModel.expanded = true
			persistedState.expand(this)
			if (!this.childrenPopulated) {
				await this.ensureChildren()
			}
		}
	}

	public async collapse() {
		this.viewModel.expanded = false
		persistedState.collapse(this)
	}

	public select() {
		this.owner.tree.select(this.id)
		let current = this.parent
		while (current) {
			current.expand()
			current = current.parent
		}
		persistedState.storeSelectedNote(this)
	}

	public async addChild(name: string = 'New Note') {
		this.childrenPopulated = true
		await this.owner.operations.createMimerNote(this, name)
	}

	public async delete() {
		if (this.parent) {
			await this.owner.operations.delete(this, true)
		} else {
			throw new Error('Cannot delete root')
		}
	}

	public async deleteChildren() {
		await this.ensureChildren()
		for (const child of this.children) {
			await child.delete()
		}
	}

	public async moveToRecycleBin() {
		if (this.parent) {
			if (this.prevSibling) {
				this.prevSibling.select()
			} else if (this.nextSibling) {
				this.nextSibling.select()
			} else {
				this.parent.select()
			}
			if (!this.owner.tree.recycleBin().hasChildren) {
				this.owner.tree.recycleBin().collapse()
			}
			await this.owner.operations.move(
				this.parent.id,
				this.owner.tree.recycleBin().id,
				this,
				-1,
				this.isShareRoot,
				false,
			)
		} else {
			throw new Error('Cannot recycle root')
		}
	}

	public async deleteReference(force: boolean = false) {
		if (this.parent != null) {
			if (!this.isShareRoot && !force) {
				throw new Error(
					'Deleting the reference of this note will leave it without any references, use Delete to delete the note, use force = true to override this check',
				)
			}
			await this.owner.operations.delete(this, false)
		} else {
			throw new Error('Cannot delete root')
		}
	}

	public async copy(target: MimerNote, index: number = -1) {
		if (this.parent != null) {
			await this.owner.operations.copy(target.id, this, index)
		} else {
			throw new Error('Cannot copy root')
		}
	}

	public isAncestorOf(note: MimerNote): boolean {
		let current: MimerNote | null = note
		while (current) {
			if (current.id === this.id) {
				return true
			}
			current = current.parent
		}
		return false
	}

	public async move(target: MimerNote, index: number = -1) {
		if (this.parent != null) {
			if (this.isAncestorOf(target)) {
				throw new Error('Cannot move a note into one of its children')
			}
			await this.owner.operations.move(this.parent.id, target.id, this, index, this.isShareRoot, true)
		} else {
			throw new Error('Cannot move root')
		}
	}

	public async loadHistory() {
		const history: History = this.note.getItem('history')
		if (history.active) {
			const activeReversed = [...history.active]
			activeReversed.reverse()
			if (this.historyElementsLoaded == 0) {
				for (const item of activeReversed) {
					this.historyItems.push(item)
				}
				this.historyElementsLoaded = 1
				this.viewModel.hasMoreHistory = !!history.hotArchive
				return this.viewModel.hasMoreHistory
			}
			if (history.hotArchive && this.historyElementsLoaded == 1) {
				let didAdd = false
				const hotArchiveReversed = [...history.hotArchive]
				hotArchiveReversed.reverse()
				for (const item of hotArchiveReversed) {
					didAdd = true
					this.historyItems.push(item)
				}
				this.historyElementsLoaded = 2
				if (didAdd) {
					this.viewModel.hasMoreHistory = !!history.coldArchive?.length
					return this.viewModel.hasMoreHistory
				}
			}
			if (history.coldArchive && this.historyElementsLoaded >= 2) {
				const coldIndex = this.historyElementsLoaded - 2
				const coldArchive = history.coldArchive
				if (coldIndex < coldArchive.length) {
					for (const item of JSON.parse(await unzip(coldArchive[coldIndex])).reverse()) {
						this.historyItems.push(item)
					}
				}
				this.historyElementsLoaded++
				this.viewModel.hasMoreHistory = coldIndex + 1 < coldArchive.length
				return this.viewModel.hasMoreHistory
			}
		}
		this.viewModel.hasMoreHistory = false
		return this.viewModel.hasMoreHistory
	}

	public async deleteHistory() {
		const history: History = this.note.changeItem('history')
		history.active = undefined
		history.hotArchive = undefined
		history.coldArchive = undefined
		await this.save()
	}

	public async deleteArchivedHistory() {
		const history: History = this.note.changeItem('history')
		history.hotArchive = undefined
		history.coldArchive = undefined
		await this.save()
	}

	public async search(searchTerm: string, callback: (note: MimerNote) => void) {
		if (
			!this.isRoot &&
			(this.text.toUpperCase().includes(searchTerm.toUpperCase()) ||
				this.title.toUpperCase().includes(searchTerm.toUpperCase()))
		) {
			callback(this)
		}
		await this.ensureChildren()
		for (const note of this.children) {
			await note.search(searchTerm, callback)
		}
	}

	public getVersion(type: string) {
		return this.note.getVersion(type)
	}

	public get historyItems() {
		return this._historyItems
	}

	private set historyItems(value) {
		this._historyItems = value
	}

	public get hasMoreHistory() {
		return this.viewModel.hasMoreHistory
	}

	public get isChildrenLoaded() {
		if (!this.isControlPanel && this.note.getItem('metadata').notes.length == 0) {
			return true
		}
		return this.children.length > 0
	}

	public get childIds() {
		if (this.isControlPanel) {
			return this._children.map(c => c.id)
		}
		return this.note.getItem('metadata').notes as Guid[]
	}

	public get children() {
		return this._children
	}

	public get parent() {
		return this._parent
	}

	public get isShared() {
		return this.owner.note.isShared(this.note)
	}

	public get isShareRoot() {
		if (!this.parent) {
			return false
		}
		return this.isShared && this.keyName != this.parent.keyName
	}

	public get ShareRoot() {
		if (this.isShareRoot) {
			return this
		}
		return this.parent.ShareRoot
	}

	public get keyName() {
		return this.note.keyName
	}

	public get isRoot() {
		return !this.parent
	}

	public get isTopLevel() {
		return this.parent?.id === this.owner.tree.root()?.id
	}

	public get hasChildren() {
		if (this.isControlPanel) {
			return true
		}
		return this.note.getItem('metadata').notes.length > 0
	}

	public get id() {
		return this.note.id
	}

	public get note() {
		return this._note
	}

	private set note(value) {
		this._note = value
	}

	public get isSystem() {
		return this.isRecycleBin || this.isControlPanel
	}

	public get isRecycleBin() {
		return !!this.note.getItem('metadata').isRecycleBin
	}

	public get isControlPanel() {
		return !!this.note.getItem('metadata').isControlPanel
	}

	public get hasInfo() {
		if (this.isControlPanel) {
			return computed(
				() =>
					(updateManager.isUpdateAvailable && settingsManager.updateMode === UpdateMode.StrongNotify) ||
					(blogManager.hasNewPost.value && settingsManager.blogPostNotificationLevel === 'clearly'),
			)
		}
		return false
	}

	public get isInRecycleBin() {
		if (this.isRecycleBin || this.isSystem) {
			return false
		}
		let current = this.parent
		while (current) {
			if (current.isRecycleBin) {
				return true
			}
			current = current.parent
		}
		return false
	}

	public get type(): string {
		if (this.isRecycleBin) {
			return 'recycle-bin'
		}
		if (this.isControlPanel) {
			return 'settings-about'
		}
		return 'note-text'
	}

	public get icon(): string {
		if (this.isRecycleBin) {
			return 'recycle-bin'
		}
		if (this.isControlPanel) {
			return 'cog'
		}
		return 'note'
	}

	public get title() {
		if (this.isRecycleBin) {
			return 'Recycle Bin'
		}
		if (this.isControlPanel) {
			return 'System'
		}
		return this.note.getItem('metadata').title as string
	}

	public set title(value: string) {
		if (!this.isSystem) {
			this.note.changeItem('metadata').title = value
		}
	}

	public get text() {
		return (this.note.getItem('text').text as string) ?? ''
	}

	public set text(value: string) {
		this.note.changeItem('text').text = value
	}

	public get index() {
		return this.parent.childIds.indexOf(this.id)
	}

	public get expanded() {
		return this.viewModel.expanded
	}

	public get prevSibling() {
		if (this.parent !== null) {
			if (this.index > 0) {
				return this.parent.children[this.index - 1]
			}
		}
		return undefined
	}

	public get nextSibling() {
		if (this.parent !== null) {
			if (this.index < this.parent.children.length + 1) {
				return this.parent.children[this.index + 1]
			}
		}
		return undefined
	}

	public get created() {
		if (!this.note.getItem('metadata').created) {
			if (this.note.has('history')) {
				const history = this.note.getItem('history')
				if (history.active) {
					this.note.changeItem('metadata').created = history.active[0].timestamp
				}
			}
			if (!this.note.getItem('metadata').created) {
				this.note.changeItem('metadata').created = dateTimeNow()
			}
		}
		return this.note.getItem('metadata').created
	}

	public get updated() {
		if (this.note.has('history')) {
			const history = this.note.getItem('history')
			if (history.active) {
				return history.active[history.active.length - 1].timestamp
			}
		}
		return this.created
	}

	public get size() {
		return this.note.size
	}

	public get historySize() {
		return this.note.historySize
	}

	public get dataSize() {
		return this.note.dataSize
	}

	public get scrollTop() {
		return persistedState.getScrollTop(this)
	}

	public set scrollTop(value: number) {
		persistedState.setScrollTop(this, value)
	}

	public get path() {
		if (this.parent && !this.parent.isRoot) {
			return `${this.parent.path}/${this.title}`
		}
		return `/${this.title}`
	}
}
