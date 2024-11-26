import { v4 as uuid } from 'uuid'

export type Guid = string & { __type: 'Guid' }

type AssertGuid = (value: string) => asserts value is Guid

export const isValidGuid = (value: string): value is Guid => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
}

export const assertGuid: AssertGuid = (value: string): asserts value is Guid => {
	if (!isValidGuid(value)) throw new Error('Value must be a UUID')
}

export const newGuid = (): Guid => {
	const result = uuid()
	assertGuid(result)
	return result
}

export const emptyGuid = (): Guid => {
	return '00000000-0000-0000-0000-000000000000' as Guid
}
