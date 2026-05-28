import { describe, it, expect, jest } from '@jest/globals'

// note-exporter.ts pulls `ipcClient`, `infoDialog`, and `$t` from
// `../../global`. We only exercise private helpers, so a tiny stub is enough.
jest.mock('../../global', () => ({
	ipcClient: {},
	infoDialog: { value: { show: jest.fn() } },
	$t: (key: string) => key,
}))

import { NoteExporter } from './note-exporter'
import { fromBase64 } from '../hex-base64'

type ExportedFile = { path: string; isFolder: boolean; content: string }

// Minimal duck-typed MimerNote substitute. The exporter only reads `children`,
// `title`, `text`, `hasChildren`, `isSystem`, and awaits `ensureChildren()`.
type FakeNode = {
	title?: string
	text?: string
	isSystem?: boolean
	children: FakeNode[]
	hasChildren: boolean
	ensureChildren: () => Promise<void>
}

const node = (props: Partial<FakeNode>): FakeNode => ({
	title: props.title,
	text: props.text,
	isSystem: props.isSystem ?? false,
	children: props.children ?? [],
	get hasChildren() {
		return (props.children ?? []).length > 0
	},
	ensureChildren: async () => {},
})

const newExporter = () => new NoteExporter(null as any)

const decodeText = (f: ExportedFile) => new TextDecoder().decode(fromBase64(f.content))

const collect = async (root: FakeNode): Promise<ExportedFile[]> => {
	const exporter = newExporter()
	const files: ExportedFile[] = []
	await exporter['collectNotesForExport'](root as any, [], files)
	return files
}

describe('NoteExporter', () => {
	describe('sanitizeTitle', () => {
		const e = newExporter()
		const s = (title: string) => e['sanitizeTitle'](title)

		it('keeps letters, numbers, spaces, and common punctuation', () => {
			expect(s('Hello World')).toBe('Hello World')
			expect(s('Notes (2024) - draft_1.txt')).toBe('Notes (2024) - draft_1.txt')
		})

		it('replaces filesystem-unsafe characters with _', () => {
			expect(s('a/b')).toBe('a_b')
			expect(s('a:b*c?')).toBe('a_b_c_')
		})

		it('falls back to Untitled when nothing usable remains', () => {
			expect(s('')).toBe('Untitled')
			expect(s('   ')).toBe('Untitled') // only whitespace → trims to empty
		})

		it('strips trailing dots', () => {
			expect(s('foo...')).toBe('foo')
		})
	})

	describe('uniqueName', () => {
		const e = newExporter()

		it('returns the base when unused', () => {
			expect(e['uniqueName']('foo', new Set())).toBe('foo')
		})

		it('appends (2), (3), … until free', () => {
			const used = new Set(['foo', 'foo (2)'])
			expect(e['uniqueName']('foo', used)).toBe('foo (3)')
		})
	})

	describe('collectNotesForExport', () => {
		it('emits one .md per leaf and no folder entry', async () => {
			const root = node({ children: [node({ title: 'a', text: 'A' }), node({ title: 'b', text: 'B' })] })
			const files = await collect(root)

			expect(files.filter(f => f.isFolder)).toEqual([])
			expect(files.map(f => f.path).sort()).toEqual(['a.md', 'b.md'])
			expect(decodeText(files.find(f => f.path === 'a.md')!)).toBe('A')
		})

		it('emits both a folder entry and a .md for parents (dual-export)', async () => {
			const root = node({
				children: [
					node({
						title: 'parent',
						text: 'P',
						children: [node({ title: 'child', text: 'C' })],
					}),
				],
			})
			const files = await collect(root)

			expect(files.map(f => ({ path: f.path, isFolder: f.isFolder }))).toEqual([
				{ path: 'parent', isFolder: true },
				{ path: 'parent.md', isFolder: false },
				{ path: 'parent/child.md', isFolder: false },
			])
			expect(decodeText(files.find(f => f.path === 'parent.md')!)).toBe('P')
			expect(decodeText(files.find(f => f.path === 'parent/child.md')!)).toBe('C')
		})

		it('skips isSystem children entirely', async () => {
			const root = node({
				children: [node({ title: 'visible', text: 'V' }), node({ title: 'hidden', text: 'H', isSystem: true })],
			})
			const files = await collect(root)
			expect(files.map(f => f.path)).toEqual(['visible.md'])
		})

		it('disambiguates duplicate sibling titles', async () => {
			const root = node({
				children: [node({ title: 'same', text: '1' }), node({ title: 'same', text: '2' }), node({ title: 'same', text: '3' })],
			})
			const files = await collect(root)
			expect(files.map(f => f.path).sort()).toEqual(['same (2).md', 'same (3).md', 'same.md'])
		})

		it('uses Untitled for missing titles', async () => {
			const root = node({ children: [node({ text: 'x' })] })
			const files = await collect(root)
			expect(files[0].path).toBe('Untitled.md')
		})

		it('sanitizes filesystem-unsafe characters in titles', async () => {
			const root = node({ children: [node({ title: 'a/b:c', text: 'x' })] })
			const files = await collect(root)
			expect(files[0].path).toBe('a_b_c.md')
		})
	})
})
