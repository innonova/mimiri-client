import { expect } from '@playwright/test'
import { mimiri } from '../framework/mimiri-context'
import { titleBar } from '../selectors'
import { createRootNote } from '../notes/actions'
import { ensureEditorMode, type EditorMode } from './mode'

export * from './mode'

// Open the app account-less, create a note to work in, and switch to the
// requested editor mode. Fresh contexts start in the app default (ProseMirror
// on a new install); 'code' tests opt into Monaco via the toolbar toggle.
export const openNoteInMode = async (mode: EditorMode, name = 'Editor Test Note') => {
	await mimiri().home()
	await expect(titleBar.accountButton()).toBeVisible()
	await createRootNote(name)
	await ensureEditorMode(mode)
}
