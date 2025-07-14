import { diff3Merge } from 'node-diff3'

export interface TextData {
	text: string
}

export interface HistoryData {
	active: {
		timestamp: string
		username: string
		text: string
	}[]
}

export interface Metadata {
	notes: string[]
	title: string
}

export type MergeType = 'base' | 'local' | 'remote' | 'merged'

export interface MergeableNoteItem {
	type: string
	mergeType?: MergeType
}

export interface MergeableTextItem extends MergeableNoteItem {
	data: TextData
}

export interface MergeableHistoryItem extends MergeableNoteItem {
	data: HistoryData
}

export interface MergeableMetadataItem extends MergeableNoteItem {
	data: Metadata
}

export interface MergeableNote {
	items: MergeableNoteItem[]
}

interface MergeResult {
	conflict: boolean
	result: string
}

const getText = (item: MergeableNote, mergeType: MergeType): MergeableTextItem | undefined => {
	const result = item.items.find(i => i.type === 'text') as MergeableTextItem
	if (result) {
		result.mergeType = mergeType
	}
	return result
}

const getHistory = (item: MergeableNote, mergeType: MergeType): MergeableHistoryItem | undefined => {
	const result = item.items.find(i => i.type === 'history') as MergeableHistoryItem
	if (result) {
		result.mergeType = mergeType
	}
	return result
}

const getMetadata = (item: MergeableNote, mergeType: MergeType): MergeableMetadataItem | undefined => {
	const result = item.items.find(i => i.type === 'metadata') as MergeableMetadataItem
	if (result) {
		result.mergeType = mergeType
	}
	return result
}

export class ConflictResolver {
	public resolveConflict(base: MergeableNote, local: MergeableNote, remote: MergeableNote): MergeableNote {
		const merged: MergeableNote = {
			items: [],
		}

		const baseText = getText(base, 'base')
		const localText = getText(local, 'local')
		const remoteText = getText(remote, 'remote')
		const baseHistory = getHistory(base, 'base')
		const localHistory = getHistory(local, 'local')
		const remoteHistory = getHistory(remote, 'remote')
		const baseMetadata = getMetadata(base, 'base')
		const localMetadata = getMetadata(local, 'local')
		const remoteMetadata = getMetadata(remote, 'remote')

		let mergedText: MergeableTextItem | null = null
		if (baseText || localText || remoteText) {
			mergedText = this.mergeTextItem(baseText, localText, remoteText)
			if (mergedText) {
				merged.items.push(mergedText)
			}
		}
		if (baseHistory || localHistory || remoteHistory) {
			const mergedHistory = this.mergeHistoryItem(baseHistory, localHistory, remoteHistory, mergedText)
			if (mergedHistory) {
				merged.items.push(mergedHistory)
			}
		}

		if (baseMetadata || localMetadata || remoteMetadata) {
			const mergedMetadata = this.mergeMetadataItem(baseMetadata, localMetadata, remoteMetadata)
			if (mergedMetadata) {
				merged.items.push(mergedMetadata)
			}
		}
		return merged
	}

	private mergeTextItem(
		baseItem?: MergeableTextItem,
		localItem?: MergeableTextItem,
		remoteItem?: MergeableTextItem,
	): MergeableTextItem | null {
		if (!baseItem && !localItem && !remoteItem) {
			return null
		}

		const baseText = baseItem?.data?.text || ''
		const localText = localItem?.data?.text || ''
		const remoteText = remoteItem?.data?.text || ''

		if (localText === remoteText) {
			return localItem || remoteItem || null
		}
		if (baseText === localText) {
			return remoteItem || null
		}
		if (baseText === remoteText) {
			return localItem || null
		}

		const mergeResult = this.mergeText(baseText, localText, remoteText)

		const mergedItem: MergeableTextItem = {
			type: 'text',
			data: {
				text: mergeResult.result,
			},
			mergeType: 'merged',
		}
		return mergedItem
	}

	private mergeHistoryItem(
		baseItem?: MergeableHistoryItem,
		localItem?: MergeableHistoryItem,
		remoteItem?: MergeableHistoryItem,
		mergedText?: MergeableTextItem,
	): MergeableHistoryItem | null {
		const baseHistory = baseItem?.data?.active || []
		const localHistory = localItem?.data?.active || []
		const remoteHistory = remoteItem?.data?.active || []

		const allHistory = [...baseHistory, ...localHistory, ...remoteHistory]
		const uniqueHistory = allHistory.filter(
			(entry, index, arr) => arr.findIndex(e => e.timestamp === entry.timestamp && e.text === entry.text) === index,
		)

		uniqueHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

		if (mergedText && mergedText.mergeType === 'merged') {
			const mergeEntry = {
				timestamp: new Date().toISOString(),
				username: 'merge',
				text: mergedText.data.text,
			}
			uniqueHistory.push(mergeEntry)
		}

		const mergedItem: MergeableHistoryItem = {
			type: 'history',
			data: {
				active: uniqueHistory,
			},
			mergeType: 'merged',
		}

		return mergedItem
	}

	private mergeMetadataItem(
		baseItem?: MergeableMetadataItem,
		localItem?: MergeableMetadataItem,
		remoteItem?: MergeableMetadataItem,
	): MergeableMetadataItem | null {
		if (!baseItem && !localItem && !remoteItem) {
			return null
		}

		const baseData = baseItem?.data
		const localData = localItem?.data
		const remoteData = remoteItem?.data

		const mergedNotes = this.mergeNotesArray(baseData.notes || [], localData.notes || [], remoteData.notes || [])

		const mergedTitle = this.mergeTitle(baseData.title, localData.title, remoteData.title)

		const mergedData = {
			notes: mergedNotes,
			title: mergedTitle,
		}

		const mergedItem: MergeableMetadataItem = {
			type: 'metadata',
			data: mergedData,
			mergeType: 'merged',
		}

		return mergedItem
	}

	private mergeNotesArray(baseNotes: string[], localNotes: string[], remoteNotes: string[]): string[] {
		const baseSet = new Set(baseNotes)
		const localSet = new Set(localNotes)
		const remoteSet = new Set(remoteNotes)

		const localAdded = localNotes.filter(note => !baseSet.has(note))
		const localRemoved = baseNotes.filter(note => !localSet.has(note))
		const remoteAdded = remoteNotes.filter(note => !baseSet.has(note))
		const remoteRemoved = baseNotes.filter(note => !remoteSet.has(note))

		let mergedNotes = [...baseNotes]

		mergedNotes = mergedNotes.filter(note => !localRemoved.includes(note))
		mergedNotes.push(...localAdded)

		mergedNotes = mergedNotes.filter(note => {
			if (remoteRemoved.includes(note)) {
				return localAdded.includes(note)
			}
			return true
		})
		const remoteAddedNotRemovedLocally = remoteAdded.filter(note => !localRemoved.includes(note))
		mergedNotes.push(...remoteAddedNotRemovedLocally)

		return [...new Set(mergedNotes)]
	}

	private mergeTitle(baseTitle?: string, localTitle?: string, remoteTitle?: string): string {
		if (localTitle === remoteTitle) {
			return localTitle || baseTitle || ''
		}

		if (baseTitle === localTitle) {
			return remoteTitle || baseTitle || ''
		}
		if (baseTitle === remoteTitle) {
			return localTitle || baseTitle || ''
		}

		return localTitle || remoteTitle || baseTitle || ''
	}

	private mergeText(base: string, local: string, remote: string): MergeResult {
		const baseLines = base.split(/\r?\n/)
		const localLines = local.split(/\r?\n/)
		const remoteLines = remote.split(/\r?\n/)

		const result = diff3Merge(localLines, baseLines, remoteLines)

		const mergedLines: string[] = []
		let hasConflict = false

		for (const chunk of result) {
			if (chunk.ok) {
				mergedLines.push(...chunk.ok)
			} else if (chunk.conflict) {
				const localConflictLines = chunk.conflict.a || []
				const remoteConflictLines = chunk.conflict.b || []

				const isNewlineOnlyConflict = this.isNewlineOnlyConflict(localConflictLines, remoteConflictLines)

				if (isNewlineOnlyConflict) {
					const longerSide =
						localConflictLines.length >= remoteConflictLines.length ? localConflictLines : remoteConflictLines
					mergedLines.push(...longerSide)
				} else {
					const autoResolve = this.canAutoResolveConflict(localConflictLines, remoteConflictLines)

					if (autoResolve.canResolve && autoResolve.resolution) {
						mergedLines.push(...autoResolve.resolution)
					} else {
						hasConflict = true
						mergedLines.push('<<<<<<< HEAD (Local)')
						mergedLines.push(...localConflictLines)
						mergedLines.push('=======')
						mergedLines.push(...remoteConflictLines)
						mergedLines.push('>>>>>>> REMOTE')
					}
				}
			}
		}

		return {
			conflict: hasConflict,
			result: mergedLines.join('\n'),
		}
	}

	private isNewlineOnlyConflict(localLines: string[], remoteLines: string[]): boolean {
		const localNonEmpty = localLines.filter(line => line.trim() !== '')
		const remoteNonEmpty = remoteLines.filter(line => line.trim() !== '')
		if (localNonEmpty.length === 0 && remoteNonEmpty.length === 0) {
			return true
		}
		if (localNonEmpty.length === remoteNonEmpty.length) {
			return localNonEmpty.every((line, index) => line === remoteNonEmpty[index])
		}
		if (localNonEmpty.length === 0 || remoteNonEmpty.length === 0) {
			return true
		}
		return false
	}

	private canAutoResolveConflict(
		localLines: string[],
		remoteLines: string[],
	): { canResolve: boolean; resolution?: string[] } {
		const localTrimmed = this.trimTrailingEmpty(localLines)
		const remoteTrimmed = this.trimTrailingEmpty(remoteLines)

		if (localTrimmed.length <= remoteTrimmed.length) {
			if (localTrimmed.every((line, index) => line === remoteTrimmed[index])) {
				return { canResolve: true, resolution: remoteLines }
			}
		}
		if (remoteTrimmed.length <= localTrimmed.length) {
			if (remoteTrimmed.every((line, index) => line === localTrimmed[index])) {
				return { canResolve: true, resolution: localLines }
			}
		}

		const shorter = localTrimmed.length <= remoteTrimmed.length ? localTrimmed : remoteTrimmed
		const longer = localTrimmed.length > remoteTrimmed.length ? localTrimmed : remoteTrimmed
		const longerOriginal = localTrimmed.length > remoteTrimmed.length ? localLines : remoteLines
		const shorterOriginal = localTrimmed.length <= remoteTrimmed.length ? localLines : remoteLines

		if (shorter.length > 0 && longer.length > shorter.length) {
			const allButLastMatch = shorter.slice(0, -1).every((line, index) => line === longer[index])

			if (allButLastMatch) {
				const shorterLastLine = shorter[shorter.length - 1]
				const longerCorrespondingLine = longer[shorter.length - 1]

				if (shorterLastLine !== longerCorrespondingLine) {
					const resolution = [...shorter.slice(0, -1), shorterLastLine, ...longer.slice(shorter.length)]

					const originalLongerTrailing = longerOriginal.slice(longer.length)
					return { canResolve: true, resolution: [...resolution, ...originalLongerTrailing] }
				}
			}
		}

		return { canResolve: false }
	}

	private trimTrailingEmpty(lines: string[]): string[] {
		let lastNonEmpty = lines.length - 1
		while (lastNonEmpty >= 0 && lines[lastNonEmpty].trim() === '') {
			lastNonEmpty--
		}
		return lines.slice(0, lastNonEmpty + 1)
	}
}
