import { reactive } from 'vue'
import { passwordHasher } from './password-hasher'
import { SymmetricCrypt } from './symmetric-crypt'
import { DEFAULT_PASSWORD_ALGORITHM } from './storage/mimiri-store'

export interface PasswordOptions {
	characters: number
	iterations: number
	lower: boolean
	upper: boolean
	numbers: boolean
	friendlySymbols: boolean
	extendedSymbols: boolean
	difficultSymbols: boolean
	oneSymbol: boolean
}

export interface PasswordComplexity {
	permutations: number
	year: number
	month: number
	week: number
	hmacDay: number
	hmacYear: number
}

export const passwordTimeFactor = reactive({
	time1M: 1,
	time2M: 3,
	time10M: 15,
	time20M: 30,
})

setTimeout(async () => {
	const start = performance.now()
	await passwordHasher.hashPassword('', '00ff', DEFAULT_PASSWORD_ALGORITHM, 100000)
	await SymmetricCrypt.fromPassword(SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM, '', '00ff', 100000)
	const elapsed = performance.now() - start
	const factor = 154 / elapsed
	passwordTimeFactor.time1M = Math.ceil(1.5 * factor)
	passwordTimeFactor.time2M = Math.ceil(3 * factor)
	passwordTimeFactor.time10M = Math.ceil(14 * factor)
	passwordTimeFactor.time20M = Math.ceil(28 * factor)
}, 500)

export class PasswordGenerator {
	private _options: PasswordOptions
	private _numbers = '0123456789'
	private _upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	private _lower = 'abcdefghijklmnopqrstuvwxyz'

	private _friendlySymbols = '"\'-/:;$&.,?!'
	private _extendedSymbols = '*+<>%#_\\[]{}§@()'
	private _difficultSymbols = '`|^¨~¤€£'

	public setOptions(options: PasswordOptions) {
		this._options = options
	}

	public calculateComplexity(): PasswordComplexity {
		let permutations = 0
		let chars = 0
		let symbols = 0

		if (this._options.friendlySymbols) {
			symbols += this._friendlySymbols.length
		}
		if (this._options.extendedSymbols) {
			symbols += this._extendedSymbols.length
		}
		if (this._options.difficultSymbols) {
			symbols += this._difficultSymbols.length
		}

		if (this._options.lower) {
			chars += this._lower.length
		}
		if (this._options.upper) {
			chars += this._upper.length
		}
		if (this._options.numbers) {
			chars += this._numbers.length
		}
		if (!this._options.oneSymbol) {
			permutations = Math.pow(chars + symbols, this._options.characters)
		} else {
			permutations = Math.pow(chars, this._options.characters - 1)
			permutations *= symbols * this._options.characters
		}

		const triesPerSecPBKDF2300k = 10000
		const triesPerSec = (triesPerSecPBKDF2300k * 300000) / this._options.iterations
		const investmentPerUnit = 2000

		const secondsToCrack = permutations / triesPerSec
		const yearsToCrack = secondsToCrack / 60 / 60 / 24 / 365

		const costForOneYear = yearsToCrack * investmentPerUnit
		const costForOneMonth = costForOneYear * 12
		const costForOneWeek = costForOneYear * 52

		const triesPerSecHMAC256 = 9387000000
		const secondsToCrackHMAC = permutations / triesPerSecHMAC256
		const daysToCrackHMAC = secondsToCrackHMAC / 60 / 60 / 24
		const costForOneDayHMAC = daysToCrackHMAC * investmentPerUnit
		const costForOneYearHMAC = costForOneDayHMAC / 365

		return {
			permutations,
			year: Math.floor(costForOneYear),
			month: Math.floor(costForOneMonth),
			week: Math.floor(costForOneWeek),
			hmacDay: Math.floor(costForOneDayHMAC),
			hmacYear: Math.floor(costForOneYearHMAC),
		}
	}

	private getCharacters(pool: string, num: number) {
		let result = ''
		let remainder = num % pool.length
		let quotient = Math.floor(num / pool.length)
		result += pool.charAt(remainder)
		let count = 100
		while (quotient > 0 && --count > 0) {
			remainder = quotient % pool.length
			quotient = Math.floor(quotient / pool.length)
			result += pool.charAt(remainder)
		}
		return result
	}

	private contains(pool: string, password: string) {
		for (const c of password) {
			if (pool.includes(c)) {
				return true
			}
		}
		return false
	}

	async generate() {
		let symbols = ''
		let pool = ''

		if (this._options.friendlySymbols) {
			symbols += this._friendlySymbols
		}
		if (this._options.extendedSymbols) {
			symbols += this._extendedSymbols
		}
		if (this._options.difficultSymbols) {
			symbols += this._difficultSymbols
		}

		if (this._options.lower) {
			pool += this._lower
		}
		if (this._options.upper) {
			pool += this._upper
		}
		if (this._options.numbers) {
			pool += this._numbers
		}
		if (!this._options.oneSymbol) {
			pool += symbols
		}
		while (true) {
			const rand = new Uint8Array(128)
			crypto.getRandomValues(rand)
			const int32s = new Uint32Array(rand.buffer)

			const targetLength = this._options.characters - (this._options.oneSymbol ? 1 : 0)
			let index = 0
			let password = ''
			while (password.length < targetLength) {
				password += this.getCharacters(pool, int32s[index++])
			}
			if (password.length > targetLength) {
				password = password.substring(0, targetLength)
			}
			if (this._options.oneSymbol) {
				const specialIndex = int32s[index] % password.length
				const specialChar = symbols[int32s[index + 1] % symbols.length]
				if (specialIndex === 0) {
					password = specialChar + password
				} else if (specialIndex >= password.length - 1) {
					password += specialChar
				} else {
					password =
						password.substring(0, specialIndex) + specialChar + password.substring(specialIndex, password.length)
				}
			}
			if (this._options.lower && !this.contains(this._lower, password)) {
				continue
			}
			if (this._options.upper && !this.contains(this._upper, password)) {
				continue
			}
			if (this._options.numbers && !this.contains(this._numbers, password)) {
				continue
			}
			if (!this._options.oneSymbol && symbols.length > 0 && !this.contains(symbols, password)) {
				continue
			}
			return password
		}
	}

	public get friendlySymbols() {
		return this._friendlySymbols
	}

	public get extendedSymbols() {
		return this._extendedSymbols
	}

	public get difficultSymbols() {
		return this._difficultSymbols
	}

	public get options() {
		return this._options
	}
}
