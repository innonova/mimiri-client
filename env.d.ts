/// <reference types="vite/client" />

declare global {
	const __DEV_VERSION__: string
}

import type { InterpolationParams } from './src/services/localization'

declare module 'vue' {
	interface ComponentCustomProperties {
		$t: (key: string, params?: InterpolationParams) => string
	}
}
