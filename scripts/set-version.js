import { readFileSync, writeFileSync } from 'fs';
import Path from 'path';


const pack = JSON.parse(readFileSync('./package.json'))
const versionTsPath = './src/version.ts'

const releaseDate = new Date().toISOString();

writeFileSync(versionTsPath, `
	export const version = '${pack.version}'
	export const releaseDate = new Date('${releaseDate}')
`)
