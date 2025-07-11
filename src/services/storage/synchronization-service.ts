import { emptyGuid, newGuid, type Guid } from '../types/guid'
import type { KeySyncAction, NoteSyncAction } from '../types/requests'
import { AccountType, type KeyData, type NoteData, type SharedState } from './type'
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

export class SynchronizationService {
	private _conflictResolver: ConflictResolver = new ConflictResolver()
	private _syncInProgress = false
	private _syncRequestedWhileInProgress = false
	private _baseDelayMs = 1000 // 1 second base delay
	private _maxDelayMs = 300000 // 5 minutes max delay
	private _waitingForSync: ((success: boolean) => void)[] = []
	private _initialized: boolean = false
	private _issuedSyncIds: string[] = []

	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private cryptoManager: CryptographyManager,
		private state: SharedState,
		private noteUpdatedCallback: (noteId: Guid) => Promise<void>,
	) {}

	public async initialSync(): Promise<void> {
		if (!this.state.workOffline && this.state.accountType === AccountType.Cloud) {
			await this.syncPull()
			this._initialized = true
		}
	}

	public async sync() {
		if (
			!this._initialized ||
			!this.state.isOnline ||
			this.state.accountType === AccountType.Local ||
			this.state.accountType === AccountType.None
		) {
			return
		}
		if (!this._syncInProgress) {
			this._syncInProgress = true
			try {
				let syncFailed = false
				let retryCount = 0
				do {
					console.log('do')

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
						await this.syncPull(true)
						if (await this.syncPush()) {
							await this.syncPull(true)
						}
						retryCount = 0
					} catch (error) {
						syncFailed = true
						console.error('Synchronization error:', error)
					}
					console.log('while', this._syncRequestedWhileInProgress, syncFailed)
				} while (this._syncRequestedWhileInProgress || syncFailed)
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

	public queueSync(): void {
		console.log('SynchronizationService.queueSync() called')

		if (
			!this._initialized ||
			!this.state.isLoggedIn ||
			!this.state.isOnline ||
			this.state.accountType === AccountType.Local ||
			this.state.accountType === AccountType.None
		) {
			return
		}
		void this.sync()
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
				let timeoutId: any

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

	private async syncPull(pushUpdates: boolean = false): Promise<void> {
		const lastSync = await this.db.getLastSync()

		let nextNoteSync = lastSync?.lastNoteSync ?? 0
		let nextKeySync = lastSync?.lastKeySync ?? 0
		let changes = await this.api.getChangesSince(nextNoteSync, nextKeySync)

		this.state.userStats.size = +changes.size
		this.state.userStats.noteCount = +changes.noteCount

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
						this.db.setKey({
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
					}
					for (const note of changes.notes) {
						if (+note.sync > nextNoteSync) {
							nextNoteSync = +note.sync
							syncChanged = true
						}
						this.db.setNote({
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
				await this.noteUpdatedCallback(noteId)
			}
		}
	}

	private async syncPush(): Promise<boolean> {
		console.log('SynchronizationService.syncPush() called')

		const noteActions: NoteSyncAction[] = []
		const keyActions: KeySyncAction[] = []

		let localSizeDelta = 0
		let localNoteCountDelta = 0
		let localSize = 0
		let localNoteCount = 0

		let localNotes: NoteData[]
		let originalLocalNotes: NoteData[]
		let localKeys: KeyData[]
		let deletedNotes: Guid[]
		let deletedKeys: Guid[]

		await this.db.syncLock.withLock('syncPush', async () => {
			localNotes = await this.db.getAllLocalNotes()
			// TODO do something less wasteful
			originalLocalNotes = await this.db.getAllLocalNotes()
			for (const localNote of localNotes) {
				const keySet = this.cryptoManager.getKeyByName(localNote.keyName)
				const remoteNote = await this.db.getNote(localNote.id)
				const baseNote = localNote.base
				if (remoteNote) {
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

						for (const mergedItem of merged.items) {
							const localItem = localNote.items.find(i => i.type === mergedItem.type)
							const remoteItem = remoteNote.items.find(i => i.type === mergedItem.type)
							if (mergedItem.type === 'text') {
								const textItem = mergedItem as MergeableTextItem
								if (localItem) {
									const localData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(localItem.data))
									localData.text = textItem.data.text
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(localData))
									localItem.version = remoteItem?.version ?? 0
								} else if (remoteItem) {
									const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
									remoteData.text = textItem.data.text
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
									localItem.version = remoteItem.version
								}
							}
							if (mergedItem.type === 'metadata') {
								const metadataItem = mergedItem as MergeableMetadataItem
								if (localItem) {
									const localData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(localItem.data))
									localData.notes = metadataItem.data.notes
									localData.title = metadataItem.data.title
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(localData))
									localItem.version = remoteItem?.version ?? 0
								} else if (remoteItem) {
									const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
									remoteData.notes = metadataItem.data.notes
									remoteData.title = metadataItem.data.title
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
									localItem.version = remoteItem.version
								}
							}
							if (mergedItem.type === 'history') {
								const historyItem = mergedItem as MergeableHistoryItem
								if (localItem) {
									const localData = JSON.parse(await this.cryptoManager.localCrypt.decrypt(localItem.data))
									localData.active = historyItem.data.active
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(localData))
									localItem.version = remoteItem?.version ?? 0
								} else if (remoteItem) {
									const remoteData = JSON.parse(await remoteKeySet.symmetric.decrypt(remoteItem.data))
									remoteData.active = historyItem.data.active
									localItem.data = await this.cryptoManager.localCrypt.encrypt(JSON.stringify(remoteData))
									localItem.version = remoteItem.version
								}
							}
						}
					}

					const action: NoteSyncAction = {
						type: 'update',
						id: localNote.id,
						keyName: localNote.keyName,
						items: [],
					}
					for (const localItem of localNote.items) {
						const remoteItem = remoteNote?.items.find(item => item.type === localItem.type)
						const remoteItemVersion = remoteItem?.version ?? 0
						const localItemData = await this.cryptoManager.tryDecryptNoteItemText(
							localItem,
							this.cryptoManager.localCrypt,
						)
						const remoteItemData = remoteItem
							? await this.cryptoManager.tryDecryptNoteItemText(remoteItem, keySet.symmetric)
							: undefined
						// TODO cleanup
						// if (localItem.version !== remoteItemVersion) {
						// 	if (localItemData === remoteItemData) {
						// 		continue
						// 	}
						// 	// TODO: Handle conflict resolution
						// 	console.log('conflict', localItem, remoteItem)
						// }
						if (localItem.version === 0 || localItemData !== remoteItemData) {
							action.items.push({
								version: localItem.version,
								type: localItem.type,
								data: await keySet.symmetric.encrypt(localItemData),
							})
						}
					}
					if (action.items.length > 0) {
						noteActions.push(action)
					} else {
						this.db.deleteLocalNote(localNote.id)
					}
				} else {
					// TODO is special case needed if base note exists without a remote note?
					const action: NoteSyncAction = {
						type: 'create',
						id: localNote.id,
						keyName: localNote.keyName,
						items: [],
					}
					for (const item of localNote.items) {
						action.items.push({
							version: 0,
							type: item.type,
							data: await this.cryptoManager.tryReencryptNoteItemDataFromLocal(item, keySet.name),
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
			return true
		}

		const status = await this.api.syncPushChanges(noteActions, keyActions, syncId)

		if (status !== 'success') {
			return false
		}

		await this.db.syncLock.withLock('syncPush', async () => {
			for (const localNote of originalLocalNotes) {
				const current = await this.db.getLocalNote(localNote.id)
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
				await this.db.clearDeleteRemoteNote(deletedNoteId)
			}
			for (const deletedKeyId of deletedKeys) {
				await this.db.clearDeleteRemoteKey(deletedKeyId)
			}
		})

		this.state.userStats.localSizeDelta -= localSizeDelta
		this.state.userStats.localNoteCountDelta -= localNoteCountDelta
		this.state.userStats.localSize -= localSize
		this.state.userStats.localNoteCount -= localNoteCount

		console.log('SynchronizationService.syncPush() completed successfully')

		return true
	}

	public isSyncIdIssued(syncId: string): boolean {
		return this._issuedSyncIds.includes(syncId)
	}
}
