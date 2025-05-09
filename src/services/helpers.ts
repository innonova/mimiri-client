import { format } from 'date-fns'

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
