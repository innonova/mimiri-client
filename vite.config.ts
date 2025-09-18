import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
	plugins: [vue()],
	server: {
		allowedHosts: ['app-dev-aek.mimiri.io'],
		watch: {
			ignored: [
				'**/node_modules/**',
				'**/.*/**',
				'**/screenshots/**',
				'**/dist/**',
				'**/certs/**',
				'**/docs/**',
				'**/android/**',
				'**/ios/**',
				'**/scripts/**',
			],
		},
	},
	define: {
		__DEV_VERSION__: JSON.stringify(packageJson.version),
	},
})
