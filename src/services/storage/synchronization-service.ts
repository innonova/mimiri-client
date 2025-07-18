import { emptyGuid, newGuid, type Guid } from '../types/guid'
import type { KeySyncAction, NoteSyncAction } from '../types/requests'
import { AccountType, type KeyData, type NoteData, type NoteItem, type SharedState } from './type'
import type { CryptographyManager } from './cryptography-manager'
import type { MimiriDb } from './mimiri-db'
import type { MimiriClient } from './mimiri-client'
import { delay } from '../helpers'
import {
	ConflictResolver,
	type MergeableHistoryItem,
	type MergeableMetadataItem,
	type MergeableNote,
	type MergeableTextItem,
} from './conflict-resolver'
import type { NoteTreeManager } from './note-tree-manager'
import { inconsistencyDialog, syncStatus } from '../../global'
import type { LocalStateManager } from './local-state-manager'

export class SynchronizationService {
	private _conflictResolver: ConflictResolver = new ConflictResolver()
	private _syncInProgress = false
	private _syncRequestedWhileInProgress = false
	private _baseDelayMs = 1000 // 1 second base delay
	private _maxDelayMs = 300000 // 5 minutes max delay
	private _waitingForSync: ((success: boolean) => void)[] = []
	private _initializing: boolean = false
	private _initialized: boolean = false
	private _issuedSyncIds: string[] = []

	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private cryptoManager: CryptographyManager,
		private localStateManager: LocalStateManager,
		private state: SharedState,
		private treeManager: NoteTreeManager,
		private noteUpdatedCallback: (noteId: Guid) => Promise<void>,
	) {}

	private get canSync(): boolean {
		return this.state.isOnline && !this.state.workOffline && this.state.accountType === AccountType.Cloud
	}

	public async initialSync(): Promise<void> {
		if (!this.state.workOffline && this.state.accountType === AccountType.Cloud) {
			if (!this._initializing) {
				this._initializing = true
				try {
					await this.syncPull()
					this._initialized = true
				} finally {
					this._initializing = false
				}
			}
		} else {
			console.log('SynchronizationService.initialSync() skipped due to work offline or local account type')
		}
	}

	public async sync(shouldCheckConsistency: boolean = false) {
		if (!this._initialized || !this.canSync) {
			return
		}
		if (!this._syncInProgress) {
			this._syncInProgress = true
			try {
				let syncFailed = false
				let retryCount = 0
				do {
					if (syncFailed) {
						const delayMs = Math.min(this._baseDelayMs * Math.pow(2, retryCount), this._maxDelayMs)
						console.log(`Synchronization failed. Retrying in ${delayMs}ms (attempt ${retryCount + 1})`)
						await delay(delayMs)
						retryCount++
					}
					syncFailed = false
					this._syncRequestedWhileInProgress = false
					try {
						if (!this._initialized || !this.state.isOnline) {
							for (const resolve of this._waitingForSync) {
								resolve(false)
							}
							return
						}
						const { keyChanges, noteChanges } = await this.syncPull(true)
						if (keyChanges) {
							await this.cryptoManager.loadAllKeys()
						}
						let didPush = false
						if (await this.syncPush()) {
							didPush = true
							await this.syncPull(true)
						}
						if (shouldCheckConsistency && (noteChanges || didPush)) {
							if (await this.checkForConsistency()) {
								inconsistencyDialog.value.show()
							}
						}
					} catch (error) {
						syncFailed = true
						console.error('Synchronization error:', error)
					}
				} while ((this._syncRequestedWhileInProgress || syncFailed) && !this.state.workOffline)
			} finally {
				this._syncInProgress = false
				for (const resolve of this._waitingForSync) {
					resolve(true)
				}
				this._waitingForSync = []
			}
		} else {
			console.log('Synchronization already in progress, queuing sync request')
			this._syncRequestedWhileInProgress = true
		}
	}

	public queueSync(shouldCheckConsistency: boolean = false): void {
		console.log('SynchronizationService.queueSync() called', this._initialized, this.canSync)
		if (!this._initialized && this.canSync) {
			void this.initialSync().then(() => {
				void this.sync(shouldCheckConsistency)
			})
			return
		}
		if (!this._initialized || !this.canSync) {
			console.log(
				'SynchronizationService.queueSync() ignored',
				this._initialized,
				this.state.isLoggedIn,
				this.state.isOnline,
				this.state.accountType,
			)
			return
		}
		void this.sync(shouldCheckConsistency)
	}

	waitForSync(timeoutMs?: number): Promise<boolean> {
		if (
			!this._initialized ||
			!this.state.isOnline ||
			this.state.accountType === AccountType.Local ||
			this.state.accountType === AccountType.None
		) {
			return Promise.resolve(false)
		}
		if (!this._syncInProgress) {
			return Promise.resolve(true)
		} else {
			return new Promise<boolean>(resolve => {
				let timeoutId: NodeJS.Timeout | undefined

				const wrappedResolve = (success: boolean) => {
					cleanup()
					resolve(success)
				}

				const cleanup = () => {
					if (timeoutId) {
						clearTimeout(timeoutId)
					}
					const index = this._waitingForSync.indexOf(wrappedResolve)
					if (index > -1) {
						this._waitingForSync.splice(index, 1)
					}
				}

				if (timeoutMs > 0) {
					timeoutId = setTimeout(() => {
						cleanup()
						resolve(false)
					}, timeoutMs)
				}

				this._waitingForSync.push(wrappedResolve)
			})
		}
	}

	private async syncPull(pushUpdates: boolean = false): Promise<{ noteChanges: boolean; keyChanges: boolean }> {
		syncStatus.value = 'retrieving-changes'
		let noteChanges = false
		let keyChanges = false
		const lastSync = await this.db.getLastSync()

		let nextNoteSync = lastSync?.lastNoteSync ?? 0
		let nextKeySync = lastSync?.lastKeySync ?? 0
		let changes = await this.api.getChangesSince(nextNoteSync, nextKeySync)

		this.state.userStats.size = +changes.size
		this.state.userStats.noteCount = +changes.noteCount
		this.state.userStats.maxTotalBytes = +changes.maxTotalBytes
		this.state.userStats.maxNoteBytes = +changes.maxNoteBytes
		this.state.userStats.maxNoteCount = +changes.maxNoteCount

		const updatedNoteIds: Guid[] = []

		for (let i = 0; i < 100; i++) {
			let syncChanged = false
			await this.db.syncLock.withLock(
				'syncPull',
				async () => {
					for (const key of changes.keys) {
						if (+key.sync > nextKeySync) {
							nextKeySync = +key.sync
							syncChanged = true
						}
						const data = JSON.parse(key.data) as KeyData
						await this.db.setKey({
							id: key.id,
							userId: data.userId,
							name: key.name,
							algorithm: data.algorithm,
							asymmetricAlgorithm: data.asymmetricAlgorithm,
							keyData: data.keyData,
							publicKey: data.publicKey,
							privateKey: data.privateKey,
							metadata: data.metadata,
							modified: key.modified,
							created: key.created,
							sync: key.sync,
						})
						keyChanges = true
					}

					for (const noteId of changes.deletedNotes) {
						await this.db.deleteNote(noteId)
					}

					for (const note of changes.notes) {
						if (+note.sync > nextNoteSync) {
							nextNoteSync = +note.sync
							syncChanged = true
						}
						await this.db.setNote({
							id: note.id,
							keyName: note.keyName,
							modified: note.modified,
							created: note.created,
							sync: note.sync,
							size: note.size,
							items: note.items.map(item => ({
								version: item.version,
								type: item.itemType,
								data: item.data,
								modified: item.modified,
								created: item.created,
								size: item.size,
							})),
						})
						noteChanges = true
						updatedNoteIds.push(note.id)
					}
				},
				'exclusive',
			)
			if (!syncChanged) {
				break
			}
			await this.db.setLastSync(nextNoteSync, nextKeySync)
			changes = await this.api.getChangesSince(nextNoteSync, nextKeySync)
		}

		if (pushUpdates) {
			for (const noteId of updatedNoteIds) {
				console.log(`Note ${noteId} updated during sync pull`)
				await this.noteUpdatedCallback(noteId)
			}
		}
		syncStatus.value = 'idle'
		return { noteChanges, keyChanges }
	}

	private async mergeIfNeeded(
		baseNote: NoteData,
		localNote: NoteData,
		remoteNote: NoteData,
	): Promise<NoteData | undefined> {
		let differenceFound = remoteNote.items.length !== baseNote.items.length
		if (!differenceFound) {
			for (const item of remoteNote.items) {
				const baseItem = baseNote.items.find(i => i.type === item.type)
				if (!baseItem || baseItem.version !== item.version) {
					differenceFound = true
					break
				}
			}
		}

		if (differenceFound) {
			const local: MergeableNote = {
				items: await Promise.all(
					localNote.items.map(async item => ({
						type: item.type,
						data: JSON.parse(await this.cryptoManager.localCrypt.decrypt(item.data)),
					})),
				),
			}

			const remoteKeySet = await this.cryptoManager.getKeyByName(remoteNote.keyName)
			const remote: MergeableNote = {
				items: await Promise.all(
					remoteNote.items.map(async item => ({
						type: item.type,
						data: JSON.parse(await remoteKeySet.symmetric.decrypt(item.data)),
					})),
				),
			}
			const baseKeySet = await this.cryptoManager.getKeyByName(baseNote.keyName)
			const base: MergeableNote = {
				items: await Promise.all(
					baseNote.items.map(async item => ({
						type: item.type,
						data: JSON.parse(await baseKeySet.symmetric.decrypt(item.data)),
					})),
				),
			}

			const merged = this._conflictResolver.resolveConflict(base, local, remote)
			const resultNote = await this.db.getLocalNote(localNote.id)

			for (const mergedItem of merged.items) {
				const resultItem = resultNote.items.find(i => i.type === mergedItem.type)
				const remoteItem = remoteNote.items.find(i => i.type === mergedItem.type)
				if (mergedItem.type === 'text') {
					const mergedTextItem = mergedItem as MergeableTextItem
					if (resultItem) {
						const resultData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(resultItem.data))
						resultData.text = mergedTextItem.data.text
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(resultData))
						resultItem.version = remoteItem?.version ?? 0
					} else if (remoteItem) {
						const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
						remoteData.text = mergedTextItem.data.text
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
						resultItem.version = remoteItem.version
					}
				}
				if (mergedItem.type === 'metadata') {
					const mergedMetadataItem = mergedItem as MergeableMetadataItem
					if (resultItem) {
						const resultData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(resultItem.data))
						resultData.notes = mergedMetadataItem.data.notes
						resultData.title = mergedMetadataItem.data.title
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(resultData))
						resultItem.version = remoteItem?.version ?? 0
					} else if (remoteItem) {
						const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
						remoteData.notes = mergedMetadataItem.data.notes
						remoteData.title = mergedMetadataItem.data.title
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
						resultItem.version = remoteItem.version
					}
				}
				if (mergedItem.type === 'history') {
					const mergedHistoryItem = mergedItem as MergeableHistoryItem
					if (resultItem) {
						const resultData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(resultItem.data))
						resultData.active = mergedHistoryItem.data.active
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(resultData))
						resultItem.version = remoteItem?.version ?? 0
					} else if (remoteItem) {
						const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
						remoteData.active = mergedHistoryItem.data.active
						resultItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
						resultItem.version = remoteItem.version
					}
				}
			}
			return resultNote
		}
		return undefined
	}

	private async decryptNoteItemData(keyName: Guid, item: NoteItem) {
		const keySet = this.cryptoManager.getKeyByName(keyName)
		if (!keySet) {
			throw new Error(`Key not found: ${keyName}`)
		}
		return this.cryptoManager.tryDecryptNoteItemText(item, keySet.symmetric)
	}

	private async decryptLocalNoteItemData(item: NoteItem) {
		return this.cryptoManager.tryDecryptNoteItemText(item, this.cryptoManager.localCrypt)
	}

	private async encryptData(keyName: Guid, data: string) {
		const keySet = this.cryptoManager.getKeyByName(keyName)
		if (!keySet) {
			throw new Error(`Key not found: ${keyName}`)
		}
		return keySet.symmetric.encrypt(data)
	}

	private isSizeAllowedOnServer(): boolean {
		return this.state.userStats.size + this.state.userStats.localSizeDelta <= this.state.userStats.maxTotalBytes
	}

	private isCountAllowedOnServer(): boolean {
		return (
			this.state.userStats.noteCount + this.state.userStats.localNoteCountDelta <= this.state.userStats.maxNoteCount
		)
	}

	private async syncPush(): Promise<boolean> {
		console.log('SynchronizationService.syncPush() called')
		syncStatus.value = 'sending-changes'
		if (!this.isSizeAllowedOnServer()) {
			syncStatus.value = 'total-size-limit-exceeded'
			return false
		}

		if (!this.isCountAllowedOnServer()) {
			syncStatus.value = 'count-limit-exceeded'
			return false
		}

		const noteActions: NoteSyncAction[] = []
		const keyActions: KeySyncAction[] = []

		let localSizeDelta = 0
		let localNoteCountDelta = 0
		let localSize = 0
		let localNoteCount = 0

		let localNotes: NoteData[]
		let localKeys: KeyData[]
		let deletedNotes: Guid[]
		let deletedKeys: Guid[]

		await this.db.syncLock.withLock('syncPush', async () => {
			localNotes = await this.db.getAllLocalNotes()
			for (const localNote of localNotes) {
				let keyMode = 'same'
				let targetKeyName = localNote.keyName
				const remoteNote = await this.db.getNote(localNote.id)
				if (remoteNote && remoteNote.keyName !== localNote.keyName) {
					if (localNote.base.keyName === remoteNote.keyName) {
						keyMode = 'switch'
					}
					if (localNote.base.keyName === localNote.keyName) {
						keyMode = 'switch'
						targetKeyName = remoteNote.keyName
					}
				}
				if (remoteNote) {
					const mergedNote = (await this.mergeIfNeeded(localNote.base, localNote, remoteNote)) ?? localNote

					const action: NoteSyncAction = {
						type: 'update',
						id: mergedNote.id,
						keyName: mergedNote.keyName,
						items: [],
					}
					for (const mergedItem of mergedNote.items) {
						const remoteItem = remoteNote?.items.find(item => item.type === mergedItem.type)
						const localItemData = await this.decryptLocalNoteItemData(mergedItem)

						if (
							keyMode === 'switch' ||
							mergedItem.version === 0 ||
							localItemData !== (await this.decryptNoteItemData(remoteNote.keyName, remoteItem))
						) {
							const data = await this.encryptData(targetKeyName, localItemData)
							if (data.length > this.state.userStats.maxNoteBytes) {
								syncStatus.value = 'note-size-limit-exceeded'
								return false
							}
							action.items.push({
								version: mergedItem.version,
								type: mergedItem.type,
								data,
							})
						}
					}
					if (action.items.length > 0) {
						noteActions.push(action)
					} else {
						// local note is identical to remote note, delete local note
						await this.db.deleteLocalNote(mergedNote.id)
					}
				} else {
					if (localNote.base) {
						console.log('Restoring remotely deleted note', localNote.id)
					}
					const action: NoteSyncAction = {
						type: 'create',
						id: localNote.id,
						keyName: localNote.keyName,
						items: [],
					}
					for (const item of localNote.items) {
						const data = await this.cryptoManager.tryReencryptNoteItemDataFromLocal(item, localNote.keyName)
						if (data.length > this.state.userStats.maxNoteBytes) {
							syncStatus.value = 'note-size-limit-exceeded'
							return false
						}
						action.items.push({
							version: 0,
							type: item.type,
							data,
						})
					}
					if (action.items.length > 0) {
						noteActions.push(action)
					}
				}
			}

			localKeys = await this.db.getAllLocalKeys()
			for (const localKey of localKeys) {
				const action: KeySyncAction = {
					type: 'create',
					id: localKey.id,
					name: localKey.name,
					data: JSON.stringify({
						id: localKey.id,
						userId: this.state.userId,
						name: localKey.name,
						algorithm: localKey.algorithm,
						asymmetricAlgorithm: localKey.asymmetricAlgorithm,
						keyData: await this.cryptoManager.rootCrypt.encryptBytes(
							await this.cryptoManager.localCrypt.decryptBytes(localKey.keyData),
						),
						publicKey: await localKey.publicKey,
						privateKey: await this.cryptoManager.rootCrypt.encrypt(
							await this.cryptoManager.localCrypt.decrypt(localKey.privateKey),
						),
						metadata: await this.cryptoManager.rootCrypt.encrypt(
							await this.cryptoManager.localCrypt.decrypt(localKey.metadata),
						),
					}),
				}
				keyActions.push(action)
			}

			deletedNotes = await this.db.getAllDeletedNotes()
			for (const noteId of deletedNotes) {
				noteActions.push({
					type: 'delete',
					keyName: emptyGuid(),
					id: noteId,
					items: [],
				})
			}

			deletedKeys = await this.db.getAllDeletedKeys()
			for (const keyId of deletedKeys) {
				keyActions.push({
					type: 'delete',
					id: keyId,
					name: emptyGuid(),
					data: '',
				})
			}

			console.log('Note actions:', noteActions)

			if (noteActions.length === 0 && keyActions.length === 0) {
				return false
			}

			localSizeDelta = this.state.userStats.localSizeDelta
			localNoteCountDelta = this.state.userStats.localNoteCountDelta
			localSize = this.state.userStats.localSize
			localNoteCount = this.state.userStats.localNoteCount
		})

		const syncId = newGuid()
		this._issuedSyncIds.push(syncId)
		if (this._issuedSyncIds.length > 25) {
			this._issuedSyncIds.shift()
		}

		if (noteActions.length === 0 && keyActions.length === 0) {
			syncStatus.value = 'idle'
			return true
		}

		const status = await this.api.syncPushChanges(noteActions, keyActions, syncId)

		if (status !== 'success') {
			syncStatus.value = 'error'
			return false
		}

		await this.db.syncLock.withLock('syncPush', async () => {
			for (const localNote of localNotes) {
				const current = await this.db.getLocalNote(localNote.id)
				if (!current) {
					continue
				}
				let differenceFound = current.items.length !== localNote.items.length
				if (!differenceFound) {
					for (const localItem of localNote.items) {
						const currentItem = current.items.find(i => i.type === localItem.type)
						if (!currentItem || currentItem.data !== localItem.data) {
							differenceFound = true
							break
						}
					}
				}
				if (!differenceFound) {
					await this.db.deleteLocalNote(localNote.id)
				}
			}
			for (const localKey of localKeys) {
				await this.db.deleteLocalKey(localKey.id)
			}
			for (const deletedNoteId of deletedNotes) {
				await this.db.deleteNote(deletedNoteId)
				await this.db.clearDeleteRemoteNote(deletedNoteId)
			}
			for (const deletedKeyId of deletedKeys) {
				await this.db.clearDeleteRemoteKey(deletedKeyId)
			}
		})

		// TODO need to refresh all changed notes in the tree manager

		this.state.userStats.localSizeDelta -= localSizeDelta
		this.state.userStats.localNoteCountDelta -= localNoteCountDelta
		this.state.userStats.localSize -= localSize
		this.state.userStats.localNoteCount -= localNoteCount

		await this.localStateManager.updateLocalSizeData()

		syncStatus.value = 'idle'

		console.log('SynchronizationService.syncPush() completed successfully')

		return true
	}

	private async getConsistencyData(): Promise<{
		allNotes: NoteData[]
		deletedNotes: Guid[]
		parents: { [key: Guid]: { id: Guid; modified: string }[] }
	}> {
		const allNotes = await this.db.getAllNotes()
		const deletedNotes = await this.db.getAllDeletedNotes()
		const parents: { [key: Guid]: { id: Guid; modified: string }[] } = {}

		for (const note of allNotes) {
			if (deletedNotes.includes(note.id)) {
				continue
			}
			const metadata = note.items.find(item => item.type === 'metadata')
			if (metadata) {
				const data = JSON.parse(await this.decryptNoteItemData(note.keyName, metadata)) as { notes: Guid[] }
				for (const childId of data.notes) {
					if (parents[childId]) {
						parents[childId].push({ id: note.id, modified: metadata.modified })
					} else {
						parents[childId] = [{ id: note.id, modified: metadata.modified }]
					}
				}
			}
		}
		return {
			allNotes,
			deletedNotes,
			parents,
		}
	}

	public async checkForConsistency(): Promise<boolean> {
		if (await this.scanForConsistency()) {
			await this.syncPush()
			return true
		}
		return false
	}

	public async detectConsistencyIssues(): Promise<boolean> {
		const { allNotes, deletedNotes, parents } = await this.getConsistencyData()

		for (const note of allNotes) {
			if (deletedNotes.includes(note.id)) {
				continue
			}
			if (!parents[note.id]) {
				return true
			}
		}

		return Object.keys(parents)
			.map(key => parents[key])
			.some(parentIds => parentIds.length > 1)
	}

	private async scanForConsistency(): Promise<boolean> {
		let correctedIssues = false
		const { allNotes, deletedNotes, parents } = await this.getConsistencyData()

		const idsWithoutParent: Guid[] = []
		for (const note of allNotes) {
			if (deletedNotes.includes(note.id)) {
				continue
			}
			if (!parents[note.id]) {
				idsWithoutParent.push(note.id)
			}
		}

		const ensureLineage = async (id: Guid): Promise<void> => {
			let currentId = id
			while (parents[currentId] && parents[currentId].length > 0) {
				if (currentId !== this.treeManager.root?.id) {
					await this.treeManager.getNoteById(currentId)?.ensureChildren()
				}
				currentId = parents[currentId][0].id
			}
		}

		for (const id of Object.keys(parents) as Guid[]) {
			if (parents[id].length > 1) {
				console.log(`Note ${id} has multiple parents:`, parents[id])
				if (this.treeManager.root) {
					await this.treeManager.root.ensureChildren()
					parents[id].sort((a, b) => new Date(a.modified).getTime() - new Date(b.modified).getTime())
					for (let i = 1; i < parents[id].length; i++) {
						const parentId = parents[id][i].id
						await ensureLineage(parentId)
						const parentNote = this.treeManager.getNoteById(parentId)
						const index = parentNote.note.changeItem('metadata').notes.indexOf(id)
						parentNote.note.changeItem('metadata').notes.splice(index, 1)
						console.log(`Removing duplicate parent ${parentId} for note ${id}`)
						await parentNote.save()
						await parentNote.ensureChildren()
						correctedIssues = true
					}
				}
			}
		}

		if (idsWithoutParent.length > 0) {
			await this.treeManager.root?.ensureChildren()
			if (this.treeManager.recycleBin) {
				let addedItems = false
				for (const id of idsWithoutParent) {
					if (id === this.treeManager.root?.id) {
						continue
					}
					console.log(`Note ${id} has no parent, adding to recycle bin`)
					const item = await this.db.getNote(id)
					const data = JSON.parse(await this.decryptNoteItemData(item.keyName, item.items[0]))
					if (data.isRecycleBin) {
						if (data.id !== this.treeManager.recycleBin.id) {
							await this.db.deleteRemoteNote(id)
						}
					} else if (data.isControlPanel) {
						if (data.id !== this.treeManager.controlPanelId) {
							await this.db.deleteRemoteNote(id)
						}
					} else {
						this.treeManager.recycleBin.note.changeItem('metadata').notes.push(id)
						addedItems = true
					}
				}
				if (addedItems) {
					await this.treeManager.recycleBin.save()
					correctedIssues = true
				}
			}
		}
		return correctedIssues
	}

	public isSyncIdIssued(syncId: string): boolean {
		return this._issuedSyncIds.includes(syncId)
	}
}
