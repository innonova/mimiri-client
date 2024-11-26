import { v4 as uuid } from 'uuid'
import { fromUint8Array } from 'js-base64'
import { writeFileSync, mkdirSync } from 'fs';

export const toBase64 = (data) => {
	if (data instanceof Uint8Array) {
		return fromUint8Array(data)
	}
	return fromUint8Array(new Uint8Array(data))
}

export const toHex = (data) => {
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

const key = await crypto.subtle.generateKey(
	{
		name: 'RSASSA-PKCS1-v1_5',
		modulusLength: 3072,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: 'SHA-256',
	},
	true,
	['sign', 'verify'],
)


const biCif = value => {
	if (value < 10) {
		return `0${value}`
	}
	return `${value}`
}

const rand = new Uint8Array(4);
crypto.getRandomValues(rand)


const date = new Date()
const name = `${date.getFullYear()}${biCif(date.getMonth() + 1)}${biCif(date.getDate())}${toHex(rand)}`


const publicKey = `-----BEGIN PUBLIC KEY-----\n${toBase64(
	await crypto.subtle.exportKey('spki', key.publicKey),
)}\n-----END PUBLIC KEY-----`

const privateKey = `-----BEGIN PRIVATE KEY-----\n${toBase64(
	await crypto.subtle.exportKey('pkcs8', key.privateKey),
)}\n-----END PRIVATE KEY-----`

try {
	mkdirSync('./certs')
} catch { }

writeFileSync(`./certs/${name}.pub`, publicKey)
writeFileSync(`./certs/${name}.key`, privateKey)

