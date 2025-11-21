import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default defineConfigWithVueTs(
	{
		name: 'app/files-to-lint',
		files: ['**/*.{ts,mts,tsx,vue}'],
	},

	{
		name: 'app/files-to-ignore',
		ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
	},

	pluginVue.configs['flat/recommended'],
	vueTsConfigs.recommended,

	{
		languageOptions: {
			parserOptions: {
				project: ["./tsconfig.app.json", "./tsconfig.node.json"],
				tsconfigRootDir: process.cwd(),
			}
		},
		rules: {
			"vue/multi-word-component-names": "off",
			"vue/max-attributes-per-line": "off",
			"vue/singleline-html-element-content-newline": "off",
			"vue/no-v-html": "off",
			"vue/html-indent": "off",
			"vue/multiline-html-element-content-newline": "off",
			"vue/html-closing-bracket-newline": "off",
			"vue/attributes-order": "off",
			"vue/attribute-hyphenation": "off",
			"vue/html-self-closing": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"vue/html-closing-bracket-spacing": "off",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					"varsIgnorePattern": "^_",
					"argsIgnorePattern": "^_"
				}
			],
			"vue/no-unused-vars": [
				"error",
				{
					"ignorePattern": "^_"
				}
			],
			"curly": "error",
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{
					"assertionStyle": "as",
					"objectLiteralTypeAssertions": "never"
				}
			],
			"@typescript-eslint/no-floating-promises": [
				"warn",
				{
					"ignoreVoid": true,
					"ignoreIIFE": false
				}
			]
		}
	}
)
