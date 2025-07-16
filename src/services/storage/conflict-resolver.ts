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

		// First pass: coalesce adjacent conflicts
		const coalescedResult = this.coalesceConflicts(result)

		const mergedLines: string[] = []
		let hasConflict = false

		for (const chunk of coalescedResult) {
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
						// Try to clean up the conflict by removing shared prefix/suffix
						const cleanedConflict = this.cleanupConflictMarkers(localConflictLines, remoteConflictLines)

						// If after cleanup both sides are empty, treat as no conflict
						if (cleanedConflict.local.length === 0 && cleanedConflict.remote.length === 0) {
							// Use the local version (they should be identical after cleanup)
							mergedLines.push(...localConflictLines)
						} else {
							hasConflict = true

							// Add shared prefix if it exists
							if (cleanedConflict.sharedPrefix.length > 0) {
								mergedLines.push(...cleanedConflict.sharedPrefix)
							}

							mergedLines.push('<<<<<<< HEAD')
							mergedLines.push(...cleanedConflict.local)
							mergedLines.push('=======')
							mergedLines.push(...cleanedConflict.remote)
							mergedLines.push('>>>>>>> remote')

							// Add shared suffix if it exists
							if (cleanedConflict.sharedSuffix.length > 0) {
								mergedLines.push(...cleanedConflict.sharedSuffix)
							}
						}
					}
				}
			}
		}

		return {
			conflict: hasConflict,
			result: mergedLines.join('\n'),
		}
	}

	private cleanupConflictMarkers(
		localLines: string[],
		remoteLines: string[],
	): {
		local: string[]
		remote: string[]
		sharedPrefix: string[]
		sharedSuffix: string[]
	} {
		// Remove shared prefix
		let prefixLength = 0
		const minLength = Math.min(localLines.length, remoteLines.length)

		while (prefixLength < minLength && localLines[prefixLength] === remoteLines[prefixLength]) {
			prefixLength++
		}

		const sharedPrefix = localLines.slice(0, prefixLength)

		// Remove shared suffix
		let suffixLength = 0
		const localTrimmed = localLines.slice(prefixLength)
		const remoteTrimmed = remoteLines.slice(prefixLength)
		const minTrimmedLength = Math.min(localTrimmed.length, remoteTrimmed.length)

		while (
			suffixLength < minTrimmedLength &&
			localTrimmed[localTrimmed.length - 1 - suffixLength] === remoteTrimmed[remoteTrimmed.length - 1 - suffixLength]
		) {
			suffixLength++
		}

		const sharedSuffix = localTrimmed.slice(localTrimmed.length - suffixLength)
		const cleanedLocal = localTrimmed.slice(0, localTrimmed.length - suffixLength)
		const cleanedRemote = remoteTrimmed.slice(0, remoteTrimmed.length - suffixLength)

		return {
			local: cleanedLocal,
			remote: cleanedRemote,
			sharedPrefix,
			sharedSuffix,
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

	private coalesceConflicts(chunks: any[]): any[] {
		if (chunks.length <= 1) {
			return chunks
		}

		const coalescedChunks: any[] = []
		const maxSharedLinesToCoalesce = 3 // Maximum lines of shared content to merge through

		for (let i = 0; i < chunks.length; i++) {
			const currentChunk = chunks[i]

			if (currentChunk.conflict) {
				// Look ahead to see if we should coalesce with future conflicts
				const conflictsToMerge = [currentChunk]
				let j = i + 1
				let hasFoundSharedContentBetween = false

				while (j < chunks.length) {
					const nextChunk = chunks[j]

					if (nextChunk.conflict) {
						// Found another conflict
						conflictsToMerge.push(nextChunk)
						j++
					} else if (nextChunk.ok && nextChunk.ok.length <= maxSharedLinesToCoalesce) {
						// Small shared chunk - check if there's a conflict after it
						const hasConflictAfter = j + 1 < chunks.length && chunks[j + 1].conflict
						if (hasConflictAfter) {
							// This shared content is between conflicts, mark it for coalescing
							conflictsToMerge.push(nextChunk)
							hasFoundSharedContentBetween = true
							j++
						} else {
							// No conflict after this shared chunk, stop coalescing
							break
						}
					} else {
						// Large shared chunk or end of chunks, stop coalescing
						break
					}
				}

				// Only coalesce if we found shared content between conflicts
				// This prevents coalescing conflicts that are naturally separate
				if (conflictsToMerge.length > 1 && hasFoundSharedContentBetween) {
					const mergedConflict = this.mergeConflictChunks(conflictsToMerge)
					coalescedChunks.push(mergedConflict)
					i = j - 1 // Skip the chunks we just merged
				} else {
					// Single conflict or no shared content between conflicts, add as-is
					coalescedChunks.push(currentChunk)
				}
			} else {
				// Non-conflict chunk, add as-is
				coalescedChunks.push(currentChunk)
			}
		}

		return coalescedChunks
	}

	private mergeConflictChunks(chunks: any[]): any {
		const localLines: string[] = []
		const remoteLines: string[] = []

		for (const chunk of chunks) {
			if (chunk.conflict) {
				localLines.push(...(chunk.conflict.a || []))
				remoteLines.push(...(chunk.conflict.b || []))
			} else if (chunk.ok) {
				// Shared content goes to both sides
				localLines.push(...chunk.ok)
				remoteLines.push(...chunk.ok)
			}
		}

		return {
			conflict: {
				a: localLines,
				b: remoteLines,
			},
		}
	}
}
