import type { Guid } from './guid'
import type { AllKeysResponse, KeyResponse, LoginResponse, PreLoginResponse, ReadNoteResponse } from './responses'

export interface ICacheManager {
	setTestId(testId: string): Promise<boolean>
	tearDown(keepLogs: boolean): Promise<boolean>
	getPreLogin(username: string): Promise<PreLoginResponse>
	getUser(username: string): Promise<LoginResponse>
	setUser(username: string, data: LoginResponse, preLogin: PreLoginResponse): Promise<void>
	deleteUser(username: string): Promise<void>
	setUserData(username: string, data: string): Promise<void>
	getKey(userId: Guid, id: Guid): Promise<KeyResponse>
	getAllKeys(userId: Guid): Promise<AllKeysResponse>
	setKey(userId: Guid, id: Guid, data: KeyResponse): Promise<void>
	deleteKey(id: Guid): Promise<void>
	getNote(id: Guid): Promise<ReadNoteResponse>
	setNote(id: Guid, data: ReadNoteResponse): Promise<any>
	deleteNote(id: Guid): Promise<void>
}
