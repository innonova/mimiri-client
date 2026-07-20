/**
 * Generates a side-by-side review file for a translation JSON.
 * After the AI has filled in the <lang>_en back-translations, run with --diff
 * to generate the diff file from the annotated review.
 *
 * Usage:
 *   node scripts/generate-translation-review.js <language>
 *       — generate review file (skips entries already in <lang>_accepted.json)
 *   node scripts/generate-translation-review.js <language> --diff
 *       — generate diff from review (skips entries already in <lang>_accepted.json)
 *   node scripts/generate-translation-review.js <language> --harvest [statuses]
 *       — move entries from review-diff.json whose _recommendation starts with one
 *         of the given statuses (default: accept,flag,modify) into <lang>_accepted.json
 *         and remove them from the diff file. Statuses are comma-separated.
 *
 * review.json entry shapes:
 *   - { en, <lang>, <lang>_en }        — present in both files (AI fills in <lang>_en)
 *   - { status: "missing", en }        — key in en.json only
 *   - { status: "stale", <lang> }      — key in target only
 *
 * <lang>_accepted.json shape:
 *   {
 *     "key.path": {
 *       "en": "...",
 *       "<lang>": "...",
 *       "<lang>_en": "...",        // back-translation captured at harvest time
 *       "_note": "...",            // reviewer note from the diff entry
 *       "_recommendation": "..."   // reviewer recommendation (accept/modify/flag/...)
 *     },
 *     ...
 *   }
 *   Drift detection is keyed on en + <lang> only — if either later changes, the entry
 *   re-appears in the diff for re-review. The other fields are kept as a record of the
 *   prior decision and are not used for matching.
 *
 * diff.json is generated from an annotated review.json. Entries whose <lang>_en is
 * empty or exactly equal to en are excluded (the AI signals "equivalent" by leaving
 * <lang>_en blank or copying en verbatim). Remaining entries keep <lang>_en and _note.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const lang = process.argv[2]
const mode = process.argv[3]
if (!lang) {
	console.error('Usage: node generate-translation-review.js <language> [--diff | --harvest [statuses]]')
	console.error('Example: node generate-translation-review.js zh')
	console.error('         node generate-translation-review.js zh --diff')
	console.error('         node generate-translation-review.js zh --harvest accept,flag,modify')
	process.exit(1)
}

const enPath = join(__dirname, '../src/lang/en.json')
const targetPath = join(__dirname, `../src/lang/${lang}.json`)
const reviewPath = join(__dirname, `../src/lang/${lang}.review.json`)
const diffPath = join(__dirname, `../src/lang/${lang}.review-diff.json`)
const acceptedPath = join(__dirname, `../src/lang/${lang}_accepted.json`)

function loadAccepted() {
	if (!existsSync(acceptedPath)) {
		return {}
	}
	try {
		return JSON.parse(readFileSync(acceptedPath, 'utf-8'))
	} catch {
		console.error(`Could not parse ${acceptedPath}; ignoring.`)
		return {}
	}
}

// An accepted entry suppresses the key from review/diff only while both en and
// <lang> still match the snapshot taken when it was harvested. If either drifts,
// the entry re-surfaces so a human can re-evaluate.
function isStillAccepted(accepted, key, enVal, targetVal) {
	const entry = accepted[key]
	if (!entry) {
		return false
	}
	return entry.en === enVal && entry[lang] === targetVal
}

function sortKeys(obj) {
	const out = {}
	for (const k of Object.keys(obj).sort()) {
		out[k] = obj[k]
	}
	return out
}

// --- Harvest mode: move reviewed entries from diff into accepted ---
if (mode === '--harvest') {
	const rawStatuses = process.argv[4]
	const statuses = (rawStatuses ? rawStatuses.split(',') : ['accept', 'flag', 'modify'])
		.map(s => s.trim().toLowerCase())
		.filter(Boolean)
	let diff
	try {
		diff = JSON.parse(readFileSync(diffPath, 'utf-8'))
	} catch {
		console.error(`Could not read diff file at ${diffPath}`)
		process.exit(1)
	}
	const accepted = loadAccepted()
	let harvested = 0
	let skippedNoRec = 0
	let skippedOtherStatus = 0
	const remaining = {}
	for (const [key, entry] of Object.entries(diff)) {
		const rec = entry._recommendation
		if (typeof rec !== 'string' || rec.length === 0) {
			remaining[key] = entry
			skippedNoRec++
			continue
		}
		const recStatus = rec.split(/[\s:]/, 1)[0].toLowerCase()
		if (!statuses.includes(recStatus)) {
			remaining[key] = entry
			skippedOtherStatus++
			continue
		}
		if (entry.en === undefined || entry[lang] === undefined) {
			// status: missing/stale entries don't have both sides; skip
			remaining[key] = entry
			skippedOtherStatus++
			continue
		}
		accepted[key] = {
			en: entry.en,
			[lang]: entry[lang],
			[`${lang}_en`]: entry[`${lang}_en`],
			_note: entry._note,
			_recommendation: entry._recommendation,
		}
		harvested++
	}
	writeFileSync(acceptedPath, JSON.stringify(sortKeys(accepted), null, '\t'))
	writeFileSync(diffPath, JSON.stringify(remaining, null, '\t'))
	console.log(`Statuses harvested: ${statuses.join(', ')}`)
	console.log(`Written: ${acceptedPath}  (${Object.keys(accepted).length} total accepted)`)
	console.log(`Updated: ${diffPath}  (${Object.keys(remaining).length} entries remain)`)
	console.log(`Harvested:           ${harvested}`)
	if (skippedNoRec) {
		console.log(`Skipped (no _recommendation):  ${skippedNoRec}`)
	}
	if (skippedOtherStatus) {
		console.log(`Skipped (other status):        ${skippedOtherStatus}`)
	}
	process.exit(0)
}

// --- Diff mode: read annotated review.json and write diff.json ---
if (mode === '--diff') {
	let review
	try {
		review = JSON.parse(readFileSync(reviewPath, 'utf-8'))
	} catch {
		console.error(`Could not read review file at ${reviewPath}`)
		console.error('Run without --diff first to generate the review file.')
		process.exit(1)
	}
	const accepted = loadAccepted()
	const diff = {}
	let kept = 0
	let removed = 0
	let skippedAccepted = 0
	for (const [key, entry] of Object.entries(review)) {
		if (entry.status === 'missing' || entry.status === 'stale') {
			diff[key] = entry
			kept++
		} else if (entry[`${lang}_en`] !== undefined) {
			if (isStillAccepted(accepted, key, entry.en, entry[lang])) {
				skippedAccepted++
				continue
			}
			const backTranslation = entry[`${lang}_en`]
			// Exclude entries where AI determined back-translation equals original en
			if (backTranslation === '' || backTranslation === entry.en) {
				removed++
			} else {
				diff[key] = entry
				kept++
			}
		}
	}
	writeFileSync(diffPath, JSON.stringify(diff, null, '\t'))
	console.log(`Written: ${diffPath}`)
	console.log(`Kept:    ${kept}  (diverging entries)`)
	console.log(`Removed: ${removed}  (equivalent — back-translation matches en)`)
	if (skippedAccepted) {
		console.log(`Skipped: ${skippedAccepted}  (already in ${lang}_accepted.json with matching en/${lang})`)
	}
	process.exit(0)
}

let en, target
try {
	en = JSON.parse(readFileSync(enPath, 'utf-8'))
} catch {
	console.error(`Could not read en.json at ${enPath}`)
	process.exit(1)
}
try {
	target = JSON.parse(readFileSync(targetPath, 'utf-8'))
} catch {
	console.error(`Could not read ${lang}.json at ${targetPath}`)
	process.exit(1)
}

function flatten(obj, prefix = '') {
	return Object.entries(obj).reduce((acc, [key, value]) => {
		const fullKey = prefix ? `${prefix}.${key}` : key
		if (typeof value === 'object' && value !== null) {
			Object.assign(acc, flatten(value, fullKey))
		} else {
			acc[fullKey] = value
		}
		return acc
	}, {})
}

const flatEn = flatten(en)
const flatTarget = flatten(target)

const allKeys = [...new Set([...Object.keys(flatEn), ...Object.keys(flatTarget)])]

// Normalize strings for semantic equivalence checks.
// Treats "{x} of your {y}" and "{x} / {y}" as equivalent.
function normalize(str) {
	return str.replace(/\{(\w+)\} of your \{(\w+)\}/g, '{$1} / {$2}')
}

// Returns true if both strings are equivalent under known cross-language patterns:
// - EN uses "{x} of your {y}", target uses "{x} / {y}" (same placeholder sequence)
function isNormalizedEquivalent(enVal, targetVal) {
	if (!normalize(enVal).includes(' / ') || !targetVal.includes(' / ')) {
		return false
	}
	const getPlaceholders = str => (str.match(/\{\w+\}/g) || []).join(',')
	return getPlaceholders(enVal) === getPlaceholders(targetVal)
}

const review = {}
const accepted = loadAccepted()
let missingCount = 0
let staleCount = 0
let identicalCount = 0
let equivalentCount = 0
let reviewCount = 0
let acceptedSkipCount = 0

for (const key of allKeys) {
	const enVal = flatEn[key]
	const targetVal = flatTarget[key]

	if (enVal === undefined) {
		review[key] = { status: 'stale', [lang]: targetVal }
		staleCount++
	} else if (targetVal === undefined) {
		review[key] = { status: 'missing', en: enVal }
		missingCount++
	} else if (isStillAccepted(accepted, key, enVal, targetVal)) {
		acceptedSkipCount++
	} else if (enVal === targetVal || normalize(enVal) === normalize(targetVal)) {
		review[key] = { en: enVal, [lang]: targetVal, [`${lang}_en`]: '' }
		identicalCount++
	} else if (isNormalizedEquivalent(enVal, targetVal)) {
		review[key] = { en: enVal, [lang]: targetVal, [`${lang}_en`]: '' }
		equivalentCount++
	} else {
		review[key] = { en: enVal, [lang]: targetVal, [`${lang}_en`]: '' }
		reviewCount++
	}
}

writeFileSync(reviewPath, JSON.stringify(review, null, '\t'))

console.log(`Written: ${reviewPath}`)
console.log(`Total keys:    ${allKeys.length}`)
console.log(`To review:     ${reviewCount}  (values differ — fill in ${lang}_en then run --diff)`)
if (identicalCount) {
	console.log(`Identical:     ${identicalCount}  (same in both — likely untranslated)`)
}
if (equivalentCount) {
	console.log(`Equivalent:    ${equivalentCount}  (normalized pattern match — e.g. "of your" vs "/")`)
}
if (missingCount) {
	console.log(`Missing:       ${missingCount}  (in en.json but not in ${lang}.json)`)
}
if (staleCount) {
	console.log(`Stale:         ${staleCount}  (in ${lang}.json but not in en.json)`)
}
if (acceptedSkipCount) {
	console.log(`Accepted:      ${acceptedSkipCount}  (skipped — already in ${lang}_accepted.json)`)
}
