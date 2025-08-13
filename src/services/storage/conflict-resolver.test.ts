import { describe, it, expect, beforeEach } from '@jest/globals'
import {
	ConflictResolver,
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
			expect(textItem.data.text).toContain('<<<<<<< HEAD')
			expect(textItem.data.text).toContain('=======')
			expect(textItem.data.text).toContain('>>>>>>> remote')
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

	describe('Smart Conflict Resolution', () => {
		it('should auto-resolve when last line is modified and new lines are added', () => {
			// The classic case: one side modifies the last line, other side adds new content
			const base = note([text('Line 1\nLine 2\nLine 3'), history([])])
			const local = note([text('Line 1\nLine 2\nLine 3 modified'), history([])])
			const remote = note([text('Line 1\nLine 2\nLine 3\nLine 4\nLine 5'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')
			expect(textItem.data.text).toBe('Line 1\nLine 2\nLine 3 modified\nLine 4\nLine 5')

			// Should not contain conflict markers
			expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
			expect(textItem.data.text).not.toContain('=======')
			expect(textItem.data.text).not.toContain('>>>>>>> remote')
		})

		it('should auto-resolve when one side only adds content at the end', () => {
			// Pure addition case - should always merge cleanly
			const base = note([text('Line 1\nLine 2'), history([])])
			const local = note([text('Line 1\nLine 2'), history([])])
			const remote = note([text('Line 1\nLine 2\nAdded line 3\nAdded line 4'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('Line 1\nLine 2\nAdded line 3\nAdded line 4')

			// Should not contain conflict markers
			expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
		})

		it('should create conflict when both sides extend and modify overlapping areas', () => {
			// This case is ambiguous: local adds content, remote modifies last line and adds different content
			// This should be treated as a conflict since both sides are changing the "end" of the document
			const base = note([text('Line 1\nLine 2'), history([])])
			const local = note([text('Line 1\nLine 2\nLocal addition'), history([])])
			const remote = note([text('Line 1\nLine 2 modified\nRemote addition'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()

			// This should create conflict markers since it's ambiguous
			expect(textItem.data.text).toContain('<<<<<<< HEAD')
			expect(textItem.data.text).toContain('=======')
			expect(textItem.data.text).toContain('>>>>>>> remote')
		})

		it('should auto-resolve when one modifies middle line and other adds at end', () => {
			// Clear case for auto-resolution: modification doesn't overlap with addition
			const base = note([text('Line 1\nLine 2\nLine 3'), history([])])
			const local = note([text('Line 1\nLine 2 modified\nLine 3'), history([])])
			const remote = note([text('Line 1\nLine 2\nLine 3\nAdded line 4'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('Line 1\nLine 2 modified\nLine 3\nAdded line 4')

			// Should not contain conflict markers
			expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
		})

		it('should preserve trailing empty lines during smart resolution', () => {
			// Test that trailing whitespace is handled correctly
			const base = note([text('Line 1\nLine 2\n\n'), history([])])
			const local = note([text('Line 1\nLine 2 modified\n\n'), history([])])
			const remote = note([text('Line 1\nLine 2\nLine 3\n\n\n'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('Line 1\nLine 2 modified\nLine 3\n\n\n')
		})

		it('should still create conflict markers for genuine conflicts', () => {
			// When both sides modify the same line differently, should still conflict
			const base = note([text('Line 1\nLine 2\nLine 3'), history([])])
			const local = note([text('Line 1\nLine 2 local change\nLine 3'), history([])])
			const remote = note([text('Line 1\nLine 2 remote change\nLine 3'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')

			// Should contain conflict markers for genuine conflicts
			expect(textItem.data.text).toContain('<<<<<<< HEAD')
			expect(textItem.data.text).toContain('=======')
			expect(textItem.data.text).toContain('>>>>>>> remote')
			expect(textItem.data.text).toContain('Line 2 local change')
			expect(textItem.data.text).toContain('Line 2 remote change')
		})

		it('should handle empty content scenarios gracefully', () => {
			// Edge case: one side becomes empty
			const base = note([text('Line 1\nLine 2'), history([])])
			const local = note([text(''), history([])])
			const remote = note([text('Line 1\nLine 2\nLine 3'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			// In this case, local completely cleared content while remote added - should use remote
			expect(textItem.data.text).toBe('Line 1\nLine 2\nLine 3')
		})

		it('should handle single line modifications with additions', () => {
			// Simple single-line case
			const base = note([text('Hello world'), history([])])
			const local = note([text('Hello modified world'), history([])])
			const remote = note([text('Hello world\nAdded second line'), history([])])

			// Act
			const result = resolver.resolveConflict(base, local, remote)

			// Assert
			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('Hello modified world\nAdded second line')
			expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
		})
	})

	describe('Conflict Coalescing', () => {
		describe('Should coalesce conflicts', () => {
			it('should coalesce conflicts separated by 1 shared line', () => {
				// Create a scenario where two conflicts are separated by just one shared line
				const baseText = 'Line 1\nShared line\nLine 3\nAnother shared\nLine 5'
				const localText = 'Line 1 LOCAL\nShared line\nLine 3 LOCAL\nAnother shared\nLine 5 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared line\nLine 3 REMOTE\nAnother shared\nLine 5 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()
				expect(textItem.mergeType).toBe('merged')

				// Should have conflict markers but they should be coalesced into fewer blocks
				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Should be coalesced into a single conflict

				// Both shared lines should appear in both sides of the conflict
				expect(textItem.data.text).toContain('Shared line')
				expect(textItem.data.text).toContain('Another shared')
			})

			it('should coalesce conflicts separated by 2 shared lines', () => {
				const baseText = 'Line 1\nShared A\nShared B\nLine 4'
				const localText = 'Line 1 LOCAL\nShared A\nShared B\nLine 4 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared A\nShared B\nLine 4 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Should be coalesced
			})

			it('should coalesce conflicts separated by 3 shared lines (at the limit)', () => {
				const baseText = 'Line 1\nShared A\nShared B\nShared C\nLine 5'
				const localText = 'Line 1 LOCAL\nShared A\nShared B\nShared C\nLine 5 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared A\nShared B\nShared C\nLine 5 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Should be coalesced at the limit
			})

			it('should coalesce multiple consecutive conflicts with small shared chunks', () => {
				const baseText = 'Line 1\nShared A\nLine 3\nShared B\nLine 5'
				const localText = 'Line 1 LOCAL\nShared A\nLine 3 LOCAL\nShared B\nLine 5 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared A\nLine 3 REMOTE\nShared B\nLine 5 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // All conflicts should be coalesced
			})

			it('should coalesce conflicts separated by empty lines', () => {
				const baseText = 'Line 1\n\n\nLine 4'
				const localText = 'Line 1 LOCAL\n\n\nLine 4 LOCAL'
				const remoteText = 'Line 1 REMOTE\n\n\nLine 4 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Should be coalesced
			})
		})

		describe('Should NOT coalesce conflicts', () => {
			it('should not coalesce conflicts separated by 4 shared lines', () => {
				const baseText = 'Line 1\nShared A\nShared B\nShared C\nShared D\nLine 6'
				const localText = 'Line 1 LOCAL\nShared A\nShared B\nShared C\nShared D\nLine 6 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared A\nShared B\nShared C\nShared D\nLine 6 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(2) // Should remain as separate conflicts
			})

			it('should not coalesce conflicts separated by large shared content', () => {
				const baseText = 'Line 1\nShared 1\nShared 2\nShared 3\nShared 4\nShared 5\nLine 7'
				const localText = 'Line 1 LOCAL\nShared 1\nShared 2\nShared 3\nShared 4\nShared 5\nLine 7 LOCAL'
				const remoteText = 'Line 1 REMOTE\nShared 1\nShared 2\nShared 3\nShared 4\nShared 5\nLine 7 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(2) // Should remain as separate conflicts
			})

			it('should not coalesce when there is no conflict after shared content', () => {
				const baseText = 'Line 1\nShared line\nLine 3'
				const localText = 'Line 1 LOCAL\nShared line\nLine 3'
				const remoteText = 'Line 1 REMOTE\nShared line\nLine 3'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Single conflict, not coalesced
			})

			it('should handle single conflict without coalescing', () => {
				const baseText = 'Line 1\nLine 2\nLine 3'
				const localText = 'Line 1 LOCAL\nLine 2\nLine 3'
				const remoteText = 'Line 1 REMOTE\nLine 2\nLine 3'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Single conflict
			})

			it('should not coalesce conflicts with substantial shared content between them', () => {
				const baseText =
					'Conflict 1\nLarge shared section line 1\nLarge shared section line 2\nLarge shared section line 3\nLarge shared section line 4\nLarge shared section line 5\nConflict 2'
				const localText =
					'Conflict 1 LOCAL\nLarge shared section line 1\nLarge shared section line 2\nLarge shared section line 3\nLarge shared section line 4\nLarge shared section line 5\nConflict 2 LOCAL'
				const remoteText =
					'Conflict 1 REMOTE\nLarge shared section line 1\nLarge shared section line 2\nLarge shared section line 3\nLarge shared section line 4\nLarge shared section line 5\nConflict 2 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(2) // Should remain as separate conflicts

				// Verify the shared content appears between conflicts
				expect(textItem.data.text).toContain('Large shared section line 1')
				expect(textItem.data.text).toContain('Large shared section line 5')
			})

			it('should not coalesce consecutive conflicts without shared content between them', () => {
				// This creates two separate conflicts that are adjacent but don't have shared content between
				const baseText = 'Line 1\nLine 2\nLine 3\nLine 4'
				const localText = 'Line 1 LOCAL\nLine 2 LOCAL\nLine 3 LOCAL\nLine 4 LOCAL'
				const remoteText = 'Line 1 REMOTE\nLine 2 REMOTE\nLine 3 REMOTE\nLine 4 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				// This should create a single conflict, not multiple to coalesce
				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1) // Single conflict, not coalesced
			})
		})

		describe('Edge cases and complex scenarios', () => {
			it('should handle mixed coalescing scenarios', () => {
				// First two conflicts should coalesce, third should remain separate
				const baseText =
					'Conflict 1\nShared A\nConflict 2\nLarge shared 1\nLarge shared 2\nLarge shared 3\nLarge shared 4\nLarge shared 5\nConflict 3'
				const localText =
					'Conflict 1 LOCAL\nShared A\nConflict 2 LOCAL\nLarge shared 1\nLarge shared 2\nLarge shared 3\nLarge shared 4\nLarge shared 5\nConflict 3 LOCAL'
				const remoteText =
					'Conflict 1 REMOTE\nShared A\nConflict 2 REMOTE\nLarge shared 1\nLarge shared 2\nLarge shared 3\nLarge shared 4\nLarge shared 5\nConflict 3 REMOTE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(2) // First two coalesced, third separate
			})

			it('should work with no conflicts (sanity check)', () => {
				const baseText = 'Line 1\nLine 2\nLine 3'
				const localText = 'Line 1\nLine 2\nLine 3'
				const remoteText = 'Line 1\nLine 2\nLine 3'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()
				expect(textItem.data.text).toBe(baseText)
				expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
			})

			it('should preserve coalesced conflict content correctly', () => {
				const baseText = 'Line 1\nShared\nLine 3'
				const localText = 'Line 1 LOCAL CHANGE\nShared\nLine 3 LOCAL CHANGE'
				const remoteText = 'Line 1 REMOTE CHANGE\nShared\nLine 3 REMOTE CHANGE'

				const base = note([text(baseText)])
				const local = note([text(localText)])
				const remote = note([text(remoteText)])

				const result = resolver.resolveConflict(base, local, remote)

				const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
				expect(textItem).toBeDefined()

				// Should contain all the expected content
				expect(textItem.data.text).toContain('Line 1 LOCAL CHANGE')
				expect(textItem.data.text).toContain('Line 1 REMOTE CHANGE')
				expect(textItem.data.text).toContain('Line 3 LOCAL CHANGE')
				expect(textItem.data.text).toContain('Line 3 REMOTE CHANGE')
				expect(textItem.data.text).toContain('Shared')

				// Should have single conflict marker set
				const conflictMarkerCount = (textItem.data.text.match(/<<<<<<< HEAD/g) || []).length
				expect(conflictMarkerCount).toBe(1)
			})
		})
	})

	describe('Conflict Cleanup', () => {
		it('should remove shared prefix lines from conflict markers', () => {
			const baseText = '\n# Base comment\nconfig: base'
			const localText = '\n# Local development settings\ndebug: true'
			const remoteText = '\n# Production overrides\nssl: enabled'

			const base = note([text(baseText)])
			const local = note([text(localText)])
			const remote = note([text(remoteText)])

			const result = resolver.resolveConflict(base, local, remote)

			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')

			// Should not have the shared blank line in the conflict markers
			expect(textItem.data.text).not.toMatch(/<<<<<<< HEAD\n\n/)
			expect(textItem.data.text).not.toMatch(/=======\n\n/)

			// But should still contain the conflict content
			expect(textItem.data.text).toContain('Local development settings')
			expect(textItem.data.text).toContain('Production overrides')
			expect(textItem.data.text).toContain('<<<<<<< HEAD')
			expect(textItem.data.text).toContain('=======')
			expect(textItem.data.text).toContain('>>>>>>> remote')
		})

		it('should remove shared suffix lines from conflict markers', () => {
			const baseText = 'config: base\n# Base comment\n'
			const localText = 'debug: true\n# Local development settings\n'
			const remoteText = 'ssl: enabled\n# Production overrides\n'

			const base = note([text(baseText)])
			const local = note([text(localText)])
			const remote = note([text(remoteText)])

			const result = resolver.resolveConflict(base, local, remote)

			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')

			// Should not have the shared blank line at the end of conflict markers
			expect(textItem.data.text).not.toMatch(/=======\n.*\n\n>>>>>>> remote/)

			// But should still contain the conflict content
			expect(textItem.data.text).toContain('debug: true')
			expect(textItem.data.text).toContain('ssl: enabled')
		})

		it('should handle both shared prefix and suffix', () => {
			const baseText = '\nconfig: base\n'
			const localText = '\ndebug: true\n'
			const remoteText = '\nssl: enabled\n'

			const base = note([text(baseText)])
			const local = note([text(localText)])
			const remote = note([text(remoteText)])

			const result = resolver.resolveConflict(base, local, remote)

			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.mergeType).toBe('merged')

			// Should not have shared blank lines in conflict markers
			expect(textItem.data.text).not.toMatch(/<<<<<<< HEAD\n\n/)
			expect(textItem.data.text).not.toMatch(/\n\n>>>>>>> remote/)

			// Should contain the actual differing content
			expect(textItem.data.text).toContain('debug: true')
			expect(textItem.data.text).toContain('ssl: enabled')
		})

		it('should not create empty conflicts when everything is shared', () => {
			const baseText = '\nshared content\n'
			const localText = '\nshared content\n'
			const remoteText = '\nshared content\n'

			const base = note([text(baseText)])
			const local = note([text(localText)])
			const remote = note([text(remoteText)])

			const result = resolver.resolveConflict(base, local, remote)

			const textItem = result.items.find(item => item.type === 'text') as MergeableTextItem
			expect(textItem).toBeDefined()
			expect(textItem.data.text).toBe('\nshared content\n')
			expect(textItem.data.text).not.toContain('<<<<<<< HEAD')
		})
	})
})
