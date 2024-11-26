import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'io.mimiri.app',
	appName: 'mimiri',
	webDir: 'dist',
}
console.log('-----------------------------')
if (process.env.NODE_ENV === 'development') {
	const host = process.env.VITE_MIMER_DEV_API_HOST
	console.log('Environment: Development')
	console.log(`Server: ${host}`)
	config.server = {
		url: host,
		cleartext: true,
	}
} else {
	console.log('Environment: Production')
}
console.log('-----------------------------')

export default config
