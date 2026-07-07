import { expect, test } from '@playwright/test'
import { mimiri, withMimiriContext } from './framework/mimiri-context'
import { editor, editorHistory, menu, note, titleBar } from './selectors'
import { createCloudAccount, saveNote } from './core/actions'
import { createRootNote } from './notes/actions'
import { findUI } from './editor/find'
import {
	clickUntil,
	editorModes,
	ensureEditorMode,
	expectToolbarButtonDisabled,
	expectToolbarButtonEnabled,
	focusEditor,
	openNoteInMode,
	readRawText,
	selectAllInEditor,
	selectLineInEditor,
	surface,
	typeInEditor,
	visibleText,
	type EditorMode,
} from './editor/actions'

// The same behavior contract is exercised against both editors: Monaco
// ('code') and ProseMirror ('wysiwyg'). Raw-text assertions go through
// readRawText, which reads the serialized note text in the code editor —
// from wysiwyg mode that round-trips the serializer via the mode toggle.
// DOM assertions differ per mode where the editors render differently.

for (const mode of editorModes) {
	test.describe(`editor (${mode})`, () => {
		test('type, save and persist across reload', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Persistent content 123')
				await saveNote()
				await mimiri().reload()
				await expect(surface(mode)).toBeVisible()
				await expect.poll(() => visibleText(mode)).toBe('Persistent content 123')
			})
		})

		test('save button tracks changed state', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await expectToolbarButtonDisabled(editor.save())
				await typeInEditor(mode, 'dirty')
				await expectToolbarButtonEnabled(editor.save())
				await saveNote()
				await expectToolbarButtonDisabled(editor.save())
			})
		})

		test('undo and redo restore text', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				// A fresh note has nothing to undo or redo
				await expectToolbarButtonDisabled(editor.undo())
				await expectToolbarButtonDisabled(editor.redo())
				await typeInEditor(mode, 'Hello world')
				await expect.poll(() => visibleText(mode)).toBe('Hello world')
				await expectToolbarButtonEnabled(editor.undo())
				await expectToolbarButtonDisabled(editor.redo())
				await clickUntil(editor.undo(), async () => (await visibleText(mode)) === '')
				// Everything undone: redo becomes available, undo exhausted
				await expectToolbarButtonEnabled(editor.redo())
				await expectToolbarButtonDisabled(editor.undo())
				await clickUntil(editor.redo(), async () => (await visibleText(mode)) === 'Hello world')
				await expectToolbarButtonEnabled(editor.undo())
				await expectToolbarButtonDisabled(editor.redo())
			})
		})

		test('undo and redo keyboard shortcuts', async () => {
			await withMimiriContext(async () => {
				// Undo grouping differs between the editors, so press until the
				// condition holds rather than a fixed number of times
				const pressUntil = async (key: string, condition: () => Promise<boolean>) => {
					for (let i = 0; i < 30 && !(await condition()); i++) {
						await mimiri().page.keyboard.press(key)
						await mimiri().waitForTimeout(50)
					}
					await expect.poll(condition, { timeout: 2000 }).toBe(true)
				}
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Hello world')
				await expect.poll(() => visibleText(mode)).toBe('Hello world')
				await pressUntil('Control+z', async () => (await visibleText(mode)) === '')
				await pressUntil('Control+y', async () => (await visibleText(mode)) === 'Hello world')
			})
		})

		test('Ctrl+S saves the note', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'saved by shortcut')
				await expectToolbarButtonEnabled(editor.save())
				await mimiri().page.keyboard.press('Control+s')
				await expectToolbarButtonDisabled(editor.save())
				await mimiri().reload()
				await expect(surface(mode)).toBeVisible()
				await expect.poll(() => visibleText(mode)).toBe('saved by shortcut')
			})
		})

		test('insert heading cycles levels', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Title')
				await editor.insertHeading().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('h1')).toHaveText('Title')
				}
				expect(await readRawText(mode)).toContain('# Title')
				await focusEditor(mode)
				await editor.insertHeading().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('h2')).toHaveText('Title')
				}
				expect(await readRawText(mode)).toContain('## Title')
			})
		})

		test('insert checkbox list', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Task one')
				await editor.insertCheckboxList().click()
				if (mode === 'wysiwyg') {
					const item = editor.proseMirror().locator('li[data-item-type="task"]')
					await expect(item).toHaveCount(1)
					await expect(item).toHaveAttribute('data-checked', 'false')
					await expect(item.locator('input.task-checkbox')).toBeVisible()
					await expect(item).toContainText('Task one')
				}
				expect(await readRawText(mode)).toMatch(/(- )?\[ \] Task one/)
			})
		})

		test('insert unordered list', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Item one')
				await editor.insertUnorderedList().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('ul li')).toContainText('Item one')
				}
				expect(await readRawText(mode)).toContain('- Item one')
			})
		})

		test('insert ordered list', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Item one')
				await editor.insertOrderedList().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('ol li')).toContainText('Item one')
				}
				expect(await readRawText(mode)).toContain('1. Item one')
			})
		})

		test('single-line selection becomes inline code', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'inlinecode')
				await selectAllInEditor(mode)
				await editor.insertCodeBlock().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('code')).toHaveText('inlinecode')
				}
				expect(await readRawText(mode)).toContain('`inlinecode`')
			})
		})

		test('insert code block on empty selection', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'const x = 1')
				await editor.insertCodeBlock().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('pre')).toContainText('const x = 1')
				}
				const raw = await readRawText(mode)
				expect(raw).toContain('```')
				expect(raw).toContain('const x = 1')
			})
		})

		test('mark and unmark selection as password', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'hunter2')
				await selectLineInEditor(mode)
				await editor.markAsPassword().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('.password-wrapper')).toHaveCount(1)
				} else {
					await expect(editor.monaco().locator('.password-content')).not.toHaveCount(0)
				}
				expect(await readRawText(mode)).toContain('p`hunter2`')
				// Unmark: place the caret inside the password, then toggle again
				await focusEditor(mode)
				if (mode === 'wysiwyg') {
					await editor.proseMirror().locator('.password-wrapper').click()
				} else {
					await editor.monaco().locator('.password-content').first().click()
				}
				await editor.markAsPassword().click()
				if (mode === 'wysiwyg') {
					await expect(editor.proseMirror().locator('.password-wrapper')).toHaveCount(0)
				}
				const raw = await readRawText(mode)
				expect(raw).toContain('hunter2')
				expect(raw).not.toContain('p`')
			})
		})

		test('copy password to clipboard', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'hunter2')
				await selectLineInEditor(mode)
				await editor.markAsPassword().click()
				if (mode === 'wysiwyg') {
					const copyButton = editor.proseMirror().locator('.password-wrapper .password-btn').first()
					await copyButton.dispatchEvent('mousedown')
				} else {
					// The Monaco widget appears when the caret is inside the password
					await editor.monaco().locator('.password-content').first().click()
					const copyButton = mimiri().page.locator('.monaco-password-buttons .monaco-password-btn').first()
					await expect(copyButton).toBeVisible()
					await copyButton.click()
				}
				const clipboard = await mimiri().getClipboardText()
				expect(clipboard).toBe('hunter2')
			})
		})

		test('switching notes implicitly saves unsaved changes', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await createRootNote('Second Note')
				await note.item('Editor Test Note').click()
				await ensureEditorMode(mode)
				await typeInEditor(mode, 'implicitly saved')
				await expectToolbarButtonEnabled(editor.save())
				// Switching away saves the dirty note without an explicit save
				await note.item('Second Note').click()
				await expect.poll(() => visibleText(mode)).toBe('')
				await note.item('Editor Test Note').click()
				await expect.poll(() => visibleText(mode)).toBe('implicitly saved')
				await expectToolbarButtonDisabled(editor.save())
				// And the content survives a reload
				await mimiri().reload()
				await expect(surface(mode)).toBeVisible()
				await expect.poll(() => visibleText(mode)).toBe('implicitly saved')
			})
		})

		test('toggle edit mode preserves unsaved changes', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				const otherMode: EditorMode = mode === 'code' ? 'wysiwyg' : 'code'
				await typeInEditor(mode, 'Unsaved text 123')
				await expectToolbarButtonEnabled(editor.save())
				await ensureEditorMode(otherMode)
				await expect.poll(() => visibleText(otherMode)).toBe('Unsaved text 123')
				await expectToolbarButtonEnabled(editor.save())
				await ensureEditorMode(mode)
				await expect.poll(() => visibleText(mode)).toBe('Unsaved text 123')
				await saveNote()
				await mimiri().reload()
				await expect(surface(mode)).toBeVisible()
				await expect.poll(() => visibleText(mode)).toBe('Unsaved text 123')
			})
		})

		// Find/replace behavior contract — identical in both editors; findUI maps
		// to the Mimiri find bar (wysiwyg) or Monaco's built-in widget (code).
		test('find: opens, counts and navigates matches', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'alpha one\nbeta two\nalpha three\nalpha four')
				await mimiri().page.keyboard.press('Control+f')
				await expect(findUI.bar(mode)).toBeVisible()
				await expect(findUI.input(mode)).toBeFocused()

				await findUI.input(mode).fill('alpha')
				// Typing live-selects the nearest match
				await expect(findUI.count(mode)).toHaveText('1 of 3')

				await mimiri().page.keyboard.press('Enter')
				await expect(findUI.count(mode)).toHaveText('2 of 3')

				await findUI.next(mode).click()
				await expect(findUI.count(mode)).toHaveText('3 of 3')
				await findUI.prev(mode).click()
				await expect(findUI.count(mode)).toHaveText('2 of 3')

				await mimiri().page.keyboard.press('Escape')
				await expect(findUI.bar(mode)).not.toBeVisible()
			})
		})

		test('find: seeds from selection and respects match case', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'Alpha and alpha')
				// Select the word 'Alpha' at the start of the line
				await mimiri().page.keyboard.press('Home')
				for (let i = 0; i < 5; i++) {
					await mimiri().page.keyboard.press('Shift+ArrowRight')
				}
				await mimiri().page.keyboard.press('Control+f')
				await expect(findUI.bar(mode)).toBeVisible()
				await expect(findUI.input(mode)).toHaveValue('Alpha')
				// The seeded selection is itself the first match
				await expect(findUI.count(mode)).toHaveText('1 of 2')

				await findUI.caseToggle(mode).click()
				await expect(findUI.count(mode)).toHaveText('1 of 1')
				await findUI.caseToggle(mode).click()
				// The editors differ in which match is current after re-toggling;
				// the contract is the total going back to 2
				await expect(findUI.count(mode)).toHaveText(/of 2$/)
			})
		})

		test('find: whole word and regex toggles affect matches', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'cat catalog cat colour')
				await mimiri().page.keyboard.press('Control+f')
				await expect(findUI.bar(mode)).toBeVisible()

				await findUI.input(mode).fill('cat')
				await expect(findUI.count(mode)).toHaveText('1 of 3')
				await findUI.wholeWordToggle(mode).click()
				await expect(findUI.count(mode)).toHaveText('1 of 2')
				await findUI.wholeWordToggle(mode).click()
				await expect(findUI.count(mode)).toHaveText('1 of 3')

				await findUI.input(mode).fill('colou?r')
				await expect(findUI.count(mode)).toHaveText('No results')
				await findUI.regexToggle(mode).click()
				await expect(findUI.count(mode)).toHaveText('1 of 1')
			})
		})

		test('find: Escape closes, F3 reopens with the last term', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'alpha one\nalpha two\nalpha three')
				await mimiri().page.keyboard.press('Control+f')
				await findUI.input(mode).fill('alpha')
				await expect(findUI.count(mode)).toHaveText('1 of 3')

				await mimiri().page.keyboard.press('Escape')
				await expect(findUI.bar(mode)).not.toBeVisible()

				// Escape returned focus to the editor; F3 reopens with the last
				// term and moves to the next match (must not be swallowed by the
				// global search-all-notes shortcut)
				await mimiri().page.keyboard.press('F3')
				await expect(findUI.bar(mode)).toBeVisible()
				await expect(findUI.input(mode)).toHaveValue('alpha')
				await expect(findUI.count(mode)).toHaveText('2 of 3')

				await mimiri().page.keyboard.press('Shift+F3')
				await expect(findUI.count(mode)).toHaveText('1 of 3')

				await mimiri().page.keyboard.press('Escape')
				await expect(findUI.bar(mode)).not.toBeVisible()
			})
		})

		test('replace: replace one and replace all update the text', async () => {
			await withMimiriContext(async () => {
				await openNoteInMode(mode)
				await typeInEditor(mode, 'alpha one\nalpha two\nalpha three')
				await mimiri().page.keyboard.press('Control+h')
				await expect(findUI.bar(mode)).toBeVisible()
				await expect(findUI.replaceInput(mode)).toBeVisible()

				await findUI.input(mode).fill('alpha')
				// Typing live-selects the first match, so replace acts on it directly
				await expect(findUI.count(mode)).toHaveText('1 of 3')
				await findUI.replaceInput(mode).fill('beta')

				await findUI.replaceButton(mode).click()
				await expect.poll(() => visibleText(mode)).toBe('beta one alpha two alpha three')
				await expect(findUI.count(mode)).toHaveText('1 of 2')

				await findUI.replaceAllButton(mode).click()
				await expect.poll(() => visibleText(mode)).toBe('beta one beta two beta three')
				await expect(findUI.count(mode)).toHaveText('No results')

				// Escape from the replace input closes the widget
				await findUI.replaceInput(mode).press('Escape')
				await expect(findUI.bar(mode)).not.toBeVisible()

				// Replaced text is the real note text (serializer round-trip)
				expect(await readRawText(mode)).toBe('beta one\nbeta two\nbeta three')
			})
		})
	})
}

test.describe('editor (code only)', () => {
	test('find in note opens find widget', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('code')
			await typeInEditor('code', 'findable content')
			await mimiri().page.keyboard.press('Control+f')
			await expect(editor.monacoContainer().locator('.find-widget')).toBeVisible()
			// The 'Find in Selection' toggle is deliberately hidden (monaco-editor.css)
			await expect(editor.monacoContainer().locator('.find-widget .codicon-find-selection')).not.toBeVisible()
		})
	})

	test('word wrap toggle', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('code')
			await expect(editor.toggleWordWrap()).toBeVisible()
			// Word wrap defaults to on
			await expect(editor.toggleWordWrap().locator('.bg-toolbar-toggled')).not.toHaveCount(0)
			await editor.toggleWordWrap().click()
			await expect(editor.toggleWordWrap().locator('.bg-toolbar-toggled')).toHaveCount(0)
			await editor.toggleWordWrap().click()
			await expect(editor.toggleWordWrap().locator('.bg-toolbar-toggled')).not.toHaveCount(0)
		})
	})
})

test.describe('editor (wysiwyg only)', () => {
	test('find highlights use search-match decorations and clear on close', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('wysiwyg')
			await typeInEditor('wysiwyg', 'alpha one\nbeta two\nalpha three\nalpha four')
			await mimiri().page.keyboard.press('Control+f')
			await editor.findInput().fill('alpha')
			await expect(
				editor.proseMirror().locator('.ProseMirror-search-match, .ProseMirror-active-search-match'),
			).toHaveCount(3)
			await expect(editor.proseMirror().locator('.ProseMirror-active-search-match')).toHaveCount(1)

			await mimiri().page.keyboard.press('Escape')
			await expect(editor.proseMirror().locator('.ProseMirror-search-match')).toHaveCount(0)
		})
	})

	test('find bar and highlights persist across note switches', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Find A', 'shared alpha content')
			await createRootNote('Find B', 'shared beta content')

			await note.item('Find A').click()
			await ensureEditorMode('wysiwyg')
			await focusEditor('wysiwyg')
			await mimiri().page.keyboard.press('Control+f')
			await editor.findInput().fill('shared')
			await expect(editor.findCount()).toHaveText('1 of 1')

			await note.item('Find B').click()
			await expect(editor.findBar()).toBeVisible()
			await expect(editor.findCount()).toHaveText(/of 1/)
			await expect(
				editor.proseMirror().locator('.ProseMirror-search-match, .ProseMirror-active-search-match'),
			).toHaveCount(1)
		})
	})

	test('find works but replace is locked in read-only history view', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createCloudAccount()
			await createRootNote('History Note', 'version one findable')
			await ensureEditorMode('wysiwyg')
			await typeInEditor('wysiwyg', 'now version two ')
			await saveNote()

			await editor.history().click()
			await expect(editorHistory.container()).toBeVisible()
			await editorHistory.item(1).click()
			await expect.poll(() => visibleText('wysiwyg')).toBe('version one findable')

			// Find still works on the read-only document (opened via the Edit menu,
			// which also covers the menu path to find)
			await titleBar.edit().click()
			await menu.find().click()
			await expect(editor.findBar()).toBeVisible()
			await editor.findInput().fill('findable')
			await expect(editor.findCount()).toHaveText('1 of 1')

			// ...but replace is locked out
			await expect(editor.findToggleReplace()).toHaveClass(/text-toolbar-disabled/)
			await editor.findToggleReplace().click()
			await expect(editor.findReplaceInput()).not.toBeVisible()
		})
	})

	test('global search term is highlighted when opening a result', async () => {
		await withMimiriContext(async () => {
			await mimiri().home()
			await expect(titleBar.accountButton()).toBeVisible()
			await createRootNote('Search Target', 'the magic word appears here')
			await createRootNote('Other Note', 'nothing to see')
			await ensureEditorMode('wysiwyg')

			await titleBar.searchInput().fill('magic')
			await titleBar.searchInput().press('Enter')
			await note.item('Search Target').click()
			await expect(
				editor.proseMirror().locator('.ProseMirror-search-match, .ProseMirror-active-search-match'),
			).toHaveCount(1)
		})
	})

	test('markdown input rules create structure while typing', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('wysiwyg')
			await focusEditor('wysiwyg')
			const kbd = mimiri().page.keyboard

			await kbd.type('# Big Title')
			await expect(editor.proseMirror().locator('h1')).toHaveText('Big Title')

			await kbd.press('Enter')
			await kbd.type('- First bullet')
			await expect(editor.proseMirror().locator('ul li')).toContainText('First bullet')

			// Double Enter exits the list
			await kbd.press('Enter')
			await kbd.press('Enter')
			await kbd.type('1. Numbered')
			await expect(editor.proseMirror().locator('ol li')).toContainText('Numbered')

			await kbd.press('Enter')
			await kbd.press('Enter')
			await kbd.type('[ ] Task item')
			await expect(editor.proseMirror().locator('li[data-item-type="task"]')).toContainText('Task item')

			await kbd.press('Enter')
			await kbd.press('Enter')
			await kbd.type('`inline`')
			await expect(editor.proseMirror().locator('code')).toContainText('inline')

			// The typed structure serializes back to the expected markdown
			const raw = await readRawText('wysiwyg')
			expect(raw).toContain('# Big Title')
			expect(raw).toMatch(/- First bullet/)
			expect(raw).toMatch(/1[.)] Numbered/)
			expect(raw).toMatch(/\[ \] Task item/)
			expect(raw).toContain('`inline`')
		})
	})

	test('typing a URL converts it to a link', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('wysiwyg')
			await focusEditor('wysiwyg')
			// The URL input rule fires on the space after the URL
			await mimiri().page.keyboard.type('Visit https://example.com now')
			const link = editor.proseMirror().locator('a[href="https://example.com"]')
			await expect(link).toHaveText('https://example.com')
			// The surrounding text is not part of the link
			await expect(editor.proseMirror().locator('a')).toHaveCount(1)

			// The serialized text keeps the bare URL (round-trips through the
			// mode toggle), and coming back re-creates the link mark
			const raw = await readRawText('wysiwyg')
			expect(raw).toContain('Visit https://example.com now')
			await expect(editor.proseMirror().locator('a[href="https://example.com"]')).toBeVisible()
		})
	})

	test('word wrap button is hidden', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('wysiwyg')
			await expect(editor.toggleWordWrap()).not.toBeVisible()
		})
	})

	test('clicking a checkbox updates the underlying text', async () => {
		await withMimiriContext(async () => {
			await openNoteInMode('wysiwyg')
			await typeInEditor('wysiwyg', 'Task one')
			await editor.insertCheckboxList().click()
			const item = editor.proseMirror().locator('li[data-item-type="task"]')
			await expect(item).toHaveAttribute('data-checked', 'false')
			await item.locator('input.task-checkbox').click()
			await expect(item).toHaveAttribute('data-checked', 'true')
			expect(await readRawText('wysiwyg')).toMatch(/(- )?\[x\] Task one/)
			// And back
			await editor.proseMirror().locator('li[data-item-type="task"]').locator('input.task-checkbox').click()
			await expect(editor.proseMirror().locator('li[data-item-type="task"]')).toHaveAttribute('data-checked', 'false')
		})
	})
})
