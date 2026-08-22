# Editor

Notes are stored as **plain text** with a lightweight markdown-ish syntax (headings, `*`/`-` lists, `[ ]`/`[x]` checkboxes, blockquotes, code fences, `**bold**`, `*italic*`, `` `code` ``, password marks, and `<<<<<<< Local` / `>>>>>>>` conflict markers). Two editing engines operate on that same text behind one interface.

## `MimiriEditor` facade (`src/services/editor/mimiri-editor.ts`)

The singleton `mimiriEditor` (exported from `global.ts`) owns one `EditorMonaco` and one `EditorProseMirror`. Both are constructed eagerly but `init()`ed lazily on first use, and every call is delegated to `_activeEditor`. A reactive `_state` (`MimiriEditorState`: `canUndo`, `canRedo`, `changed`, `supportedActions`, `mode`) is fed from the engines' `onStateUpdated`.

The contract lives in `type.ts`:

- `TextEditor` — `setText`, `replaceText`, `resetBaseline`, `undo/redo`, `find`, `executeFormatAction`, `cut/copy/paste`, `readonly`, `text`, `changed`, …
- `TextEditorListener` — `onSaveRequested`, `onSearchAllRequested`, `onScroll`, `onPasswordClicked`, `onCopyNotification`, `onStateUpdated`
- `EditorPlugin` (`editor-plugin.ts`) — `getSupportedActions`, `executeFormatAction`, `show`, `updateText`, `active`

### Engine selection

`MimiriEditor.resolveEditor(note)`:

```
note.editorMode ?? (mimiriPlatform.isDesktop ? settingsManager.defaultEditor : settingsManager.defaultEditorMobile)
```

`'code'` → Monaco, but only if `mimiriPlatform.isDesktop || settingsManager.allowMonacoOnMobile`; otherwise ProseMirror (`'wysiwyg'`). So editor mode is **per note** (`NoteEditorMode`) with a global default.

`toggleEditMode()` copies text/scroll/readonly across, activates the other engine, and records a *pending* mode. `modeChanged` is deliberately not part of `changed` (switching views must not look like an unsaved edit) but rides along on the next save, which persists `note.editorMode`.

### Saving

`internal_save()` returns `SaveError = 'success' | 'note-size' | 'total-size' | 'lost-update' | 'not-saved-empty'` and retries on `VersionConflictError`. `NoteEditor.vue` routes errors to `limitDialog` / `infoDialog`. Saves are triggered on blur, on explicit save, and when switching notes.

### Find

Monaco uses its own find widget. ProseMirror has a custom find/replace whose state is `MimiriEditor.findState` (proxied to `EditorProseMirror.findState`) rendered by `components/EditorFindBar.vue`.

## Monaco side

`editor-monaco.ts` (`EditorMonaco implements TextEditor`) plus plugins in `monaco-editor/`: `ListPlugin`, `HeadingPlugin`, `CodeBlockPlugin`, `ConflictBlockPlugin`, `InlineMarkdownPlugin`, `PasswordPlugin`, `PasswordButtonsPlugin`, `MimiriCodeLensProvider`, `MimiriProvider`. Monaco edits the raw text and *decorates* it; it never transforms the stored content. `components/SelectionControl.vue` is Monaco-only.

## ProseMirror side

`editor-prosemirror.ts` plus `prosemirror/`:

- `mimiri-schema.ts` — custom nodes including `list_item` with `checked`/`marker`/`indent` attrs, `conflict_block`, code blocks; marks for bold/italic/code/password.
- `mimiri-deserializer.ts` — plain text → doc (regexes for headings, list items, checkboxes, blockquotes, code fences, conflict markers).
- `mimiri-serializer.ts` — doc → plain text (`**`, `*`, `` ` ``, and `p`…`` ` `` for password marks).
- `format-commands.ts`, `list-commands.ts`, `mimiri-input-rules.ts`, `syntax-highlighting.ts` (Shiki), `checkbox-list-item-view.ts`, `password-mark-view.ts`, `password-cursor-plugin.ts`, `code-block-action-handler.ts`, `conflict-action-handler.ts`.

**Invariant**: deserialize→serialize must round-trip the text Monaco would edit raw. Any change to the text syntax (new block type, new mark, changed list/checkbox markers, conflict-marker format) must be made in the deserializer, the serializer, *and* the matching Monaco plugin, and ideally covered by a Playwright test in `playwright/editor/`.

## Shared infrastructure

- `theme-manager.ts` — `EDITOR_THEMES` (`id`, `label`, `isDark`, `monacoTheme: 'mimiri-*'`, `shikiTheme`). Shiki bundled themes are converted to Monaco themes (`convertShikiThemeToMonaco` + `getMimiriTokenOverrides` for `password`, `checkbox`, `head1`, `conflict-*` tokens) in `initializeMonacoThemes()` called from `main.ts`. Both engines call `getThemeById(id, isDark)`. Syntax theme is independent of the UI light/dark theme; the picker is `components/settings/FontsColors.vue`.
- `textmate-setup.ts` — vscode-textmate + oniguruma WASM (`vscode-oniguruma/release/onig.wasm?url`), grammars lazily imported from `@shikijs/langs/*`.
- `language-suggestions.ts` — `LANGUAGE_DEFINITIONS`, `LANGUAGE_ALIASES`, `LANGUAGES_CURATED` for code-fence language autocomplete (`components/elements/AutoComplete.vue`).
- `highlighting.ts`, `editor-icons.ts` (inline SVG strings for editor widgets), `note-history.ts` (`NoteHistory`, read-only history view).

## `NoteEditor.vue`

Holds both container divs (`monacoContainer`, `proseMirrorContainer`, both hidden by default — the engines toggle visibility), calls `mimiriEditor.init(monaco, prosemirror, autoComplete, conflictBanner)` on mount, and drives the toolbar, history panel, save-on-blur and search highlighting. `elements/ConflictBanner.vue` is shown when the text contains conflict blocks after a 3-way merge.
