import { readFileSync, readdirSync, writeFileSync, lstatSync, mkdirSync } from 'fs';
import { fromUint8Array } from 'js-base64'
import Path from 'path';


const zip = async (text) => {
	return toBase64(
		await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(),
	)
}
export const toBase64 = (data) => {
	if (data instanceof Uint8Array) {
		return fromUint8Array(data)
	}
	return fromUint8Array(new Uint8Array(data))
}

export const fromBase64 = (base64) => {
	return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

const pemToArrayBuffer = (pem) => {
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

const keyName = process.argv[2];

const privatePem = readFileSync(`./certs/${keyName}.key`).toString()

const privateKey = await crypto.subtle.importKey(
	'pkcs8',
	pemToArrayBuffer(privatePem),
	{
		name: 'RSASSA-PKCS1-v1_5',
		hash: 'SHA-256',
	},
	true,
	['sign'],
)


const pack = JSON.parse(readFileSync('./package.json'))

console.log(`Creating Bundle ${pack.version}`)

const bundle = { files: [] }
const recurseDir = async (dir, current) => {
	for (const sub of readdirSync(dir)) {
		const path = Path.join(dir, sub)
		if (lstatSync(path).isDirectory()) {
			const files = []
			current.push({ name: sub, files })
			await recurseDir(path, files)
		} else {
			current.push({ name: sub, content: await zip(readFileSync(path)) })
		}
	}
}
await recurseDir('./dist', bundle.files)
bundle.version = pack.version
bundle.description = ''
bundle.releaseDate = new Date()


const payload = new TextEncoder().encode(JSON.stringify(bundle));
bundle.signatures = [{
	name: keyName,
	signature: toBase64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, payload))
}]


try {
	mkdirSync('./bundles')
} catch { }

const output = JSON.stringify(bundle);

const info = {
	...bundle,
	files: undefined,
	signatures: undefined,
	size: output.length,
	minElectronVersion: pack.minElectronVersion,
	minIosVersion: pack.minIosVersion,
	minAndroidVersion: pack.minAndroidVersion
}

writeFileSync(`./bundles/${keyName}.${bundle.version}.json`, output)
writeFileSync(`./bundles/${keyName}.${bundle.version}.info.json`, JSON.stringify(info))
writeFileSync(`./bundles/${keyName}.latest.json`, JSON.stringify(info))

writeFileSync('./artifacts.json', JSON.stringify([
	`./bundles/${keyName}.${bundle.version}.json`,
	`./bundles/${keyName}.${bundle.version}.info.json`,
	`./bundles/${keyName}.latest.json`,
], undefined, '  '))

console.log(`Bundle Created ${pack.version} ${`./bundles/${keyName}.${bundle.version}.json`}`)
