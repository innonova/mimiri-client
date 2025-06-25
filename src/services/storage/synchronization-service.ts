import { emptyGuid, type Guid } from '../types/guid'
import type { KeySyncAction, NoteSyncAction } from '../types/requests'
import type { KeyData, SharedState } from './type'
import type { CryptographyManager } from './cryptography-manager'
import type { MimiriDb } from './mimiri-browser-db'
import type { MimiriClient } from './mimiri-client'

export class SynchronizationService {
	constructor(
		private db: MimiriDb,
		private api: MimiriClient,
		private cryptoManager: CryptographyManager,
		private sharedState: SharedState,
		private noteUpdatedCallback: (noteId: Guid) => Promise<void>,
	) {}

	public async sync(pushUpdates: boolean = false): Promise<void> {
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

	public async syncPush(): Promise<void> {
		console.log('Pushing changes to server...')

		const noteActions: NoteSyncAction[] = []
		const keyActions: KeySyncAction[] = []

		console.log('Loading local notes...')
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
					console.log(localItemData)

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

		console.log('Loading local keys...')
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
					keyData: await this.sharedState.rootCrypt.encrypt(
						await this.cryptoManager.localCrypt.decrypt(localKey.keyData),
					),
					publicKey: await localKey.publicKey,
					privateKey: await this.sharedState.rootCrypt.encrypt(
						await this.cryptoManager.localCrypt.decrypt(localKey.privateKey),
					),
					metadata: await this.sharedState.rootCrypt.encrypt(
						await this.cryptoManager.localCrypt.decrypt(localKey.metadata),
					),
				}),
			}
			keyActions.push(action)
		}

		console.log('Loading deleted notes and keys...')
		const deletedNotes = await this.db.getAllDeletedNotes()
		for (const noteId of deletedNotes) {
			noteActions.push({
				type: 'delete',
				keyName: emptyGuid(),
				id: noteId,
				items: [],
			})
		}

		console.log('Loading deleted keys...')
		const deletedKeys = await this.db.getAllDeletedKeys()
		for (const keyId of deletedKeys) {
			keyActions.push({
				type: 'delete',
				id: keyId,
				name: emptyGuid(),
				data: '',
			})
		}
		console.log(noteActions)

		const results = await this.api.syncPushChanges(noteActions, keyActions)
		console.log(results)
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
	}
}
