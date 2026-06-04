import { zip } from 'fflate'

export interface ZipEntry {
	/** Path inside the ZIP archive, using forward slashes (e.g. "folder/file.md"). */
	name: string
	/** Raw bytes of the file content. */
	data: Uint8Array
}

export function createZip(entries: ZipEntry[]): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const files: Record<string, Uint8Array> = {}
		for (const entry of entries) {
			files[entry.name] = entry.data
		}
		zip(files, (err, data) => {
			if (err) reject(err)
			else resolve(data)
		})
	})
}
