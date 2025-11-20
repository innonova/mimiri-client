import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')

	return {
		plugins: [
			vue(),
			viteStaticCopy({
				targets: [
					{
						src: 'node_modules/vscode-oniguruma/release/onig.wasm',
						dest: 'wasm',
					},
				],
			}),
		],
		server: {
			allowedHosts: env.VITE_ALLOWED_HOST ? [env.VITE_ALLOWED_HOST] : [],
			fs: {
				allow: [
					resolve(__dirname, 'src'),
					resolve(__dirname, 'public'),
					resolve(__dirname, 'node_modules'),
					resolve(__dirname, 'index.html'),
				],
			},
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
	}
})
