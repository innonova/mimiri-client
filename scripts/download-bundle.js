import shell from 'shelljs'
import { readFileSync } from 'node:fs'

const info = JSON.parse(readFileSync('./bundle-info.json'));

console.log(`Download bundle from ${info.url}`)
shell.exec(`curl ${info.url} -o ./bundle.json`)

const res = shell.exec(`sha256sum ./bundle.json`)
const hash = /\w+/.exec(res.stdout)[0]

if (hash !== info.hash) {
	shell.rm('-f', './bundle.json')
	throw new Error('Hash mismatch')
}




