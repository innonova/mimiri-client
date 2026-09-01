import { readFileSync, readdirSync, lstatSync, mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import { fromUint8Array } from 'js-base64'
import Path from 'path'

// Packaging half of make-bundle.js: builds the exact unsigned bundle JSON that
// make-bundle signs (the payload bytes RSASSA-PKCS1-v1_5/SHA-256 is computed
// over), but requires no private key. Runs in CI; the signing half runs
// on-prem against the attested output of this script.

const zip = async text => {
	return toBase64(
		await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(),
	)
}
export const toBase64 = data => {
	if (data instanceof Uint8Array) {
		return fromUint8Array(data)
	}
	return fromUint8Array(new Uint8Array(data))
}

const keyName = process.argv[2]

if (!keyName) {
	console.error('usage: pack-bundle <keyName>')
	process.exit(1)
}

const pack = JSON.parse(readFileSync('./package.json'))

console.log(`Packing unsigned bundle ${pack.version}`)

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

// These bytes are the signing payload; the signer appends `signatures` last so
// clients can reconstruct them with JSON.stringify({...data, signatures: undefined}).
const payload = JSON.stringify(bundle)

const meta = {
	keyName,
	version: pack.version,
	releaseDate: bundle.releaseDate,
	commit: process.env.GITHUB_SHA ?? null,
	unsignedSize: payload.length,
	minElectronVersion: pack.minElectronVersionWin32, // only windows installs really exist prior to this point
	minElectronVersionWin32: pack.minElectronVersionWin32,
	minElectronVersionDarwin: pack.minElectronVersionDarwin,
	minElectronVersionLinux: pack.minElectronVersionLinux,
	minIosVersion: pack.minIosVersion,
	minAndroidVersion: pack.minAndroidVersion,
}

try {
	mkdirSync('./bundles')
} catch {}

await writeFile(`./bundles/${keyName}.${bundle.version}.unsigned.json`, payload)
await writeFile(`./bundles/${keyName}.${bundle.version}.meta.json`, JSON.stringify(meta, undefined, '  '))

console.log(`Unsigned bundle packed ./bundles/${keyName}.${bundle.version}.unsigned.json (${payload.length} bytes)`)
