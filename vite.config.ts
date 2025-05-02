import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	plugins: [vue()],
	server: {
		allowedHosts: ['app-dev-aek.mimiri.io'],
	},
})
