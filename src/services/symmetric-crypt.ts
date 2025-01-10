import { fromBase64, toBase64, fromHex } from './hex-base64'

export interface SymmetricAlgorithm {
	id: string
	name: string
	bits: number
	bytes: number
	padding?: string
	ivSize: number
}

export class SymmetricCrypt {
	static readonly DOTNET_COMPAT_SYMMETRIC_ALGORITHM = 'AES;CBC;PKCS7;32'
	static readonly DEFAULT_SYMMETRIC_ALGORITHM = 'AES;GCM;32'

	constructor(
		private _algorithm: SymmetricAlgorithm,
		private key: CryptoKey,
	) {}

	static toAlgorithm(algorithm: string): SymmetricAlgorithm | undefined {
		if (algorithm === 'AES;CBC;PKCS7;32') {
			return {
				id: 'AES;CBC;PKCS7;32',
				name: 'AES-CBC',
				bits: 256,
				bytes: 32,
				padding: 'PKCS7',
				ivSize: 16,
			}
		}
		if (algorithm === 'AES;GCM;32') {
			return {
				id: 'AES;GCM;32',
				name: 'AES-GCM',
				bits: 256,
				bytes: 32,
				ivSize: 12,
			}
		}
		return undefined
	}

	static async create(algorithm: string) {
		const algo = this.toAlgorithm(algorithm)
		if (!algo) {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const key = await crypto.subtle.generateKey(
			{
				name: algo.name,
				length: algo.bits,
			},
			true,
			['encrypt', 'decrypt'],
		)
		return new SymmetricCrypt(algo, key)
	}

	static async fromPassword(
		algorithm: string,
		password: string,
		salt: string,
		iterations: number,
	): Promise<SymmetricCrypt> {
		const algo = this.toAlgorithm(algorithm)
		if (!algo) {
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
			algo.bits,
		)
		const key = await crypto.subtle.importKey('raw', keyData, { name: algo.name }, true, ['encrypt', 'decrypt'])
		return new SymmetricCrypt(algo, key)
	}

	static async fromKey(algorithm: string, keyData: ArrayBuffer): Promise<SymmetricCrypt> {
		const algo = this.toAlgorithm(algorithm)
		if (!algo) {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const key = await crypto.subtle.importKey('raw', keyData, { name: algo.name }, true, ['encrypt', 'decrypt'])
		return new SymmetricCrypt(algo, key)
	}

	async decryptBytes(data: string): Promise<ArrayBuffer> {
		const iv = fromBase64(data, 0, this._algorithm.ivSize)
		const bytes = fromBase64(data, this._algorithm.ivSize)
		return await crypto.subtle.decrypt({ name: this._algorithm.name, iv }, this.key, bytes)
	}

	async decrypt(data: string): Promise<string> {
		const iv = fromBase64(data, 0, this._algorithm.ivSize)
		const bytes = fromBase64(data, this._algorithm.ivSize)
		const buffer = await crypto.subtle.decrypt({ name: this._algorithm.name, iv }, this.key, bytes)
		if (buffer.byteLength > 4) {
			const header = new Uint8Array(buffer, 0, 4)
			if (header[0] === 0 && header[1] === 0 && header[2] === 0 && header[3] === 1) {
				const data2 = new Uint8Array(buffer, 4, buffer.byteLength - 4)
				return await new Response(new Blob([data2]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
			}
		}
		return new TextDecoder().decode(buffer)
	}

	async encrypt(data: string, allowZip: boolean = true): Promise<string> {
		return this.encryptBytes(new TextEncoder().encode(data), allowZip)
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
		const iv = crypto.getRandomValues(new Uint8Array(this._algorithm.ivSize))
		const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: this._algorithm.name, iv }, this.key, data))
		const combined = new Uint8Array(this._algorithm.ivSize + encrypted.length)
		combined.set(iv)
		combined.set(encrypted, this._algorithm.ivSize)
		return toBase64(combined)
	}

	async getKey(): Promise<ArrayBuffer> {
		return await crypto.subtle.exportKey('raw', this.key)
	}

	async getKeyString(): Promise<string> {
		return toBase64(await crypto.subtle.exportKey('raw', this.key))
	}

	public get algorithm() {
		return this._algorithm.id
	}
}
