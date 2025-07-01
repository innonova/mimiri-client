import { emptyGuid, type Guid } from '../types/guid'
import type { KeySyncAction, NoteSyncAction } from '../types/requests'
import type { KeyData, SharedState } from './type'
import type { CryptographyManager } from './cryptography-manager'
import type { MimiriDb } from './mimiri-db'
import type { MimiriClient } from './mimiri-client'
import { delay } from '../helpers'

export class SynchronizationService {
	private _syncInProgress = false
	private _syncRequestedWhileInProgress = false
	private _baseDelayMs = 1000 // 1 second base delay
	private _maxDelayMs = 300000 // 5 minutes max delay
	private _waitingForSync: ((success: boolean) => void)[] = []
	private _initialized: boolean = false

	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private cryptoManager: CryptographyManager,
		private sharedState: SharedState,
		private noteUpdatedCallback: (noteId: Guid) => Promise<void>,
	) {}

	public async initialSync(): Promise<void> {
		if (!this.sharedState.workOffline && !this.sharedState.isLocalOnly) {
			await this.syncPull()
			this._initialized = true
		}
	}

	public async sync() {
		if (!this._initialized || !this.sharedState.isOnline || this.sharedState.isLocalOnly) {
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
						if (!this._initialized || !this.sharedState.isOnline) {
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
				} while (this._syncRequestedWhileInProgress || syncFailed)
			} finally {
				this._syncInProgress = false
				for (const resolve of this._waitingForSync) {
					resolve(true)
				}
				this._waitingForSync = []
			}
		} else {
			this._syncRequestedWhileInProgress = true
		}
	}

	public queueSync(): void {
		if (!this._initialized || !this.sharedState.isOnline || this.sharedState.isLocalOnly) {
			return
		}
		void this.sync()
	}

	waitForSync(timeoutMs?: number): Promise<boolean> {
		if (!this._initialized || !this.sharedState.isOnline || this.sharedState.isLocalOnly) {
			return Promise.resolve(false)
		}
		if (!this._syncInProgress) {
			return Promise.resolve(true)
		} else {
			return new Promise<boolean>(resolve => {
				let timeoutId: number | undefined

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

		const updatedNoteIds: Guid[] = []

		for (let i = 0; i < 100; i++) {
			let syncChanged = false
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
					items: note.items.map(item => ({
						version: item.version,
						type: item.itemType,
						data: item.data,
						modified: item.modified,
						created: item.created,
					})),
				})
				updatedNoteIds.push(note.id)
			}
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
		const noteActions: NoteSyncAction[] = []
		const keyActions: KeySyncAction[] = []

		const localNotes = await this.db.getAllLocalNotes()
		for (const localNote of localNotes) {
			const keySet = this.cryptoManager.getKeyByName(localNote.keyName)
			const remoteNote = await this.db.getNote(localNote.id)
			if (remoteNote) {
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
					if (localItem.version !== remoteItemVersion) {
						if (localItemData === remoteItemData) {
							continue
						}
						// TODO: Handle conflict resolution
						console.log('conflict', localItem, remoteItem)
					}
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

		const localKeys = await this.db.getAllLocalKeys()
		for (const localKey of localKeys) {
			const action: KeySyncAction = {
				type: 'create',
				id: localKey.id,
				name: localKey.name,
				data: JSON.stringify({
					id: localKey.id,
					userId: this.sharedState.userId,
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

		const deletedNotes = await this.db.getAllDeletedNotes()
		for (const noteId of deletedNotes) {
			noteActions.push({
				type: 'delete',
				keyName: emptyGuid(),
				id: noteId,
				items: [],
			})
		}

		const deletedKeys = await this.db.getAllDeletedKeys()
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

		const results = await this.api.syncPushChanges(noteActions, keyActions)
		for (const result of results ?? []) {
			if (result.itemType === 'note') {
				if (result.action === 'create') {
					this.db.deleteLocalNote(result.id)
				} else if (result.action === 'update') {
					this.db.deleteLocalNote(result.id)
				} else if (result.action === 'delete') {
					this.db.clearDeleteRemoteNote(result.id)
				}
			} else if (result.itemType === 'key') {
				if (result.action === 'create') {
					this.db.deleteLocalKey(result.id)
				} else if (result.action === 'delete') {
					this.db.clearDeleteRemoteKey(result.id)
				}
			}
		}
		return results?.length > 0
	}
}
