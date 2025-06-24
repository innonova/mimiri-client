import { toBase64 } from '../hex-base64'
import { newGuid, type Guid } from './guid'

export interface NoteItem {
	version: number
	type: string
	data: any
	updated?: boolean
	changed?: boolean
	size?: number
	modified?: string
	created?: string
}

export class Note {
	public id: Guid = newGuid()
	public keyName: Guid
	public items: NoteItem[] = []
	public isCache: boolean
	public sync: number
	public modified: string
	public created: string

	public getItem(type: string) {
		let result: NoteItem = this.items.find(item => item.type === type)
		if (!result) {
			result = {
				version: 0,
				type,
				data: {},
				size: 0,
			}
			this.items.push(result)
		}
		return result.data
	}

	public changeItem(type: string) {
		let result: NoteItem = this.items.find(item => item.type === type)
		if (!result) {
			result = {
				version: 0,
				type,
				data: {},
				size: 0,
			}
			this.items.push(result)
		}
		result.changed = true
		return result.data
	}

	public getVersion(type: string) {
		const result: NoteItem = this.items.find(item => item.type === type)
		if (result) {
			return +result.version
		}
		return 0
	}

	public has(type: string) {
		return !!this.items.find(item => item.type === type)
	}

	public get types() {
		return this.items.map(item => item.type)
	}

	public get size() {
		const encoder = new TextEncoder()
		let total = 0
		for (const item of this.items) {
			if (item.changed) {
				const size = toBase64(encoder.encode(JSON.stringify(item.data))).length
				// add 64 to (over)compensate for encryption padding and base64
				total += size + 64
			} else {
				total += item.size
			}
		}
		return total
	}

	public get historySize() {
		const encoder = new TextEncoder()
		let total = 0
		for (const item of this.items.filter(i => i.type === 'history')) {
			if (item.changed) {
				const size = toBase64(encoder.encode(JSON.stringify(item.data))).length
				// add 64 to (over)compensate for encryption padding and base64
				total += size + 64
			} else {
				total += item.size
			}
		}
		return total
	}

	public get dataSize() {
		const encoder = new TextEncoder()
		let total = 0
		for (const item of this.items.filter(i => i.type !== 'history')) {
			if (item.changed) {
				const size = toBase64(encoder.encode(JSON.stringify(item.data))).length
				// add 64 to (over)compensate for encryption padding and base64
				total += size + 64
			} else {
				total += item.size
			}
		}
		return total
	}
}
