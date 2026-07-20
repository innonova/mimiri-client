import { expect } from '@playwright/test'
import { mimiri } from '../framework/mimiri-context'
import { titleBar } from '../selectors'
import { createRootNote } from '../notes/actions'
import { ensureEditorMode, persistEditorMode, type EditorMode } from './mode'

export * from './mode'

// Open the app account-less, create a note to work in, and switch to the
// requested editor mode via the toolbar toggle. The toggle only records a
// pending per-note choice, so persist it right away — later note switches
// and reloads must find the note already in the requested mode.
export const openNoteInMode = async (mode: EditorMode, name = 'Editor Test Note') => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createRootNote(name)
	await ensureEditorMode(mode)
	await persistEditorMode(mode)
}
