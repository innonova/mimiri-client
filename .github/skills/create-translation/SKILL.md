---
name: create-translation
description: Creates a brand-new translation of the app into a target language. Use when asked to add, create, or bootstrap a new language translation.
---

# Create Translation

## Purpose

Add a complete translation of the app into a new target language. This involves producing a new `src/lang/<lang>.json` that mirrors the structure of `src/lang/en.json` exactly, plus wiring the locale into the app so users can select it.

This skill is for **bootstrapping a new language**. To audit or improve an existing translation, use the `review-translation` skill instead.

## Source files (read these first)

- `src/lang/en.json` — the English source. The new file must mirror its **structure and key set exactly** (same namespaces, same keys, same nesting). No keys added, removed, or renamed.
- `src/lang/context.json` — **translator context notes**, mirroring the same namespace/key structure as `en.json`. **Read the relevant context entry before translating each string.** It tells you:
  - Where the string appears (dialog title, button, tooltip, error banner, splash, etc.)
  - The intended tone (e.g. "cautionary but not alarming", "neutral confirmation", "playful")
  - What each `{placeholder}` means and what type of value it carries
  - Caveats such as "do not translate the product name", "match punctuation of source", "contains a newline `\n`"
  - Each namespace usually has a `_context` entry describing the surrounding scope — read it before translating any key in that namespace.
- `src/lang/zh.json` — an existing reference translation. Useful for seeing how another non-English locale handled tricky strings (placeholder placement, line breaks, button length, etc.).

## Why context matters

A literal word-for-word translation is almost never correct. Examples of decisions that require context:

- **Tone**: `acceptShareDialog.warning` is a yellow security advisory — keep it cautionary, not alarming. A direct translation that sounds harsh is wrong even if grammatically perfect.
- **Placeholders**: `{count}`, `{name}`, `{size}`, etc. **must appear unchanged** in the translated string. Reordering around them is fine; renaming or omitting them is a bug.
- **Punctuation**: `context.json` often notes "no question mark in English — match the source style". Follow it.
- **Newlines**: Strings like `cannotAcceptNoteCount` contain literal `\n`. Preserve them exactly.
- **Brand names**: "Mimiri Notes", "innonova GmbH", "Discord", "Reddit", "GitHub", "FlatHub", "Snap Store", "AppStore", "Google Play", "Electron", etc. — do not translate.
- **HTML fragments**: Some values contain `<a>`, `<b>`, `<br />` tags. Preserve the markup; translate only the surrounding text.
- **UI length**: Buttons (`ok`, `cancel`, `save`, `delete`, etc.) appear in tight layouts. Prefer concise idiomatic equivalents over long literal renderings.

## Steps

1. **Confirm the target language code and display name** with the user if not already specified.
   - Use a short ISO 639-1 code where possible (e.g. `da` for Danish, `de` for German, `fr` for French, `es` for Spanish, `ja` for Japanese).
   - Decide the **native-language display label** shown in the language picker (e.g. `Dansk`, `Deutsch`, `Français`, `Español`, `日本語`). The convention is **native name only, identical across all locale files** — the picker shows each language in its own script so users can find their language regardless of the current UI language.

2. **Read `src/lang/en.json` in full** to understand the complete key set and string lengths.

3. **Read `src/lang/context.json` in full** (or at least skim every namespace). Keep it open as the authoritative reference while translating.

4. **Create `src/lang/<lang>.json`** by copying the structure of `en.json` exactly and translating each value.
   - Mirror the key structure 1:1. No additions, no removals, no renames.
   - For every key, **look up the matching context entry first** (same path in `context.json`; also read the parent namespace's `_context`). Translate to fit that context.
   - Preserve all `{placeholder}` tokens unchanged.
   - Preserve all `\n` newlines and HTML markup unchanged.
   - Leave brand names and proper nouns untranslated.
   - **English technical loanwords**: For many technical terms, the English word is more widely recognized in the target language than a native equivalent. Before coining a native compound, check whether the English term (e.g. "cloud", "sync", "backup", "cache", "app") is the standard in everyday use in that language. If it is, use the English loanword (following the target language's orthographic rules — e.g. `cloudkonto` in Danish rather than `skykonto`). When in doubt, prefer the form a native speaker would naturally say or type.
   - For the `settingsGeneral.languageEnglish` / `languageChinese` / etc. entries, the **value is the language name in its own native script and is identical in every locale file** (e.g. `"languageDanish": "Dansk"` in `en.json`, `zh.json`, `da.json`, etc.). Do not localize these — the picker shows each language in its own writing system.

5. **Add the new `language<Name>` key to every existing locale file** (`en.json`, `zh.json`, and any others) under `settingsGeneral`, so the picker label is localized in each language.

6. **Add the same key + context note to `src/lang/context.json`** under `settingsGeneral` so future reviews understand it.

7. **Wire the locale into the app**:
   - `src/main.ts` — `import <lang>Locale from './lang/<lang>.json'` and call `localization.register('<lang>', <lang>Locale)`.
   - `src/services/settings-manager.ts` — add `'<lang>'` to `SUPPORTED_LOCALES`.
   - `src/components/settings/General.vue` — add `<option value="<lang>">{{ $t('settingsGeneral.language<Name>') }}</option>` to the language `<select>`.

8. **Validate**:
   - The new JSON file must be valid JSON (no trailing commas, balanced braces).
   - Key count must match `en.json` exactly. A quick check:
     `node -e "const en=require('./src/lang/en.json'),x=require('./src/lang/<lang>.json');const k=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?k(v).map(s=>k+'.'+s):[k]);console.log(JSON.stringify(k(en))===JSON.stringify(k(x)))"`
     (or just diff the sorted key lists).
   - Every `{placeholder}` present in `en.json` must also be present in the matching `<lang>.json` value.
   - All `\n` and HTML tags from the source must be preserved.

## After creating the file

Recommend that the user run the `review-translation` skill on the new language once the initial pass is complete. That cycle harvests reviewed strings into `<lang>_accepted.json` so future drift can be detected.

## Output

Confirm the files created/modified:

- `src/lang/<lang>.json` (new)
- `src/lang/en.json`, `src/lang/zh.json`, ... (added `language<Name>` key)
- `src/lang/context.json` (added `language<Name>` context note)
- `src/main.ts`, `src/services/settings-manager.ts`, `src/components/settings/General.vue` (locale wiring)

Then summarize: number of strings translated, any keys where context was ambiguous and a judgment call was made, and any source strings that look problematic (e.g. brand names that look translatable, missing context entries) so the user can review.
