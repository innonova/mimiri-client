import { describe, it, expect } from '@jest/globals'
import { deserialize } from './mimiri-deserializer'
import { serialize } from './mimiri-serializer'

// Notes are stored as plain text. Monaco edits that text raw; ProseMirror
// goes through deserialize() -> doc -> serialize(). Anything the deserializer
// understands must survive the trip back unchanged, otherwise toggling the
// editor mode silently destroys content (see issue #52).
const roundTrip = (text: string) => serialize(deserialize(text))

describe('ProseMirror serializer round-trip', () => {
	const cases: [string, string][] = [
		['markdown link', '[title](https://www.example.com)'],
		['markdown link with surrounding text', 'see [the docs](https://mimiri.io/userguide) for details'],
		['markdown link inside list item', '- [title](https://www.example.com)'],
		['markdown link inside bold', '**[title](https://www.example.com)**'],
		['markdown link with query string', '[search](https://example.com/path?q=a&b=c#frag)'],
		['two links on one line', '[one](https://one.example) and [two](https://two.example)'],
		['bare url', 'https://www.example.com'],
		['bare url in text', 'go to https://www.example.com/path now'],
		['bold', '**bold**'],
		['italic', '*italic*'],
		['inline code', '`code`'],
		['password', 'p`secret`'],
	]

	it.each(cases)('%s', (_name, text) => {
		expect(roundTrip(text)).toBe(text)
	})
})
