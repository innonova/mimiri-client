import { format } from 'date-fns'
import { SymmetricCrypt } from './symmetric-crypt'

export class Debounce {
	private lastActivate = 0
	private interval

	constructor(
		private action: () => void,
		private delay: number,
	) {}

	private check() {
		if (Date.now() - this.lastActivate > this.delay) {
			clearInterval(this.interval)
			this.interval = undefined
			this.action()
		}
	}

	activate() {
		this.lastActivate = Date.now()
		if (!this.interval) {
			this.interval = setInterval(() => this.check(), 100)
		}
	}
}

export const delay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const biCif = (value: number) => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
}

export const formatCurrency = (price: number, currency?: string) => {
	const whole = Math.floor(price / 100)
	const decimals = Math.floor(price - whole * 100)
	if (currency === 'USD') {
		return `$${whole}.${biCif(decimals)}`
	}
	if (currency === 'EUR') {
		return `€${whole}.${biCif(decimals)}`
	}
	if (currency === 'GBP') {
		return `£${whole}.${biCif(decimals)}`
	}
	if (currency === 'CHF') {
		return `Fr. ${whole}.${biCif(decimals)}`
	}
	return `${whole}.${biCif(decimals)}`
}

export const formatInvoiceDate = (date?: Date) => {
	if (date) {
		return format(date, 'yyyy.MM.dd')
	}
	return ''
}

export const formatExpirationDate = (date?: Date) => {
	if (date) {
		return format(date, 'yyyy.MM.dd')
	}
	return ''
}

export const currentTime = () => {
	const queryTimeMatch = /now=(\d{4}\.\d{2}\.\d{2})/.exec(location.search)
	if (queryTimeMatch) {
		return new Date(queryTimeMatch[1])
	}
	return new Date()
}

export const calculateReverseVat = (total: number, vatRate: number) => {
	return Math.round(total - total / (1 + vatRate / 100))
}

export const vatRate = (country: string) => {
	if (!country || country.toUpperCase() === 'CH') {
		return 8.1
	}
	return 0
}

let obfuscator: SymmetricCrypt | undefined

const ensureObfuscator = async () => {
	obfuscator = await SymmetricCrypt.fromKeyString(
		SymmetricCrypt.DEFAULT_SYMMETRIC_ALGORITHM,
		'3nVDkHOFedngN9hSs3mb8E1Bb6imMTy2xQOEe6DnvGs=',
	)
}

export const obfuscate = async (data: string) => {
	await ensureObfuscator()
	return obfuscator.encrypt(data)
}

export const deObfuscate = async (data: string) => {
	await ensureObfuscator()
	return obfuscator.decrypt(data)
}

export const compareVersions = (a: string, b: string) => {
	const matchA = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-(beta|rc)([0-9]+))?/.exec(a)
	const matchB = /([0-9]+)\.([0-9]+)\.([0-9]+)(?:-(beta|rc)([0-9]+))?/.exec(b)
	const majorA = parseInt(matchA[1])
	const minorA = parseInt(matchA[2])
	const patchA = parseInt(matchA[3])
	const labelTypeA = matchA[4]
	const labelA = parseInt(matchA[5])
	const majorB = parseInt(matchB[1])
	const minorB = parseInt(matchB[2])
	const patchB = parseInt(matchB[3])
	const labelTypeB = matchB[4]
	const labelB = parseInt(matchB[5])

	if (majorA !== majorB) {
		return majorA - majorB
	}
	if (minorA !== minorB) {
		return minorA - minorB
	}
	if (patchA !== patchB) {
		return patchA - patchB
	}
	if (labelTypeA !== labelTypeB) {
		return labelTypeA === 'rc' ? 1 : -1
	}
	if (labelA !== labelB) {
		if (!isNaN(labelA) && !isNaN(labelA)) {
			return labelA - labelB
		}
		if (!isNaN(labelA) && isNaN(labelA)) {
			return 1
		}
		if (isNaN(labelA) && !isNaN(labelA)) {
			return -1
		}
	}
	return 0
}
