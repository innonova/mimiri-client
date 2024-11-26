export type DateTime = string & { __type: 'DateTime' }

type AssertDateTime = (value: string) => asserts value is DateTime

export const isValidDateTime = (value: string): value is DateTime => {
	return /^2[0-9]{3}-[0-9][0-9]-[0-9][0-9]T[0-2][0-9]:[0-9][0-9]:[0-9][0-9].[0-9]{3}Z$/.test(value)
}

export const assertDateTime: AssertDateTime = (value: string): asserts value is DateTime => {
	if (!isValidDateTime(value)) throw new Error('Value must be a UUID')
}

export const dateTimeNow = (): DateTime => {
	const result = new Date().toISOString()
	assertDateTime(result)
	return result
}
