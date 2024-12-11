export class PasswordGenerator {
	private _targetEntropy = 64 // bits
	private _targetLength = 8
	private _characters2 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/()$#*+&?:;.,=!@%<>'
	private _characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	private _numbers = '0123456789'
	private _upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	private _lower = 'abcdefghijklmnopqrstuvwxyz'
	private _pcFriendlySpecial = '"\'*+-!?=()/<>:;&%$@#_'
	private _iphoneFriendlySpecial = '"\'-/:;()$&@.,?!'
	private _androidFriendlySpecial = '"\'+=/_<>[]!@#€%&*()-:;,.?'

	constructor() {
		// this.generate()
	}

	private convertNumber(num: number) {
		let result = ''
		let remainder = num % this._characters.length
		let quotient = Math.floor(num / this._characters.length)
		result += this._characters.charAt(remainder)
		let count = 100
		while (quotient > 0 && --count > 0) {
			remainder = quotient % this._characters.length
			quotient = Math.floor(quotient / this._characters.length)
			result += this._characters.charAt(remainder)
		}
		return result
	}

	async generate() {
		const rand = new Uint8Array(64)
		crypto.getRandomValues(rand)
		const int32s = new Uint32Array(rand.buffer)

		let index = 0
		let password = ''
		while (password.length < this._targetLength) {
			password += this.convertNumber(int32s[index++])
		}
		if (password.length > this._targetLength) {
			password = password.substring(0, this._targetLength)
		}

		const specialIndex = (int32s[index] % (password.length - 3)) + 3
		const specialChar = int32s[index + 1] % this._iphoneFriendlySpecial.length
		password =
			password.substring(0, specialIndex) +
			this._iphoneFriendlySpecial[specialChar] +
			password.substring(specialIndex, password.length)

		let hasNumber = false
		let hasUpper = false
		let hasLower = false
		for (const c of password) {
			if (this._numbers.includes(c)) {
				hasNumber = true
			}
			if (this._upper.includes(c)) {
				hasUpper = true
			}
			if (this._lower.includes(c)) {
				hasLower = true
			}
		}
		if (!hasNumber) {
			password += this._numbers[int32s[index] % this._numbers.length]
		}
		if (!hasUpper) {
			password += this._upper[int32s[index] % this._upper.length]
		}
		if (!hasLower) {
			password += this._lower[int32s[index] % this._lower.length]
		}

		const triesPerSecPBKDF2300k = 10000
		const triesPerSecSHA512 = 7000000000
		const yearsPBKDF2300k =
			Math.pow(this._characters.length, this._targetLength) / triesPerSecPBKDF2300k / 60 / 60 / 24 / 365
		const yearsSHA512 = Math.pow(this._characters.length, this._targetLength) / triesPerSecSHA512 / 60 / 60 / 24 / 365
		const costToOneYearPBKDF2300k = yearsPBKDF2300k * 2000
		const costToOneYearSHA512 = yearsSHA512 * 2000

		const dollarsPBKDF2300k = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			Math.floor(costToOneYearPBKDF2300k),
		)
		const dollarsSHA512 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			Math.floor(costToOneYearSHA512),
		)

		console.log('test', password, dollarsPBKDF2300k, dollarsSHA512, this._characters.length)
	}
}
