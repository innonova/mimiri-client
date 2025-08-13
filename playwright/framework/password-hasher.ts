import { fromHex, toHex } from './hex-base64'

class PasswordHasher {
	async hashPassword(password: string, salt: string, algorithm: string, iterations: number): Promise<string> {
		const algorithmParts = algorithm.split(';')
		if (algorithmParts[0] != 'PBKDF2' || algorithmParts[1] != 'SHA512') {
			throw new Error(`Unsupported Algorithm ${algorithm}`)
		}

		const passwordBuffer = new TextEncoder().encode(password)

		const passwordKey = await (globalThis as any).crypto.subtle.importKey(
			'raw',
			passwordBuffer,
			{ name: 'PBKDF2' },
			false,
			['deriveBits'],
		)
		const passwordHash = await (globalThis as any).crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: fromHex(salt),
				iterations: iterations,
				hash: { name: 'SHA-512' },
			},
			passwordKey,
			2048,
		)
		return toHex(passwordHash)
	}

	async computeResponse(passwordHash: string, challenge: string): Promise<string> {
		const hmacKey = await (globalThis as any).crypto.subtle.importKey(
			'raw',
			fromHex(passwordHash),
			{ name: 'HMAC', hash: 'SHA-512' },
			false,
			['sign'],
		)
		const response = await (globalThis as any).crypto.subtle.sign(
			{ name: 'HMAC', hash: 'SHA-512' },
			hmacKey,
			fromHex(challenge),
		)
		return toHex(response)
	}
}

export const passwordHasher = new PasswordHasher()
