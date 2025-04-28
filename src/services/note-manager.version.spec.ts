import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { MimerClient } from './mimer-client'
import { NoteManager } from './note-manager'
import type { MimerNote } from './types/mimer-note'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('Version', () => {
	const TEST_NAME = 'version'
	const _manager = new NoteManager('http://localhost:5292/api', '', '', '')

	let _note: MimerNote

	beforeAll(async () => {
		MimerClient.DEFAULT_ITERATIONS = 10
		await _manager.beginTest(TEST_NAME)
	})

	afterAll(async () => {
		await _manager.endTest(false)
	})

	test('CreateUser', async () => {
		await _manager.createAccount('alice', 'secret', 1000)
		expect(_manager.isLoggedIn).toBeTruthy()
	})

	test('CreateNote', async () => {
		await _manager.root.addChild('Test Node 1')
		_note = _manager.root.children[0]
		expect(_note).toBeDefined()
	})

	test('ChangeNoteText', async () => {
		let expectedMetadataVersion = 1
		let expectedHistoryVersion = 0
		let expectedTextVersion = 0
		expect(_note).toBeDefined()
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)

		_note.text = 'Test Text 1'
		await _note.save()
		expectedHistoryVersion++
		expectedTextVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)

		_note.text = 'Test Text 2'
		await _note.save()
		expectedHistoryVersion++
		expectedTextVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)
	})

	test('ChangeNoteTitle', async () => {
		expect(_note).toBeDefined()
		let expectedMetadataVersion = _note.getVersion('metadata')
		let expectedHistoryVersion = _note.getVersion('history')
		let expectedTextVersion = _note.getVersion('text')

		_note.title = 'Test Node 1 changed'
		await _note.save()
		expectedMetadataVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)

		_note.title = 'Test Node 1'
		await _note.save()
		expectedMetadataVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)
	})

	test('ChangeNoteChildren', async () => {
		expect(_note).toBeDefined()
		let expectedMetadataVersion = _note.getVersion('metadata')
		let expectedHistoryVersion = _note.getVersion('history')
		let expectedTextVersion = _note.getVersion('text')

		await _note.addChild()
		expectedMetadataVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)

		await _note.addChild()
		expectedMetadataVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)

		await _note.children[0].delete()
		expectedMetadataVersion++
		expect(_note.getVersion('metadata')).toBe(expectedMetadataVersion)
		expect(_note.getVersion('history')).toBe(expectedHistoryVersion)
		expect(_note.getVersion('text')).toBe(expectedTextVersion)
	})
})
