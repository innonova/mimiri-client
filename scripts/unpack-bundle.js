import shell from 'shelljs'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const bundlePath = './dist'
const jsonPath = './bundle.json'

const fromBase64 = (base64) => {
	return Uint8Array.from(atob(base64), c => c.charCodeAt(0))
}

const unzip = async (text) => {
	return await new Response(new Blob([fromBase64(text)]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

const saveFilesRecursive = async (dir, file) => {
	if (file.files) {
		const subDir = join(dir, file.name)
		try {
			await mkdir(subDir)
		} catch { }
		for (const subFile of file.files) {
			await saveFilesRecursive(subDir, subFile)
		}
	} else {
		const filePath = join(dir, file.name)
		await writeFile(filePath, Buffer.from(await unzip(file.content)))
	}
}

const save = async () => {
	const bundleData = await readFile(jsonPath)
	const bundle = JSON.parse(bundleData.toString())
	shell.rm('-rf', bundlePath)
	try {
		await mkdir(bundlePath)
	} catch { }
	for (const file of bundle.files) {
		await saveFilesRecursive(bundlePath, file)
	}
}
save()
