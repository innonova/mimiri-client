import { fromBase64, toBase64, fromHex } from './hex-base64'

export const DEFAULT_SYMMETRIC_ALGORITHM = 'AES;CBC;PKCS7;32'

export class SymmetricCrypt {
	constructor(
		public algorithm: string,
		private key: CryptoKey,
	) {}

	static async create(algorithm: string) {
		if (algorithm !== 'AES;CBC;PKCS7;32') {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const key = await crypto.subtle.generateKey(
			{
				name: 'AES-CBC',
				length: 256,
			},
			true,
			['encrypt', 'decrypt'],
		)
		return new SymmetricCrypt(algorithm, key)
	}

	static async fromPassword(
		algorithm: string,
		password: string,
		salt: string,
		iterations: number,
	): Promise<SymmetricCrypt> {
		if (algorithm != 'AES;CBC;PKCS7;32') {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const passwordBuffer = new TextEncoder().encode(password)
		const passwordKey = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits'])
		const keyData = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: fromHex(salt),
				iterations: iterations,
				hash: { name: 'SHA-512' },
			},
			passwordKey,
			256,
		)
		const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, true, ['encrypt', 'decrypt'])
		return new SymmetricCrypt(algorithm, key)
	}

	static async fromKey(algorithm: string, keyData: ArrayBuffer): Promise<SymmetricCrypt> {
		if (algorithm !== 'AES;CBC;PKCS7;32') {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-CBC' }, true, ['encrypt', 'decrypt'])
		return new SymmetricCrypt(algorithm, key)
	}

	async decryptBytes(data: string): Promise<ArrayBuffer> {
		const iv = fromBase64(data, 0, 16)
		const bytes = fromBase64(data, 16)
		return await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, this.key, bytes)
	}

	async decrypt(data: string): Promise<string> {
		const iv = fromBase64(data, 0, 16)
		const bytes = fromBase64(data, 16)
		const buffer = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, this.key, bytes)
		if (buffer.byteLength > 4) {
			const header = new Uint8Array(buffer, 0, 4)
			if (header[0] === 0 && header[1] === 0 && header[2] === 0 && header[3] === 1) {
				const data2 = new Uint8Array(buffer, 4, buffer.byteLength - 4)
				return await new Response(new Blob([data2]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
			}
		}
		return new TextDecoder().decode(buffer)
	}

	async encrypt(data: string): Promise<string> {
		return this.encryptBytes(new TextEncoder().encode(data), true)
	}

	async encryptBytes(data: ArrayBuffer | Uint8Array, allowZip: boolean = false): Promise<string> {
		if (data.byteLength > 512 && allowZip) {
			const zipped = await new Response(
				new Blob([data]).stream().pipeThrough(new CompressionStream('gzip')),
			).arrayBuffer()
			const data2 = new Uint8Array(zipped.byteLength + 4)
			data2.set([0x00, 0x00, 0x00, 0x01], 0)
			data2.set(new Uint8Array(zipped), 4)
			data = data2
		}
		const iv = crypto.getRandomValues(new Uint8Array(16))
		const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, this.key, data))
		const combined = new Uint8Array(16 + encrypted.length)
		combined.set(iv)
		combined.set(encrypted, 16)
		return toBase64(combined)
	}

	async getKey(): Promise<ArrayBuffer> {
		return await crypto.subtle.exportKey('raw', this.key)
	}

	async getKeyString(): Promise<string> {
		return toBase64(await crypto.subtle.exportKey('raw', this.key))
	}
}
