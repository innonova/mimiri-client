import { describe, it, expect, beforeEach } from '@jest/globals'
import { PasswordGenerator, type PasswordOptions } from './password-generator'

// Statistical uniformity tests. Thresholds are set very wide relative to sampling
// noise (>20 sigma) so they cannot flake, while still catching systematic bias:
// the base-conversion bug this guards against skewed some characters to 2.9x
// expected frequency and made others 0.85x.

const defaultOptions = (overrides: Partial<PasswordOptions> = {}): PasswordOptions => ({
	characters: 20,
	iterations: 300000,
	lower: true,
	upper: true,
	numbers: true,
	friendlySymbols: false,
	extendedSymbols: false,
	difficultSymbols: false,
	oneSymbol: false,
	...overrides,
})

describe('PasswordGenerator', () => {
	let generator: PasswordGenerator

	beforeEach(() => {
		generator = new PasswordGenerator()
	})

	it('should generate passwords of the requested length', async () => {
		for (const characters of [4, 10, 20, 50]) {
			generator.setOptions(defaultOptions({ characters }))
			expect(await generator.generate()).toHaveLength(characters)
		}
	})

	it('should only use characters from the selected pools', async () => {
		generator.setOptions(defaultOptions({ upper: false, numbers: false }))
		for (let i = 0; i < 20; i++) {
			expect(await generator.generate()).toMatch(/^[a-z]+$/)
		}
	})

	it('should include exactly one symbol when oneSymbol is set', async () => {
		generator.setOptions(defaultOptions({ friendlySymbols: true, oneSymbol: true }))
		const symbolCount = (password: string) =>
			[...password].filter(c => generator.friendlySymbols.includes(c)).length
		for (let i = 0; i < 20; i++) {
			expect(symbolCount(await generator.generate())).toBe(1)
		}
	})

	it('should draw characters uniformly from the pool', async () => {
		const options = defaultOptions()
		generator.setOptions(options)
		const pool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

		const passwords = 2500
		const freq = new Map<string, number>([...pool].map(c => [c, 0]))
		for (let i = 0; i < passwords; i++) {
			for (const c of await generator.generate()) {
				freq.set(c, freq.get(c)! + 1)
			}
		}

		// 50000 draws over 62 characters: expected ~806 each, sigma ~28 (3.5%).
		// The 25% tolerance is ~7 sigma of headroom below the old bug's 2.9x skew.
		const expected = (passwords * options.characters) / pool.length
		const outliers = [...freq].filter(([, count]) => count < expected * 0.75 || count > expected * 1.25)
		expect(outliers).toEqual([])
	})

	it('should place the symbol uniformly across all positions', async () => {
		const options = defaultOptions({ friendlySymbols: true, oneSymbol: true, characters: 10 })
		generator.setOptions(options)

		const passwords = 3000
		const posFreq = new Array(options.characters).fill(0)
		for (let i = 0; i < passwords; i++) {
			const password = await generator.generate()
			const index = [...password].findIndex(c => generator.friendlySymbols.includes(c))
			posFreq[index]++
		}

		// 3000 draws over 10 positions: expected 300 each, sigma ~16.4 (5.5%).
		// The old code could never place the symbol at position length - 2 (count 0).
		const expected = passwords / options.characters
		const outliers = posFreq
			.map((count, position) => ({ position, count }))
			.filter(({ count }) => count < expected * 0.6 || count > expected * 1.4)
		expect(outliers).toEqual([])
	})
})
