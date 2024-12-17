import shell from 'shelljs';
import Path from 'path';
import { readdir, writeFile } from 'fs/promises';

const cwd = process.cwd()

const sourcePath = Path.join(cwd, 'src/icon-sources')


for (const collection of await readdir(sourcePath)) {
	const iconPath = Path.join(sourcePath, collection)
	let html = ''

	for (const svgPath of await readdir(iconPath)) {
		html += `<div style="display:inline-flex;margin:5px;flex-direction: column;border: solid 1px black;"><img src="${svgPath}" width="100" height="100"><div>${svgPath.replace('.svg', '')}</div></div>\n`
	}

	console.log(Path.join(iconPath, 'index.html'));

	await writeFile(Path.join(iconPath, 'index.html'), html)
}

