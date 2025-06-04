import fonts from '../assets/fonts.json'
import { mimiriPlatform } from './mimiri-platform'

export interface MimiriFont {
	name: string
	url: string
	loaded: boolean
	license: string
	link: string
}

export class FontManager {
	private _sizes: number[] = []
	private _fonts: MimiriFont[] = []

	constructor() {
		for (let i = 8; i <= 30; i++) {
			this._sizes.push(i)
		}
		this._fonts.push({ name: 'Courier New', url: '', loaded: true, license: '', link: '' })
		if (mimiriPlatform.isMac || mimiriPlatform.isIos) {
			this._fonts.push({ name: 'Menlo', url: '', loaded: true, license: '', link: '' })
			this._fonts.push({ name: 'Monaco', url: '', loaded: true, license: '', link: '' })
		}
		if (mimiriPlatform.isWindows) {
			this._fonts.push({ name: 'Consolas', url: '', loaded: true, license: '', link: '' })
		}
		this._fonts.sort((a, b) => a.name.localeCompare(b.name))
		for (const font of fonts) {
			this._fonts.push({ ...font, loaded: false })
		}
		this._fonts.sort((a, b) => a.name.localeCompare(b.name))
	}

	public load(name: string) {
		const font = this._fonts.find(f => f.name === name)
		if (font && !font.loaded) {
			const elm = document.createElement('style')
			elm.textContent = `@font-face {	font-family: '${font.name}'; src: local('${font.name}'), url('${font.url}');	} `
			document.body.appendChild(elm)
			font.loaded = true
		}
	}

	public async fetchLicense(name: string) {
		try {
			const font = this._fonts.find(f => f.name === name)
			const url = font.url.replace(/(\.woff2|\.ttf|\.otf)$/, '.license.txt')
			const license = await fetch(url).then(res => res.text())
			return license
		} catch (ex) {
			console.log(ex)
		}
		return ''
	}

	public getLink(name: string) {
		const font = this._fonts.find(f => f.name === name)
		return font.link
	}

	public exists(name: string) {
		return !!this._fonts.find(f => f.name === name)
	}

	public get defaultEditorFontFace() {
		if (mimiriPlatform.isMac || mimiriPlatform.isIos) {
			return 'Menlo'
		}
		if (mimiriPlatform.isLinux || mimiriPlatform.isAndroid) {
			return 'Droid Sans Mono'
		}
		return 'Consolas'
	}

	public get defaultEditorFontSize() {
		if (mimiriPlatform.isPhone || mimiriPlatform.isTablet) {
			return 16
		}
		return 14
	}

	public get families() {
		return this._fonts.map(font => font.name)
	}

	public get licenses() {
		return this._fonts.filter(font => !!font.license).map(font => ({ name: font.name, license: font.license }))
	}

	public get sizes() {
		return this._sizes
	}
}
