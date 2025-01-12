export const generateRandomString = (length: number): string => {
	let result = ''
	const characters = 'abcdefghijklmnopqrstuvwxyz1234567890'
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}
