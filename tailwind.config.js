/** @type {import('tailwindcss').Config} */
export default {
	purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	darkMode: 'selector',
	content: [],
	theme: {
		fontFamily: {
			display: ['Segoe UI', 'Verdana', 'Ubuntu', 'Noto Sans'],
			editor: ['Consolas', 'Courier New', 'monospace']
		},
		fontSize: {
			'size-base': ['14px', '1'],
			'size-menu': ['13px', '20px'],
			'size-title': ['16px', '1'],
			'size-header': ['24px', '1.3'],
			'size-input': ['16px', '1.5'],
		},
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			white: '#fff',
			black: '#000',
			backdrop: 'var(--color-backdrop)',
			back: 'var(--color-back)',
			text: 'var(--color-text)',
			logo: 'var(--color-logo)',
			'title-bar': 'var(--color-title-bar)',
			'title-text': 'var(--color-title-text)',
			'title-text-blur': 'var(--color-title-text-blur)',
			'title-hover': 'var(--color-title-hover)',
			'menu': 'var(--color-menu)',
			'menu-text': 'var(--color-menu-text)',
			'menu-hover': 'var(--color-menu-hover)',
			'menu-disabled': 'var(--color-menu-disabled)',
			'menu-separator': 'var(--color-menu-separator)',
			'item-selected': 'var(--color-item-selected)',
			'drop-indicator': 'var(--color-drop-indicator)',
			shared: 'var(--color-shared)',
			'search-parent': 'var(--color-search-parent)',
			error: 'var(--color-error)',
			online: 'var(--color-online)',
			offline: 'var(--color-offline)',
			warning: 'var(--color-warning)',
			'button-primary': 'var(--color-button-primary)',
			'button-disabled': 'var(--color-button-disabled)',
			'button-primary-text': 'var(--color-button-primary-text)',
			'button-disabled-text': 'var(--color-button-disabled-text)',
			'dialog': 'var(--color-dialog)',
			'dialog-border': 'var(--color-dialog-border)',
			'button-secondary': 'var(--color-button-secondary)',
			'button-secondary-text': 'var(--color-button-secondary-text)',
			'input': 'var(--color-input)',
			'input-text': 'var(--color-input-text)',
			'input-selection': 'var(--color-input-selection)',
			'input-selected-text': 'var(--color-input-selected-text)',
			toolbar: 'var(--color-toolbar)',
			'toolbar-separator': 'var(--color-toolbar-separator)',
			'toolbar-disabled': 'var(--color-toolbar-disabled)',
			'toolbar-hover': 'var(--color-toolbar-hover)',
			'progress-indicator': 'var(--color-progress-indicator)',
			'info-bar': 'var(--color-info-bar)',
		},
		extend: {},
	},
	plugins: [],
}

