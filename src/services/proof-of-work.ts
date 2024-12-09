const buf2hex = buffer => {
	return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

export class ProofOfWork {
	static async compute(value: string, entropyBits: number) {
		const fullBytes = Math.floor(entropyBits / 8)
		const remainingBits = entropyBits - fullBytes * 8
		let hash
		let nonce = 0
		const start = Date.now()

		while (true) {
			const message = `${Date.now()}:${hash ?? '-'}:${nonce++}:${value}`
			const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
			hash = buf2hex(result)
			const ary = [...new Uint8Array(result)]
			let potential = true
			for (let i = 0; i < fullBytes; i++) {
				if (ary[i] !== 0) {
					potential = false
					break
				}
			}
			if (potential) {
				const mask = 0xff & (0xff << (8 - remainingBits))
				if ((ary[fullBytes] & mask) === 0) {
					return `${hash}::${message}`
				}
			}
		}
	}
}
