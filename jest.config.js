/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
	testEnvironment: "node",
	transform: {
		"^.+.tsx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json", diagnostics: { ignoreCodes: ['TS151001'] } }],
	},
	testPathIgnorePatterns: [
		"/node_modules/",
		"/playwright/"
	],
};