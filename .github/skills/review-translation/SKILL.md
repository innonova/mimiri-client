---
name: review-translation
description: Reviews a translation JSON file against the English source to identify strings that may need closer attention. Use when asked to review, check, or audit a translation file.
---

# Review Translation

## Purpose

Given a target language JSON file (e.g. `src/lang/zh.json`), identify translation strings that may be mistranslated, outdated, or culturally inconsistent by comparing them against the English source (`src/lang/en.json`).

## Steps

1. Run `node scripts/generate-translation-review.js <language>` (e.g. `node scripts/generate-translation-review.js zh`).
   - Produces `src/lang/<language>.review.json` — every key with `en`, `<lang>`, and `<lang>_en: ""`.
   - Keys missing from the target or present only in the target are flagged as `"missing"` or `"stale"`.
   - Keys already present in `src/lang/<language>_accepted.json` (with matching `en` and `<lang>` values) are automatically skipped — they have been reviewed before and need no re-translation.

2. Read `src/lang/<language>.review.json` and fill in every `<lang>_en` field with a **raw literal translation** of the `<lang>` value into English.
   - Translate what is there, word-for-word — do not interpret, normalize, or equate to `en`.
   - Do not skip any entry. Do not set `<lang>_en` equal to `en` even if they seem equivalent.
   - Write the updated `src/lang/<language>.review.json` with all `<lang>_en` fields populated.

3. Run `node scripts/generate-translation-review.js <language> --diff`.
   - Reads the annotated review file and writes `src/lang/<language>.review-diff.json`.
   - Entries where the normalized `<lang>_en` is equivalent to `en` are excluded automatically by the script.
   - Entries already in `src/lang/<language>_accepted.json` (with matching `en` + `<lang>`) are also excluded.
   - Remaining entries form the diff file.

4. Read `src/lang/<language>.review-diff.json` and for each entry add:
   - **Before judging the entry**, look up the corresponding context note in `src/lang/context.json` (same namespace/key path; also check the parent namespace's `_context` for surrounding scope). Use it to understand where the string appears, its tone, what the placeholders mean, and any caveats. The recommendation must reflect that context — e.g. a "cautionary but not alarming" warning string is judged on tone, a button label on brevity, an error with `{count}` on placeholder fidelity.
   - `_note`: a concise explanation of how `<lang>` differs from `en`. Categories to call out:
     - Dropped phrase or word (e.g. "either" omitted)
     - Changed meaning or tone (cite the context-defined tone if relevant)
     - Cultural reference replaced with generic text
     - Placeholder (`{name}`) mismatch — always a bug
   - `_recommendation`: what you propose — e.g. `"accept"` (translation is fine as-is), `"modify: <suggested text>"` (provide a corrected translation), or `"flag"` (needs human review). When the context note materially influenced the call, mention it briefly (e.g. "context says tone must stay cautionary; zh is too alarming").
   - Edit `src/lang/<language>.review-diff.json` **directly** using the file-edit tool (e.g. `multi_replace_string_in_file` in batches). Do NOT write a helper script, inline `node -e` snippet, or any other indirection to mutate the file — every `_note` and `_recommendation` value is a judgement call that must be authored explicitly per entry, not generated programmatically.
   - For entries whose `<lang>_en` value is not unique across the file (e.g. repeated boilerplate strings), include the full key block (`"key": { "en": ..., "<lang>": ..., "<lang>_en": ... }`) as the match context so the edit targets the right entry.

5. After all entries in the diff file have a `_recommendation`, run `node scripts/generate-translation-review.js <language> --harvest [statuses]` to record those decisions.
   - Default `statuses` is `accept,flag,modify` (i.e. every entry that has been judged).
   - For each matching entry, the script appends `{ key: { en, <lang> } }` to `src/lang/<language>_accepted.json` (snapshotting the exact `en` and `<lang>` values reviewed) and removes the entry from `<language>.review-diff.json`.
   - On the next review cycle, those keys are skipped automatically. If either the `en` source or the `<lang>` translation later changes, the snapshot mismatch causes the entry to re-surface in the diff for re-review.
   - To harvest only a subset, pass a comma-separated list, e.g. `--harvest accept` to record only the unambiguous accepts and leave `flag` / `modify` entries in the diff for follow-up.

## Files

- `src/lang/<language>.review.json` — working file (Steps 1–2). Regenerated each cycle.
- `src/lang/<language>.review-diff.json` — review surface (Steps 3–4). Regenerated each cycle.
- `src/lang/<language>_accepted.json` — **persistent** record of reviewed decisions (Step 5). Commit this; it is the memory of the review process.

## Output

Confirm the files written: `<language>.review.json`, `<language>.review-diff.json`, and (after Step 5) `<language>_accepted.json`. Then summarize the number of diverging keys and highlight any that look like clear mistranslations, dropped phrases, placeholder mismatches, or significant cultural substitutions.

- Interpolation placeholders like `{count}` or `{name}` must appear in both translations — a mismatch here is always a bug.
- Strings that are proper nouns, brand names, or code values (e.g. `"Mimiri Notes"`) should be identical in both files and can be skipped.
- If a key exists in `en.json` but is missing from the target file, flag it as missing.
- If a key exists in the target file but not in `en.json`, flag it as stale.
