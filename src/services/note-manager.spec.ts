import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { MimerClient } from './mimer-client'
import { NoteManager } from './note-manager'
import type { MimerNote } from './types/mimer-note'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

describe('Note Manager', () => {
	const TEST_NAME = 'noteManager'
	const _managerAlice = new NoteManager('http://localhost:5292/api', '', '')
	let _managerBob: NoteManager

	let note1: MimerNote
	let note2: MimerNote
	let note3: MimerNote
	let note1_1: MimerNote
	let note1_2: MimerNote
	let note1_3: MimerNote
	let note2_1: MimerNote
	let note2_2: MimerNote
	let note2_3: MimerNote
	let note3_1: MimerNote
	let note3_2: MimerNote
	let note3_3: MimerNote
	let note1_1_1: MimerNote
	let note2_1_1: MimerNote
	let note2_2_1: MimerNote
	let note3_1_1: MimerNote
	let bobNode3_1: MimerNote
	let bobNode3_1_1: MimerNote

	beforeAll(async () => {
		MimerClient.DEFAULT_ITERATIONS = 10
		await _managerAlice.beginTest(TEST_NAME)
		_managerBob = _managerAlice.cloneTest()
	})

	afterAll(async () => {
		await _managerAlice.endTest(false)
	})

	test('Alice_CreateUser', async () => {
		await _managerAlice.createAccount('alice', 'secret')
		expect(_managerAlice.isLoggedIn).toBeTruthy()
		await _managerAlice.root.ensureChildren()
	})

	test('Alice_Login', async () => {
		_managerAlice.logout()
		await _managerAlice.login({ username: 'alice', password: 'secret' })
		expect(_managerAlice.isLoggedIn).toBeTruthy()
	})

	test('Alice_CreateNotes', async () => {
		expect(_managerAlice.root.children.length).toBe(0)
		await _managerAlice.root.ensureChildren()
		await _managerAlice.root.addChild('note1')
		await _managerAlice.root.addChild('note2')
		await _managerAlice.root.addChild('note3')
		expect(_managerAlice.root.children.length).toBe(3)
		note1 = _managerAlice.root.children[0]
		note2 = _managerAlice.root.children[1]
		note3 = _managerAlice.root.children[2]
		await note1.addChild('note1_1')
		await note1.addChild('note1_2')
		await note1.addChild('note1_3')
		await note2.addChild('note2_1')
		await note2.addChild('note2_2')
		await note2.addChild('note2_3')
		await note3.addChild('note3_1')
		await note3.addChild('note3_2')
		await note3.addChild('note3_3')

		note1_1 = note1.children[0]
		note1_2 = note1.children[1]
		note1_3 = note1.children[2]
		note2_1 = note2.children[0]
		note2_2 = note2.children[1]
		note2_3 = note2.children[2]
		note3_1 = note3.children[0]
		note3_2 = note3.children[1]
		note3_3 = note3.children[2]

		await note1_1.addChild('note1_1_1')
		await note1_1.addChild('note1_1_2')
		await note1_1.addChild('note1_1_3')

		await note2_1.addChild('note2_1_1')
		await note2_1.addChild('note2_1_2')
		await note2_1.addChild('note2_1_3')

		await note2_2.addChild('note2_2_1')
		await note2_2.addChild('note2_2_2')
		await note2_2.addChild('note2_2_3')

		await note2_3.addChild('note2_3_1')
		await note2_3.addChild('note2_3_2')
		await note2_3.addChild('note2_3_3')

		await note3_1.addChild('note3_1_1')
		note3_1_1 = note3_1.children[0]

		note1_1_1 = note1_1.children[0]
		await note1_1_1.addChild('note1_1_1_1')
		await note1_1_1.addChild('note1_1_1_2')
		await note1_1_1.addChild('note1_1_1_3')

		note2_1_1 = note2_1.children[0]
		await note2_1_1.addChild('note2_1_1_1')
		await note2_1_1.addChild('note2_1_1_2')
		await note2_1_1.addChild('note2_1_1_3')

		note2_2_1 = note2_2.children[0]
		await note2_2_1.addChild('note2_2_1_1')
		await note2_2_1.addChild('note2_2_1_2')
		await note2_2_1.addChild('note2_2_1_3')

		expect(note1).toBeDefined()
		expect(note2).toBeDefined()
		expect(note3).toBeDefined()
		expect(note1_1).toBeDefined()
		expect(note1_2).toBeDefined()
		expect(note1_3).toBeDefined()
		expect(note2_1).toBeDefined()
		expect(note2_2).toBeDefined()
		expect(note2_3).toBeDefined()
		expect(note3_1).toBeDefined()
		expect(note3_2).toBeDefined()
		expect(note3_3).toBeDefined()
		expect(note1_1_1).toBeDefined()
		expect(note2_1_1).toBeDefined()
	})

	test('Alice_CopyNote', async () => {
		expect(note1_1_1!.children.length).toBe(3)

		await note2_1!.copy(note1_1_1, -1)

		expect(note1_1_1!.children.length).toBe(4)

		await note1_1_1!.children[3].ensureChildren()

		expect(note1_1_1!.children[3].title).toBe('note2_1')
		expect(note1_1_1!.children[3].children[0].title).toBe('note2_1_1')
		expect(note1_1_1!.children[3].id).not.toBe(note2_1.id)
		expect(note1_1_1!.children[3].children[0].id).not.toBe(note2_1.children[0].id)
	})

	test('Alice_MoveNote', async () => {
		expect(note1_1_1!.children.length).toBe(4)
		expect(note2!.children.length).toBe(3)

		await note2_2!.move(note1_1_1, 2)

		expect(note1_1_1!.children.length).toBe(5)
		expect(note2!.children.length).toBe(2)

		await note1_1_1!.children[2].ensureChildren()

		expect(note1_1_1!.children[2].title).toBe('note2_2')
		expect(note1_1_1!.children[2].children[0].title).toBe('note2_2_1')
		expect(note1_1_1!.children[2].id).toBe(note2_2.id)
		expect(note1_1_1!.children[2].children[0].id).toBe(note2_2.children[0].id)
	})

	test('Alice_DeleteNote', async () => {
		expect(note1_1_1!.children.length).toBe(5)
		expect(note1_1_1!.children[4].title).toBe('note2_1')
		expect(note2!.children[0].title).toBe('note2_1')
		expect(note2!.children.length).toBe(2)
		await note1_1_1!.children[4].delete()
		await note2.refresh()
		await note2_1!.refresh()
		expect(note1_1_1!.children.length).toBe(4)
		expect(note2!.children.length).toBe(2)
		expect(note2!.children[0].title).toBe('note2_1')
	})

	test('Bob_CreateAccount', async () => {
		await _managerBob.createAccount('bob', 'secret')
		expect(_managerBob.isLoggedIn).toBeTruthy()
		await _managerBob.root.ensureChildren()
	})

	test('Alice_ShareNote', async () => {
		expect(note3_1).toBeDefined()
		expect(note3_1.isShared).toBeFalsy()
		await note3_1!.shareWith('bob')
		expect(note3_1.isShared).toBeTruthy()
	})

	test('Bob_AcceptShare', async () => {
		expect(_managerBob.root.children.length).toBe(0)
		let offers = await _managerBob.getShareOffers()
		expect(offers.length).toBe(1)
		await _managerBob.acceptShare(offers[0])
		expect(_managerBob.root.children.length).toBe(1)
		bobNode3_1 = _managerBob.root.children[0]
		expect(bobNode3_1.title).toBe('note3_1')
		await bobNode3_1.ensureChildren()
		bobNode3_1_1 = bobNode3_1.children[0]
		expect(bobNode3_1_1.title).toBe('note3_1_1')
		offers = await _managerBob.getShareOffers()
		expect(offers.length).toBe(0)
	})

	test('Bob_WriteToShare', async () => {
		expect(bobNode3_1_1).toBeDefined()
		bobNode3_1_1.text = 'Bobs Secret Information'
		await bobNode3_1_1.save()
	})

	test('Alice_ReadFromShare', async () => {
		expect(note3_1_1).toBeDefined()
		expect(note3_1_1.text).toBe('')
		await note3_1_1.refresh()
		expect(note3_1_1.text).toBe('Bobs Secret Information')
	})

	test('Alice_DereferenceShare', async () => {
		expect(note3).toBeDefined()
		expect(note3_1).toBeDefined()
		expect(note3_1.isShared).toBeTruthy()
		expect(note3.children.length).toBe(3)
		await note3_1.deleteReference()
		expect(note3.children.length).toBe(2)
	})

	test('Bob_ContinueToUseShare', async () => {
		_managerBob.logout()
		_managerBob.setCacheManager(undefined)
		await _managerBob.login({ username: 'bob', password: 'secret' })
		await _managerBob.root.ensureChildren()
		expect(_managerBob.root.children.length).toBe(1)
		expect(_managerBob.root.children[0].title).toBe('note3_1')
		await _managerBob.root.children[0].ensureChildren()
		expect(_managerBob.root.children[0].children[0].title).toBe('note3_1_1')
	})

	test('Alice_DereferenceNonShare', async () => {
		expect(note1_3).toBeDefined()
		try {
			await note1_3.deleteReference()
			expect(false).toBeTruthy()
		} catch (ex) {
			expect(ex.message).toBe(
				'Deleting the reference of this note will leave it without any references, use Delete to delete the note, use force = true to override this check',
			)
		}
		await note1_3.deleteReference(true)
	})

	test('Alice_CopyToSame', async () => {
		expect(note2_3).toBeDefined()
		expect(note2_3.children.length).toBe(3)
		const child = note2_3.children[0]
		await child.copy(note2_3)
		expect(note2_3.children.length).toBe(4)
	})

	test('Alice_MoveToSame', async () => {
		expect(note2_3).toBeDefined()
		expect(note2_3.children.length).toBe(4)
		expect(note2_3.children[0].title).toBe('note2_3_1')
		expect(note2_3.children[1].title).toBe('note2_3_2')
		expect(note2_3.children[2].title).toBe('note2_3_3')
		expect(note2_3.children[3].title).toBe('note2_3_1')
		let child = note2_3.children[3]
		await child.move(note2_3, 1)
		expect(note2_3.children.length).toBe(4)
		expect(note2_3.children[0].title).toBe('note2_3_1')
		expect(note2_3.children[1].title).toBe('note2_3_1')
		expect(note2_3.children[2].title).toBe('note2_3_2')
		expect(note2_3.children[3].title).toBe('note2_3_3')
		child = note2_3.children[0]
		await child.move(note2_3, 4)
		expect(note2_3.children.length).toBe(4)
		expect(note2_3.children[0].title).toBe('note2_3_1')
		expect(note2_3.children[1].title).toBe('note2_3_2')
		expect(note2_3.children[2].title).toBe('note2_3_3')
		expect(note2_3.children[3].title).toBe('note2_3_1')
	})

	test('Alice_ShareAnotherNote', async () => {
		expect(note3_2).toBeDefined()
		expect(note3_2.isShared).toBeFalsy()
		await note3_2!.shareWith('bob')
		expect(note3_2.isShared).toBeTruthy()
	})

	test('Bob_DeleteShareOffer', async () => {
		let offers = await _managerBob.getShareOffers()
		expect(offers.length).toBe(1)
		await _managerBob.deleteShareOffer(offers[0])
		offers = await _managerBob.getShareOffers()
		expect(offers.length).toBe(0)
	})
})
