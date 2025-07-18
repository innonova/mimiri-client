import { fromBase64, toBase64 } from './hex-base64'
import { SymmetricCrypt } from './symmetric-crypt'

const pemToArrayBuffer = (pem: string) => {
	const lines = pem.split('\n')
	let encoded = ''
	for (let i = 0; i < lines.length; i++) {
		if (
			lines[i].trim().length > 0 &&
			lines[i].indexOf('-----BEGIN PRIVATE KEY-----') < 0 &&
			lines[i].indexOf('-----BEGIN PUBLIC KEY-----') < 0 &&
			lines[i].indexOf('-----END PRIVATE KEY-----') < 0 &&
			lines[i].indexOf('-----END PUBLIC KEY-----') < 0
		) {
			encoded += lines[i].trim()
		}
	}
	return fromBase64(encoded)
}

export class CryptSignature {
	static readonly DEFAULT_ASYMMETRIC_ALGORITHM = 'RSA;4096'

	constructor(
		public algorithm: string,
		private publicKey: CryptoKey,
		private publicKeyEncrypt: CryptoKey,
		private privateKey?: CryptoKey,
		private privateKeyDecrypt?: CryptoKey,
	) {}

	static async create(algorithm: string) {
		if (algorithm !== 'RSA;3072' && algorithm !== 'RSA;4096') {
			throw new Error(`Algorithm not supported ${algorithm}`)
		}
		const key = await crypto.subtle.generateKey(
			{
				name: 'RSASSA-PKCS1-v1_5',
				modulusLength: parseInt(algorithm.split(';')[1]),
				publicExponent: new Uint8Array([1, 0, 1]),
				hash: 'SHA-256',
			},
			true,
			['sign', 'verify'],
		)

		const temp = new CryptSignature(algorithm, key.publicKey, undefined!, key.privateKey)
		return CryptSignature.fromPem(algorithm, await temp.publicKeyPem(), await temp.privateKeyPem())
	}

	static async fromPem(algorithm: string, publicPem: string, privatePem?: string): Promise<CryptSignature> {
		const publicKey = await crypto.subtle.importKey(
			'spki',
			pemToArrayBuffer(publicPem),
			{
				name: 'RSASSA-PKCS1-v1_5',
				hash: 'SHA-256',
			},
			true,
			['verify'],
		)

		const publicKeyEncrypt = await crypto.subtle.importKey(
			'spki',
			pemToArrayBuffer(publicPem),
			{
				name: 'RSA-OAEP',
				hash: 'SHA-256',
			},
			false,
			['encrypt'],
		)

		const privateKey = privatePem
			? await crypto.subtle.importKey(
					'pkcs8',
					pemToArrayBuffer(privatePem),
					{
						name: 'RSASSA-PKCS1-v1_5',
						hash: 'SHA-256',
					},
					true,
					['sign'],
				)
			: undefined

		const privateKeyDecrypt = privatePem
			? await crypto.subtle.importKey(
					'pkcs8',
					pemToArrayBuffer(privatePem),
					{
						name: 'RSA-OAEP',
						hash: 'SHA-256',
					},
					false,
					['decrypt'],
				)
			: undefined

		return new CryptSignature(algorithm, publicKey, publicKeyEncrypt, privateKey, privateKeyDecrypt)
	}

	async sign(name: string, data: any) {
		const payload = JSON.stringify({ ...data, signatures: undefined })
		const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', this.privateKey!, new TextEncoder().encode(payload))
		if (!data.signatures) {
			data.signatures = []
		}

		data.signatures.push({
			name,
			signature: toBase64(signature),
		})
	}

	async verify(name: string, data: any) {
		const signature = data.signatures.find((sig: any) => sig.name === name)
		const payload = JSON.stringify({ ...data, signatures: undefined })
		return await crypto.subtle.verify(
			'RSASSA-PKCS1-v1_5',
			this.publicKey,
			fromBase64(signature.signature),
			new TextEncoder().encode(payload),
		)
	}

	async verifyRaw(signature: string, data: Uint8Array) {
		return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', this.publicKey, fromBase64(signature), data)
	}

	async encrypt(data: string) {
		const crypt = await SymmetricCrypt.create(SymmetricCrypt.DOTNET_COMPAT_SYMMETRIC_ALGORITHM)
		const encryptedData = await crypt.encrypt(data, false)
		const aesKey = await crypt.getKey()
		const encryptedKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, this.publicKeyEncrypt, aesKey)

		const json = {
			data: encryptedData,
			encryptedKey: toBase64(encryptedKey),
		}
		return toBase64(new TextEncoder().encode(JSON.stringify(json)))
	}

	async decrypt(data: string) {
		const json = JSON.parse(new TextDecoder().decode(fromBase64(data)))
		const aesKey = await crypto.subtle.decrypt(
			{ name: 'RSA-OAEP' },
			this.privateKeyDecrypt!,
			fromBase64(json.encryptedKey),
		)
		const crypt = await SymmetricCrypt.fromKey(SymmetricCrypt.DOTNET_COMPAT_SYMMETRIC_ALGORITHM, aesKey)
		return await crypt.decrypt(json.data)
	}

	async publicKeyPem(): Promise<string> {
		return `-----BEGIN PUBLIC KEY-----\n${toBase64(
			await crypto.subtle.exportKey('spki', this.publicKey),
		)}\n-----END PUBLIC KEY-----`
	}

	async privateKeyPem(): Promise<string> {
		return `-----BEGIN PRIVATE KEY-----\n${toBase64(
			await crypto.subtle.exportKey('pkcs8', this.privateKey!),
		)}\n-----END PRIVATE KEY-----`
	}
}
