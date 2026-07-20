import { reactive } from 'vue'

export type LocaleScalar = string

export interface LocaleData {
	[key: string]: LocaleScalar | LocaleData
}

export type InterpolationParams = Record<string, string | number>

export class LocalizationProvider {
	private locales = new Map<string, LocaleData>()
	private state = reactive({ currentLocale: 'en', fallbackLocale: 'en' })

	register(locale: string, data: LocaleData): void {
		this.locales.set(locale, data)
	}

	setLocale(locale: string): void {
		this.state.currentLocale = locale
	}

	setFallbackLocale(locale: string): void {
		this.state.fallbackLocale = locale
	}

	get currentLocale(): string {
		return this.state.currentLocale
	}

	get fallbackLocale(): string {
		return this.state.fallbackLocale
	}

	has(key: string): boolean {
		return (
			this.resolve(key, this.state.currentLocale) !== undefined ||
			this.resolve(key, this.state.fallbackLocale) !== undefined
		)
	}

	/** Translate a key to a string. Placeholders in the form {name} are replaced by params. */
	t(key: string, params?: InterpolationParams): string {
		const value = this.resolve(key, this.state.currentLocale) ?? this.resolve(key, this.state.fallbackLocale)

		if (value === undefined) {
			return key
		}
		if (typeof value !== 'string') {
			return key
		}

		return this.interpolate(value, params)
	}

	private resolve(key: string, locale: string): LocaleScalar | undefined {
		const data = this.locales.get(locale)
		if (!data) {
			return undefined
		}

		const parts = key.split('.')
		let current: LocaleScalar | LocaleData = data

		for (const part of parts) {
			if (typeof current !== 'object' || Array.isArray(current)) {
				return undefined
			}
			const next = (current as LocaleData)[part]
			if (next === undefined) {
				return undefined
			}
			current = next
		}

		if (typeof current === 'object' && !Array.isArray(current)) {
			return undefined
		}

		return current as LocaleScalar
	}

	private interpolate(template: string, params?: InterpolationParams): string {
		if (!params) {
			return template
		}
		return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
	}
}
