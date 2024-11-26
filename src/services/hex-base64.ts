import { fromUint8Array } from 'js-base64'

export const toHex = (data: ArrayBuffer | Uint8Array) => {
	if (data instanceof Uint8Array) {
		return [...data]
			.map(x => x.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()
	} else {
		return [...new Uint8Array(data)]
			.map(x => x.toString(16).padStart(2, '0'))
			.join('')
			.toUpperCase()
	}
}

export const fromHex = (hex: string) => {
	return new Uint8Array(
		hex.match(/[\da-f]{2}/gi).map(h => {
			return parseInt(h, 16)
		}),
	).buffer
}

export const fromBase64 = (base64, start: number = 0, end?: number) => {
	return Uint8Array.from(atob(base64).substring(start, end), c => c.charCodeAt(0))
}

export const toBase64 = (data: ArrayBuffer | Uint8Array) => {
	if (data instanceof Uint8Array) {
		return fromUint8Array(data)
	}
	return fromUint8Array(new Uint8Array(data))
}
