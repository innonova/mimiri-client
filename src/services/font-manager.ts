import { reactive } from 'vue'

export interface MimiriFont {
	family: string
	variants: string[]
}

export class FontManager {
	private _fonts: FontFace[] = []
	private _families: { [family: string]: MimiriFont } = {}
	private _state: { families: string[]; hasPermission: boolean; canGetPermission: boolean } = reactive({
		families: [],
		hasPermission: false,
		canGetPermission: false,
	})

	constructor() {
		void this.init()
	}

	private async init() {
		try {
			const { state } = await navigator.permissions.query({ name: 'local-fonts' as PermissionName })
			this._state.hasPermission = state === 'granted'
			this._state.canGetPermission = state === 'prompt'
			// this._state.hasPermission = false
			// this._state.canGetPermission = false
		} catch (err) {
			console.log(err)
		}
	}

	public async load() {
		this._fonts = await this.attemptFontApi()
		if (this._fonts.length > 0) {
			for (const font of this._fonts) {
				if (!this._families[font.family]) {
					this._state.families.push(font.family)
					this._families[font.family] = {
						family: font.family,
						variants: [font.style],
					}
				} else {
					this._families[font.family].variants.push(font.style)
				}
			}
			this._state.hasPermission = true
			this._state.canGetPermission = false
		}
	}

	private async attemptFontApi() {
		try {
			return await (window as any).queryLocalFonts()
		} catch (ex) {
			console.log(ex)
		}
		return []
	}

	public get families() {
		return this._state.families
	}

	public get hasPermission() {
		return this._state.hasPermission
	}

	public get canGetPermission() {
		return this._state.canGetPermission
	}
}
