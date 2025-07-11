import { describe, it, expect, beforeEach } from '@jest/globals'
import {
	ConflictResolver,
	type MergeableNote,
	type MergeableTextItem,
	type MergeableHistoryItem,
	type MergeableMetadataItem,
} from './conflict-resolver'

describe('ConflictResolver', () => {
	let resolver: ConflictResolver

	beforeEach(() => {
		resolver = new ConflictResolver()
	})

	// Compact test data helpers with descriptive names
	const text = (content: string) => ({
		type: 'text',
		data: { text: content },
	})
	const history = (entries: Array<{ timestamp: string; username: string; text: string }>) => ({
		type: 'history',
		data: { active: entries },
	})
	const metadata = (notes: string[], title: string) => ({
		type: 'metadata',
		data: { notes, title },
	})
	const note = (items: any[]) => ({ items })
	const entry = (timestamp: string, username: string, text: string) => ({ timestamp, username, text })

	describe('Simple Text Merge', () => {
		it('should merge non-conflicting text changes', () => {
			// Arrange
			const baseText = 'This is the original text.\nSecond line remains unchanged.\nThird line also stays.'
			const localText = 'ADDED: Local change at the beginning.\n' + baseText
			const remoteText = baseText + '\nADDED: Remote change at the end.'

			const base = note([
				text(baseText),
				history([entry('2025-07-10T10:00:00.000Z', 'user1', baseText)]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])

			const local = note([
				text(localText),
				history([
					entry('2025-07-10T10:00:00.000Z', 'user1', baseText),
					entry('2025-07-10T10:30:00.000Z', 'user1', localText),
				]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])

			const remote = note([
				text(remoteText),
				history([
					entry('2025-07-10T10:00:00.000Z', 'user1', baseText),
					entry('2025-07-10T10:15:00.000Z', 'user2', remoteText),
				]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert - Check that text item was merged correctly
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe(localText + '\nADDED: Remote change at the end.')
			expect(textItem.mergeType).toBe('merged')

			// Check that history was preserved and merge entry added
			const historyItem = result.items.find(item => item.type === 'history') as MergeableHistoryItem
			expect(historyItem).toBeDefined()
			expect(historyItem.data.active).toHaveLength(4) // base + local + remote + merge entries

			// Check that the merge entry was added with correct username and text
			const mergeEntry = historyItem.data.active.find(entry => entry.username === 'merge')
			expect(mergeEntry).toBeDefined()
			expect(mergeEntry!.text).toBe(textItem.data.text)

			// Check that metadata was preserved
			const metadataItem = result.items.find(item => item.type === 'metadata') as MergeableMetadataItem
			expect(metadataItem).toBeDefined()
			expect(metadataItem.data.title).toBe('Base Document')
			expect(metadataItem.data.notes).toEqual(['note-1', 'note-2'])
		})
	})

	describe('Metadata Merge', () => {
		it('should merge notes arrays and prioritize local title on conflict', () => {
			// Arrange
			const base = note([text('Base text content'), metadata(['note-1', 'note-2', 'note-3'], 'Original Title')])
			const local = note([
				text('Base text content'),
				metadata(['note-1', 'note-3', 'local-note'], 'Local Changed Title'),
			])
			const remote = note([
				text('Base text content'),
				metadata(['note-1', 'note-2', 'note-3', 'remote-note'], 'Remote Changed Title'),
			])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert - Check that text item remained unchanged
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('Base text content')

			// Check that metadata was merged correctly
			const metadataItem = result.items.find(item => item.type === 'metadata') as MergeableMetadataItem
			expect(metadataItem).toBeDefined()

			// Title should be local (local wins when both changed)
			expect(metadataItem.data.title).toBe('Local Changed Title')

			// Notes array should be merged:
			// - note-2 removed by local (should stay removed)
			// - local-note added by local (should be kept)
			// - remote-note added by remote (should be kept)
			// - note-1 and note-3 unchanged (should be kept)
			expect(metadataItem.data.notes).toEqual(expect.arrayContaining(['note-1', 'note-3', 'local-note', 'remote-note']))
			expect(metadataItem.data.notes).toHaveLength(4)
			expect(metadataItem.data.notes).not.toContain('note-2') // Should be removed
		})
	})

	describe('History Merge Without Text Conflict', () => {
		it('should not add merge entry when no text conflict exists', () => {
			// Create a scenario where only history differs but no text conflict
			const baseText = 'This is the original text.\nSecond line remains unchanged.\nThird line also stays.'
			const base = note([
				text(baseText),
				history([entry('2025-07-10T10:00:00.000Z', 'user1', baseText)]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])
			const local = note([
				text(baseText),
				history([
					entry('2025-07-10T10:00:00.000Z', 'user1', baseText),
					entry('2025-07-10T10:45:00.000Z', 'user1', baseText + '\nLocal history entry.'),
				]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])
			const remote = note([
				text(baseText),
				history([
					entry('2025-07-10T10:00:00.000Z', 'user1', baseText),
					entry('2025-07-10T10:50:00.000Z', 'user2', baseText + '\nRemote history entry.'),
				]),
				metadata(['note-1', 'note-2'], 'Base Document'),
			])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const historyItem = result.items.find(item => item.type === 'history') as MergeableHistoryItem
			expect(historyItem).toBeDefined()

			// Should have original 1 entry plus 2 new ones, but no merge entry
			expect(historyItem.data.active).toHaveLength(3) // base + local + remote history entries

			// Should not have a merge entry
			const mergeEntry = historyItem.data.active.find(entry => entry.username === 'merge')
			expect(mergeEntry).toBeUndefined()
		})
	})

	describe('Text Conflict with Markers', () => {
		it('should add conflict markers when text cannot be merged cleanly', () => {
			// Create test data with conflicting changes to the same line
			const base = note([text('Line 1\nOriginal line\nLine 3'), history([])])
			const local = note([text('Line 1\nLocal changed line\nLine 3'), history([])])
			const remote = note([text('Line 1\nRemote changed line\nLine 3'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')

			// Should contain conflict markers
			expect(textItem.data.text).toContain('<<<<<<< HEAD (Local)')
			expect(textItem.data.text).toContain('=======')
			expect(textItem.data.text).toContain('>>>>>>> REMOTE')
			expect(textItem.data.text).toContain('Local changed line')
			expect(textItem.data.text).toContain('Remote changed line')

			// History should include the merge entry
			const historyItem = result.items.find(item => item.type === 'history') as MergeableHistoryItem
			expect(historyItem).toBeDefined()
			const mergeEntry = historyItem.data.active.find(entry => entry.username === 'merge')
			expect(mergeEntry).toBeDefined()
			expect(mergeEntry!.text).toBe(textItem.data.text)
		})
	})
})
