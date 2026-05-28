import { describe, it, expect, jest } from '@jest/globals'

// note-importer.ts imports `ipcClient`, `infoDialog`, and `$t` from
// `../../global`. We only exercise private helpers in these tests, so we just
// need the module to load — replace it with the minimum surface area so we
// don't drag in the entire app bootstrap (Vue, MimiriStore, env vars, …).
jest.mock('../../global', () => ({
	ipcClient: {},
	infoDialog: { value: { show: jest.fn() } },
	$t: (key: string) => key,
}))

// `../types/guid` imports the ESM-only `uuid` package, which ts-jest can't
// transform out of the box. We only need unique strings for tests.
jest.mock('../types/guid', () => {
	let n = 0
	return {
		newGuid: () => `guid-${++n}`,
		emptyGuid: () => 'guid-empty',
	}
})

import { NoteImporter } from './note-importer'
import { Note } from '../types/note'
import { newGuid } from '../types/guid'
import { toBase64, fromBase64 } from '../hex-base64'

type RawFile = { path: string; isFolder: boolean; content: string }

const enc = new TextEncoder()
const dec = new TextDecoder()
const file = (path: string, text: string): RawFile => ({
	path,
	isFolder: false,
	content: toBase64(enc.encode(text)),
})
const folder = (path: string): RawFile => ({ path, isFolder: true, content: '' })

// Construct a fresh importer for each test. The constructor params are typed
// but only referenced inside public methods we never call, so passing nulls is
// fine for exercising the private helpers.
const newImporter = () => new NoteImporter(null as any, null as any, null as any)

// Run the same pipeline that `importAllNotes` runs, minus the I/O, UI, and
// MultiAction commit. Returns the in-memory tree state for assertions.
const buildTree = (files: RawFile[]) => {
	const importer = newImporter()
	const parsed = files.map(f => importer['parseFile'](f))
	const textFiles = parsed.filter(f => importer['isTextFile'](f))

	const importRoot = new Note()
	importRoot.keyName = newGuid()
	importRoot.changeItem('metadata').notes = []

	const created: Note[] = []
	const buildNote = importer['makeBuildNote'](created)
	const noteMap = importer['initNoteMap'](parsed, importRoot)
	importer['createFolderNotes'](parsed, textFiles, noteMap, buildNote)
	importer['attachTextFiles'](textFiles, noteMap, buildNote)

	return { importer, importRoot, created, noteMap }
}

const textOf = (note: Note | undefined) => (note?.has('text') ? note.getItem('text').text : undefined)
const titleOf = (note: Note | undefined) => note?.getItem('metadata').title
const childIdsOf = (note: Note) => note.getItem('metadata').notes as string[]

describe('NoteImporter', () => {
	describe('path helpers', () => {
		const i = newImporter()

		it('parseFile splits dir/name/depth', () => {
			expect(i['parseFile']({ path: 'a/b/c.md', isFolder: false, content: '' })).toMatchObject({
				dir: 'a/b',
				name: 'c.md',
				depth: 3,
			})
			expect(i['parseFile']({ path: 'top.md', isFolder: false, content: '' })).toMatchObject({
				dir: '',
				name: 'top.md',
				depth: 1,
			})
		})

		it('isTextFile accepts .md and .txt, rejects folders and other extensions', () => {
			const f = (path: string, isFolder = false) => i['parseFile']({ path, isFolder, content: '' })
			expect(i['isTextFile'](f('a.md'))).toBe(true)
			expect(i['isTextFile'](f('a.txt'))).toBe(true)
			expect(i['isTextFile'](f('a.png'))).toBe(false)
			expect(i['isTextFile'](f('a.md', true))).toBe(false)
		})

		it('stripTextExt removes only known text extensions', () => {
			expect(i['stripTextExt']('foo.md')).toBe('foo')
			expect(i['stripTextExt']('foo.txt')).toBe('foo')
			expect(i['stripTextExt']('foo.png')).toBe('foo.png')
			expect(i['stripTextExt']('foo')).toBe('foo')
		})

		it('joinPath skips empty dir', () => {
			expect(i['joinPath']('', 'x')).toBe('x')
			expect(i['joinPath']('a/b', 'x')).toBe('a/b/x')
		})

		it('byDepth sorts shallowest first, then alphabetically', () => {
			const p = (path: string) => i['parseFile']({ path, isFolder: false, content: '' })
			const sorted = [p('a/b/c.md'), p('z.md'), p('a/a.md'), p('a/b.md')].sort(i['byDepth'])
			expect(sorted.map(f => f.name)).toEqual(['z.md', 'a.md', 'b.md', 'c.md'])
		})
	})

	describe('computeFoldersWithContent', () => {
		it('marks every ancestor directory of each text file', () => {
			const i = newImporter()
			const parsed = [file('a/b/c.md', 'x')].map(f => i['parseFile'](f))
			const set = i['computeFoldersWithContent'](parsed)
			expect(set.has('a')).toBe(true)
			expect(set.has('a/b')).toBe(true)
			// Sibling-folder case for the file itself:
			expect(set.has('a/b/c')).toBe(true)
		})

		it('does not mark unrelated branches', () => {
			const i = newImporter()
			const parsed = [file('a/b/c.md', 'x')].map(f => i['parseFile'](f))
			const set = i['computeFoldersWithContent'](parsed)
			expect(set.has('z')).toBe(false)
		})
	})

	describe('buildTree (pass 1 + pass 2)', () => {
		it('imports flat .md files as leaf notes under the import root', () => {
			const { importRoot, created } = buildTree([file('one.md', 'first'), file('two.md', 'second')])

			expect(created.map(titleOf).sort()).toEqual(['one', 'two'])
			expect(childIdsOf(importRoot)).toHaveLength(2)
			const one = created.find(n => titleOf(n) === 'one')!
			expect(textOf(one)).toBe('first')
		})

		it('builds nested folder structure with correct parent links', () => {
			// Two top-level entries so 'a' isn't treated as a wrapper folder.
			const { importRoot, noteMap, created } = buildTree([
				folder('a'),
				folder('a/b'),
				file('a/b/leaf.md', 'L'),
				file('top.md', 'T'),
			])

			expect(noteMap.get('a')).toBeDefined()
			expect(noteMap.get('a/b')).toBeDefined()
			expect(noteMap.get('a/b/leaf')).toBeDefined()
			// importRoot → a → b → leaf
			expect(childIdsOf(importRoot)).toContain(noteMap.get('a')!.id)
			expect(childIdsOf(noteMap.get('a')!)).toContain(noteMap.get('a/b')!.id)
			expect(childIdsOf(noteMap.get('a/b')!)).toContain(noteMap.get('a/b/leaf')!.id)
			expect(textOf(noteMap.get('a/b/leaf'))).toBe('L')
			// 4 new notes: a, b, leaf, top
			expect(created).toHaveLength(4)
		})

		it('merges folder + sibling .md into one note (dual export case)', () => {
			const { noteMap, created } = buildTree([folder('foo'), file('foo.md', 'parent text'), file('foo/child.md', 'C')])

			// 'foo' should exist exactly once, carry the parent text, and have a child.
			const foo = noteMap.get('foo')!
			expect(foo).toBeDefined()
			expect(textOf(foo)).toBe('parent text')
			expect(childIdsOf(foo)).toContain(noteMap.get('foo/child')!.id)
			// Only 'foo' + 'foo/child' are created.
			expect(created).toHaveLength(2)
		})

		it('skips folders that contain no text files', () => {
			const { created } = buildTree([folder('empty'), folder('empty/also-empty'), file('real.md', 'x')])

			expect(created.map(titleOf)).toEqual(['real'])
		})

		it('treats .txt files the same as .md', () => {
			const { created } = buildTree([file('note.txt', 'plain')])

			expect(titleOf(created[0])).toBe('note')
			expect(textOf(created[0])).toBe('plain')
		})

		it('is transparent to a single top-level wrapper folder', () => {
			// When all paths share one top segment, that segment should NOT
			// appear as an extra note under importRoot.
			const { importRoot, created, noteMap } = buildTree([
				folder('wrapper'),
				folder('wrapper/inner'),
				file('wrapper/inner/leaf.md', 'L'),
			])

			// 'wrapper' is pre-mapped to importRoot, so only 'inner' and 'leaf' are created.
			expect(created.map(titleOf).sort()).toEqual(['inner', 'leaf'])
			expect(childIdsOf(importRoot)).toContain(noteMap.get('wrapper/inner')!.id)
		})

		it('creates parents before children (depth-ordered)', () => {
			const { created } = buildTree([
				folder('a'),
				folder('a/b'),
				folder('a/b/c'),
				file('a/b/c/leaf.md', 'L'),
				file('top.md', 'T'),
			])

			// Pass 1 creates folder notes shallowest-first; pass 2 then attaches
			// text files (also depth-ordered). Filter out the unrelated 'top'
			// sibling that only exists to disable wrapper-folder collapsing.
			expect(created.map(titleOf).filter(t => t !== 'top')).toEqual(['a', 'b', 'c', 'leaf'])
		})

		it('decodes base64 content correctly for unicode text', () => {
			const text = 'héllo 🌍 ñ'
			const { created } = buildTree([file('u.md', text)])
			expect(textOf(created[0])).toBe(text)
			// Sanity: round-trips through hex-base64 helpers too.
			expect(dec.decode(fromBase64(toBase64(enc.encode(text))))).toBe(text)
		})
	})
})
