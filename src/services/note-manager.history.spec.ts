import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { MimerClient } from './mimer-client'
import { NoteManager } from './note-manager'
import type { MimerNote } from './types/mimer-note'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('Version', () => {
	const TEST_NAME = 'history'
	const _managerAlice = new NoteManager('http://localhost:5292/api', '', '')

	let _note: MimerNote
	let _nextHistoryId = 1

	beforeAll(async () => {
		MimerClient.DEFAULT_ITERATIONS = 10
		await _managerAlice.beginTest(TEST_NAME)
	})

	afterAll(async () => {
		await _managerAlice.endTest(false)
	})

	test('Alice_CreateUser', async () => {
		await _managerAlice.createAccount('alice', 'secret', 1000)
		expect(_managerAlice.isLoggedIn).toBeTruthy()
	})

	test('Alice_CreateHistory', async () => {
		await _managerAlice.root.addChild('History Test')
		_note = _managerAlice.root.children[0]
		expect(_note).toBeDefined()
		for (let i = 0; i < 5; i++) {
			_note.text = `Text Value ${_nextHistoryId++}`
			await _note.save()
		}
	})

	test('Alice_ReadHistory', async () => {
		expect(_note).toBeDefined()
		expect(await _note.loadHistory()).toBeFalsy()
		expect(_note.historyItems.length).toBe(5)
	})

	test('Alice_CreateHistoryArchive', async () => {
		expect(_note).toBeDefined()
		for (let i = 0; i < 10; i++) {
			_note.text = `Text Value ${_nextHistoryId++}`
			await _note.save()
		}
	})

	test('Alice_ReadHistoryArchive', async () => {
		expect(_note).toBeDefined()
		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(10)
		expect(await _note.loadHistory()).toBeFalsy()
		expect(_note.historyItems.length).toBe(15)
	})

	test('Alice_CreateHistoryColdArchive', async () => {
		expect(_note).toBeDefined()
		for (let i = 0; i < 23; i++) {
			_note.text = `Text Value ${_nextHistoryId++}`
			await _note.save()
		}
	})

	test('Alice_ReadHistoryColdArchive', async () => {
		expect(_note).toBeDefined()
		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(10)

		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(12)

		expect(await _note.loadHistory()).toBeFalsy()
		expect(_note.historyItems.length).toBe(38)

		let index = 1
		for (let i = _note.historyItems.length - 1; i >= 0; i--) {
			expect(_note.historyItems[i].text).toBe(`Text Value ${index++}`)
		}
	})

	test('Alice_CreateHistoryColdArchive2', async () => {
		expect(_note).toBeDefined()
		for (let i = 0; i < 25; i++) {
			_note.text = `Text Value ${_nextHistoryId++}`
			await _note.save()
		}
	})

	test('Alice_ReadHistoryColdArchive2', async () => {
		expect(_note).toBeDefined()
		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(10)

		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(11)

		expect(await _note.loadHistory()).toBeTruthy()
		expect(_note.historyItems.length).toBe(37)

		expect(await _note.loadHistory()).toBeFalsy()
		expect(_note.historyItems.length).toBe(63)

		//Dev.Log("-------------------------------------------------------");
		//foreach (const item in _note.historyItems) {
		//	Dev.Log(item.text);
		//}
		//Dev.Log("-------------------------------------------------------");

		let index = 1
		for (let i = _note.historyItems.length - 1; i >= 0; i--) {
			expect(_note.historyItems[i].text).toBe(`Text Value ${index++}`)
		}
	})
})
