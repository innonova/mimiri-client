import { readFileSync, writeFileSync } from 'fs';

const increment = process.argv[2] === 'increment';


const pack = JSON.parse(readFileSync('./package.json'))
const versionTsPath = './src/version.ts'

if (increment) {
	const match = /(\d+\.\d+\.)(\d+)/.exec(pack.version)
	pack.version = `${match[1]}${+match[2] + 1}`
	writeFileSync('./package.json', JSON.stringify(pack, undefined, '\t'))
}

const releaseDate = new Date().toISOString();

writeFileSync(versionTsPath, `
	export const version = '${pack.version}'
	export const releaseDate = new Date('${releaseDate}')
`)
