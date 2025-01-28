import shell from 'shelljs';
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import Path from "path";

const cwd = process.cwd()
const jsonFile = Path.join(cwd, 'src/icons.json')
const remix = Path.join(cwd, 'src/icons.remix')
const dest = Path.join(cwd, 'src/icons')
const cache = Path.join(cwd, 'src/icons.cache')

shell.mkdir('-p', cache)

const json = JSON.parse(readFileSync(jsonFile))

const attributionMap = {}

for (const key of Object.keys(json)) {
	console.log(key);
	let icon = ''
	const iconObj = json[key]
	if (iconObj.attribution) {
		attributionMap[iconObj.attribution] = 0
	}
	if (iconObj.remix) {
		icon = readFileSync(Path.join(remix, iconObj.remix)).toString();
	} else {
		const url = iconObj.url
		const cacheName = url.replaceAll(/https?:\/\//g, '').replaceAll(/[\/:]/g, '_')
		const cachePath = Path.join(cache, cacheName)
		if (!existsSync(cachePath)) {
			shell.exec(`curl ${url} -o ${cachePath}`)
		}
		icon = readFileSync(cachePath).toString();
	}

	icon = icon.replace(/<\?xml[^>]+>/, '')
	icon = icon.replace(/<sodipodi:namedview[^>]+>/, '')
	icon = icon.replace(/<defs[^>]+>/, '')
	icon = icon.replaceAll(/sodipodi:[a-z]+="[^"]+"/g, '')
	icon = icon.replaceAll(/xmlns:sodipodi="[^"]+"/g, '')
	icon = icon.replaceAll(/inkscape:[a-z]+="[^"]+"/g, '')
	icon = icon.replaceAll(/xmlns:inkscape="[^"]+"/g, '')
	icon = icon.replace(`<!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->`, '')
	icon = icon.replace(`width="800px"`, 'width="100%"')
	icon = icon.replace(`height="800px"`, 'height="100%"')
	icon = icon.replaceAll(/#[0-9A-Fa-f]{6}/g, 'currentColor')
	icon = icon.replaceAll(/\n\s+\n/g, '\n')
	icon = icon.replaceAll(/\s+\/>/g, ' />')

	const customizableIcon = `<template>
	<div>
${icon.trim()}
	</div>
</template>`;
	const destPath = Path.join(dest, `${key}.vue`);
	writeFileSync(destPath, customizableIcon);


}

const attributions = []
for (const key of Object.keys(attributionMap)) {
	attributions.push(key)
}
writeFileSync(Path.join(dest, `attributions.ts`), `export const iconAttributions = ${JSON.stringify(attributions, undefined, '  ')}`);



