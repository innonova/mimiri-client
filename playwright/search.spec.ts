import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { note, searchBox, titleBar } from './selectors'
import { createTestTree } from './notes/actions'
import { ensureEditorMode, focusEditor } from './editor/mode'
import type { StandardTreeNode } from './notes/data'

// Search all notes: term entry in the title bar, tree filtering to matches
// and their ancestors, term highlighting in the opened note is covered in
// editor.spec.ts ('global search term is highlighted when opening a result').

const searchTree: StandardTreeNode[] = [
	{
		title: 'Recipes',
		text: 'collection of things to cook',
		children: [
			{ title: 'Pasta', text: 'Cook the Spaghetti until al dente' },
			{ title: 'Salad', text: 'Fresh greens with vinaigrette' },
		],
	},
	{
		title: 'Work Notes',
		text: 'various work related notes',
		children: [{ title: 'Meeting Minutes', text: 'Discussed spaghetti code refactoring' }],
	},
]

const setup = async () => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createTestTree(searchTree)
}

const search = async (term: string) => {
	await titleBar.searchInput().fill(term)
	await titleBar.searchInput().press('Enter')
}

test.describe('search all notes', () => {
	test('filters the tree to matches and their ancestors', async () => {
		await withMimiriContext(async () => {
			await setup()
			// Case-insensitive text match ('Spaghetti' / 'spaghetti')
			await search('spaghetti')
			await expect(searchBox.term()).toHaveText('spaghetti')

			await expect(note.item('Pasta')).toBeVisible()
			await expect(note.item('Meeting Minutes')).toBeVisible()
			// Ancestors of matches stay visible for context
			await expect(note.item('Recipes')).toBeVisible()
			await expect(note.item('Work Notes')).toBeVisible()
			// Non-matching siblings are filtered out
			await expect(note.item('Salad')).not.toBeVisible()

			// The first match is selected automatically
			await expect(note.selectedItem()).toContainText('Pasta')
		})
	})

	test('matches note titles as well as text', async () => {
		await withMimiriContext(async () => {
			await setup()
			await search('meeting')
			await expect(note.item('Meeting Minutes')).toBeVisible()
			await expect(note.item('Work Notes')).toBeVisible()
			await expect(note.item('Recipes')).not.toBeVisible()
			await expect(note.item('Pasta')).not.toBeVisible()
		})
	})

	test('shows the no-results message when nothing matches', async () => {
		await withMimiriContext(async () => {
			await setup()
			await search('xyzzy-not-in-any-note')
			await expect(searchBox.noResults()).toBeVisible()
			await expect(note.item('Recipes')).not.toBeVisible()
			await expect(note.item('Work Notes')).not.toBeVisible()
		})
	})

	test('closing the search restores the full tree', async () => {
		await withMimiriContext(async () => {
			await setup()
			await search('spaghetti')
			await expect(note.item('Salad')).not.toBeVisible()

			await searchBox.close().click()
			await expect(searchBox.term()).not.toBeVisible()
			await expect(note.item('Salad')).toBeVisible()
			await expect(note.item('Recipes')).toBeVisible()
		})
	})

	test('searching an empty term clears the search', async () => {
		await withMimiriContext(async () => {
			await setup()
			await search('spaghetti')
			await expect(note.item('Salad')).not.toBeVisible()

			await search('')
			await expect(searchBox.term()).not.toBeVisible()
			await expect(note.item('Salad')).toBeVisible()
		})
	})

	test('Ctrl+Shift+F focuses the global search from both editors', async () => {
		await withMimiriContext(async () => {
			await setup()
			await note.item('Pasta').click()

			await ensureEditorMode('wysiwyg')
			await focusEditor('wysiwyg')
			await mimiri().page.keyboard.press('Control+Shift+F')
			await expect(titleBar.searchInput()).toBeFocused()

			await ensureEditorMode('code')
			await focusEditor('code')
			await mimiri().page.keyboard.press('Control+Shift+F')
			await expect(titleBar.searchInput()).toBeFocused()
		})
	})
})
