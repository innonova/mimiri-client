import { afterAll, beforeAll, describe, expect, test } from '@jest/globals'
import { MimerClient } from './mimer-client'
import { newGuid } from './types/guid'
import { Note } from './types/note'

describe('MimerClient', () => {
	let _clientAlice: MimerClient
	let _clientBob: MimerClient

	beforeAll(async () => {
		MimerClient.DEFAULT_ITERATIONS = 10
		_clientAlice = new MimerClient('http://localhost:5292/api')
		await _clientAlice.beginTest('mimerClientTs')
		_clientBob = _clientAlice.cloneTest()
	})

	afterAll(async () => {
		await _clientAlice.endTest(false)
	})

	test('Alice Create User ', async () => {
		await _clientAlice.createUser('alice', 'secret', { rootNote: newGuid(), rootKey: newGuid() })

		await _clientAlice.createKey(_clientAlice.userData.rootKey, { shared: false, root: true })
		const rootNote = new Note()
		rootNote.changeItem('metadata').notes = []
		rootNote.id = _clientAlice.userData.rootNote
		rootNote.keyName = _clientAlice.getKeyById(_clientAlice.userData.rootKey).name
		await _clientAlice.createNote(rootNote)
	})

	test('Alice Login', async () => {
		_clientAlice.logout()
		const didLogin = await _clientAlice.login({ username: 'alice', password: 'secret' })
		expect(didLogin).toBeTruthy()
		expect(_clientAlice.userData).toBeDefined()
	})

	test('Alice CreateNote', async () => {
		const testString = 'Test Data String'
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		expect(rootNote).toBeDefined()

		const newNote = new Note()
		rootNote.changeItem('metadata').notes = []
		newNote.changeItem('data').text = testString
		newNote.keyName = _clientAlice.getKeyById(_clientAlice.userData.rootKey).name

		await _clientAlice.createNote(newNote)
		rootNote.changeItem('metadata').notes.push(newNote.id)

		await _clientAlice.updateNote(rootNote)
		const reloadedNode = await _clientAlice.readNote(newNote.id)

		expect(reloadedNode.getItem('data').text).toBe(testString)
	})

	test('Alice DeleteNote', async () => {
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		expect(rootNote).toBeDefined()
		const noteId = rootNote.getItem('metadata').notes[0]
		const note = await _clientAlice.readNote(noteId)
		expect(note).toBeDefined()
		await _clientAlice.deleteNote(note)
		_clientAlice.suppressErrorLog = true
		const noteAgain = await _clientAlice.readNote(noteId)
		_clientAlice.suppressErrorLog = false
		expect(noteAgain).toBeUndefined()
		const index = rootNote.getItem('metadata').notes.indexOf(noteId)
		rootNote.changeItem('metadata').notes.splice(index, 1)
		await _clientAlice.updateNote(rootNote)
	})

	test('Bob CreateUser', async () => {
		await _clientBob.createUser('bob', 'secret', { rootNote: newGuid(), rootKey: newGuid() })

		await _clientBob.createKey(_clientBob.userData.rootKey, { shared: false, root: true })
		const rootNote = new Note()
		rootNote.changeItem('metadata').notes = []
		rootNote.id = _clientBob.userData.rootNote
		rootNote.keyName = _clientBob.getKeyById(_clientBob.userData.rootKey).name
		await _clientBob.createNote(rootNote)
	})

	test('Alice ShareNode', async () => {
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		expect(rootNote).toBeDefined()
		const testString = 'Top Secret Information To be Shared with only Bob'
		const keyId = newGuid()
		await _clientAlice.createKey(keyId, { shared: true })
		const sharedKeyName = _clientAlice.getKeyById(keyId).name
		const newNote = new Note()
		newNote.keyName = sharedKeyName
		newNote.getItem('data').text = testString
		await _clientAlice.createNote(newNote)
		rootNote.changeItem('metadata').notes.push(newNote.id)
		await _clientAlice.updateNote(rootNote)
		await _clientAlice.shareNote('bob', sharedKeyName, newNote.id, 'test')
	})

	test('Bob RetrieveShare', async () => {
		const testString = 'Top Secret Information To be Shared with only Bob'
		const offers = await _clientBob.getShareOffers()
		for (const offer of offers) {
			await _clientBob.createKeyFromNoteShare(newGuid(), offer, { shared: true })
			const root = await _clientBob.readNote(_clientBob.userData.rootNote)
			root.changeItem('metadata').notes.push(offer.noteId)
			await _clientBob.updateNote(root)
		}
		const rootNote = await _clientBob.readNote(_clientBob.userData.rootNote)
		let found = false
		for (const childId of rootNote.getItem('metadata').notes) {
			const note = await _clientBob.readNote(childId)
			expect(note).toBeDefined()
			if (note.getItem('data').text === testString) {
				found = true
				break
			}
		}
		expect(found).toBeTruthy()
	})

	test('Bob ModifySharedNote', async () => {
		const testString = 'Top Secret Information To be Shared with only Bob'
		const rootNote = await _clientBob.readNote(_clientBob.userData.rootNote)
		for (const childId of rootNote.getItem('metadata').notes) {
			const note = await _clientBob.readNote(childId)
			expect(note).toBeDefined()
			if (note.getItem('data').text === testString) {
				note.changeItem('data').text += ' Added By Bob'
				await _clientBob.updateNote(note)
				break
			}
		}
	})

	test('Alice ReadModification', async () => {
		const testString = 'Top Secret Information To be Shared with only Bob Added By Bob'
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		let found = false
		for (const childId of rootNote.getItem('metadata').notes) {
			const note = await _clientAlice.readNote(childId)
			expect(note).toBeDefined()
			if (note.getItem('data').text === testString) {
				found = true
				break
			}
		}
		expect(found).toBeTruthy()
	})

	test('Alice ChangePassword', async () => {
		await _clientAlice.updateUser(_clientAlice.username, 'new-secret', _clientAlice.userData)
		_clientAlice.logout()
		_clientAlice.suppressErrorLog = true
		const loginSuccess = await _clientAlice.login({ username: 'alice', password: 'secret' })
		_clientAlice.suppressErrorLog = false
		expect(loginSuccess).toBeFalsy()
		await _clientAlice.login({ username: 'alice', password: 'new-secret' })
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		expect(rootNote).toBeDefined()
	}, 15000)

	test('Alice ChangeNodeKey', async () => {
		const testString = 'Test Data String'
		const rootNote = await _clientAlice.readNote(_clientAlice.userData.rootNote)
		expect(rootNote).toBeDefined()

		// Create note
		const newNote = new Note()
		newNote.keyName = rootNote.keyName
		newNote.changeItem('data').text = testString
		await _clientAlice.createNote(newNote)
		rootNote.changeItem('metadata').notes.push(newNote.id)
		await _clientAlice.updateNote(rootNote)

		const newKeyId = newGuid()
		await _clientAlice.createKey(newKeyId, { shared: false })
		const newKey = _clientAlice.getKeyById(newKeyId)
		expect(newKey).toBeDefined()

		await _clientAlice.readNote(newNote.id)
		await _clientAlice.changeKeyForNote(newNote.id, newKey.name)
		const rereadNote = await _clientAlice.readNote(newNote.id)
		expect(rereadNote).toBeDefined()
		expect(rereadNote.getItem('data').text).toBe(testString)
		expect(rereadNote.keyName).toBe(newKey.name)
	})

	test('Alice DeleteKey', async () => {
		const keyId = newGuid()
		await _clientAlice.createKey(keyId, { shared: false })
		const key = _clientAlice.getKeyById(keyId)
		expect(key).toBeDefined()
		await _clientAlice.loadKey(keyId)
		await _clientAlice.deleteKey(key.name)
		expect(_clientAlice.keyWithIdExists(keyId)).toBeFalsy()
		try {
			await _clientAlice.loadKey(keyId)
			expect(true).toBeFalsy()
		} catch (ex) {
			expect(ex.statusCode).toBe(404)
		}
	})
})
