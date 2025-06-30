import { emptyGuid, type Guid } from '../types/guid'
import type { KeySet } from '../types/key-set'
import { Note } from '../types/note'
import type { NoteShareInfo } from '../types/note-share-info'
import type { ClientConfig, ShareResponse } from '../types/responses'
import type { LoginData, SharedState } from './type'
import { AuthenticationManager } from './authentication-manager'
import { CryptographyManager } from './cryptography-manager'
import { SynchronizationService } from './synchronization-service'
import { NoteService } from './note-service'
import { SharingService } from './sharing-service'
import { MimiriDb } from './mimiri-db'
import { MimiriClient } from './mimiri-client'
import { MultiAction } from './multi-action'
import { blogManager, updateManager } from '../../global'
import { reactive, watch } from 'vue'
import { PaymentClient } from './payment-client'
import type {
	ChargeExistingMethodRequest,
	CreateCustomerRequest,
	CreatePaymentMethodRequest,
	InvoiceToLinkRequest,
	NewSubscriptionRequest,
} from '../types/payment-requests'
import type { Invoice } from '../types/subscription'

export const DEFAULT_ITERATIONS = 1000000
export const DEFAULT_ITERATIONS_LOCAL = 100
export const DEFAULT_SALT_SIZE = 32
export const DEFAULT_PASSWORD_ALGORITHM = 'PBKDF2;SHA512;256'

export class MimiriStore {
	private authManager: AuthenticationManager
	private cryptoManager: CryptographyManager
	private syncService: SynchronizationService
	private noteService: NoteService
	private sharingService: SharingService
	private sharedState: SharedState
	private db: MimiriDb
	private api: MimiriClient
	private paymentClient: PaymentClient

	constructor(
		host: string,
		paymentHost: string,
		serverKeyId: string,
		serverKey: string,
		noteUpdatedCallback: (note: Note) => Promise<void>,
		statusCallback: (status: SharedState) => void,
	) {
		this.sharedState = reactive<SharedState>({
			userId: null,
			isLoggedIn: false,
			isOnline: false,
			isLocal: false,
			workOffline: false,
			clientConfig: { features: [] },
			userStats: {
				size: 0,
				noteCount: 0,
				maxTotalBytes: 0,
				maxNoteBytes: 0,
				maxNoteCount: 0,
			},
		})
		watch(
			this.sharedState,
			newState => {
				if (statusCallback) {
					statusCallback(newState)
				}
			},
			{ deep: true },
		)
		this.db = new MimiriDb()
		this.cryptoManager = new CryptographyManager(this.db, this.sharedState)
		this.api = new MimiriClient(host, serverKeyId, serverKey, this.sharedState, this.cryptoManager, type => {
			switch (type) {
				case 'connected':
					void updateManager.check()
					void blogManager.refreshAll()
					break
				case 'sync':
					this.syncService.queueSync()
					break
				case 'bundle-update':
					void updateManager.check()
					break
				case 'blog-post':
					void blogManager.refreshAll()
					break
				case 'reconnected':
					void updateManager.check()
					void blogManager.refreshAll()
					this.syncService.queueSync()
					break
			}
		})
		this.paymentClient = new PaymentClient(this.api as any, paymentHost)
		this.authManager = new AuthenticationManager(this.db, this.api, this.cryptoManager, this.sharedState)
		this.syncService = new SynchronizationService(
			this.db,
			this.api,
			this.cryptoManager,
			this.sharedState,
			async (noteId: Guid) => {
				const note = await this.noteService.readNote(noteId)
				await noteUpdatedCallback(note)
			},
		)
		this.noteService = new NoteService(this.db, this.cryptoManager, this.sharedState, async (noteId: Guid) => {
			const note = await this.noteService.readNote(noteId)
			await noteUpdatedCallback(note)
		})
		this.sharingService = new SharingService(this.api)
	}

	public queueSync(): void {
		this.syncService.queueSync()
	}

	public async waitForSync(timeoutMs?: number): Promise<boolean> {
		return this.syncService.waitForSync(timeoutMs)
	}

	public async checkUsername(username: string, pow: string) {
		return this.authManager.checkUsername(username, pow)
	}

	public async setLoginData(data: string) {
		return this.authManager.setLoginData(data)
	}

	public async getLoginData() {
		return this.authManager.getLoginData()
	}

	public async restoreLogin() {
		if (await this.authManager.restoreLogin()) {
			await this.cryptoManager.ensureLocalCrypt()
			if (this.sharedState.isOnline) {
				await this.syncService.initialSync()
				await this.cryptoManager.loadAllKeys()
				await this.syncService.sync()
			} else {
				await this.cryptoManager.loadAllKeys()
			}
			return true
		}
		return false
	}

	public async createUser(username: string, password: string, userData: any, pow: string, iterations: number) {
		await this.authManager.createUser(username, password, userData, pow, iterations)
		await this.cryptoManager.ensureLocalCrypt()
		await this.cryptoManager.loadAllKeys()
	}

	public async login(data: LoginData): Promise<boolean> {
		if (await this.authManager.login(data)) {
			await this.cryptoManager.ensureLocalCrypt()
			await this.syncService.initialSync()
			await this.cryptoManager.loadAllKeys()
			await this.syncService.sync()
			return true
		}
		return false
	}

	public async goOnline(password?: string): Promise<boolean> {
		return this.authManager.goOnline()
	}

	public async openLocal() {
		await this.authManager.openLocal()
		await this.cryptoManager.ensureLocalCrypt()
		await this.cryptoManager.loadAllKeys()
	}

	public async changeUserNameAndPassword(
		username: string,
		oldPassword: string,
		newPassword?: string,
		iterations?: number,
	) {
		return this.authManager.changeUserNameAndPassword(username, oldPassword, newPassword, iterations)
	}

	public async deleteAccount(password: string, deleteLocal: boolean) {
		return this.authManager.deleteAccount(password, deleteLocal)
	}

	public async verifyPassword(password: string) {
		return this.authManager.verifyPassword(password)
	}

	public async createKey(id: Guid, metadata: any): Promise<void> {
		await this.cryptoManager.createKey(id, metadata)
		this.syncService.queueSync()
	}

	public getKeyByName(name: Guid): KeySet {
		return this.cryptoManager.getKeyByName(name)
	}

	public getKeyById(id: Guid): KeySet {
		return this.cryptoManager.getKeyById(id)
	}

	public async createNote(note: Note): Promise<void> {
		await this.noteService.createNote(note)
		this.syncService.queueSync()
	}

	public async writeNote(note: Note): Promise<void> {
		await this.noteService.writeNote(note)
		this.syncService.queueSync()
	}

	public async readNote(id: Guid, base?: Note): Promise<Note> {
		return this.noteService.readNote(id, base)
	}

	public beginMultiAction(): MultiAction {
		return new MultiAction(this.noteService, this.syncService, this.api)
	}

	public async createNotificationUrl(): Promise<{ url: string; token: string }> {
		return this.api.createNotificationUrl()
	}

	public async createKeyFromNoteShare(id: Guid, share: NoteShareInfo, metadata: any): Promise<void> {
		return this.cryptoManager.createKeyFromNoteShare(id, share, metadata)
	}

	public async getPublicKey(keyOwnerName: string, pow: string) {
		return this.sharingService.getPublicKey(keyOwnerName, pow)
	}

	public async shareNote(
		recipient: string,
		keyName: Guid,
		noteId: Guid,
		name: string,
		pow: string,
	): Promise<ShareResponse> {
		return this.sharingService.shareNote(recipient, keyName, noteId, name, pow)
	}

	public async getShareOffer(code: string): Promise<NoteShareInfo> {
		return this.sharingService.getShareOffer(code)
	}

	public async getShareParticipants(id: Guid): Promise<{ username: string; since: string }[]> {
		return this.sharingService.getShareParticipants(id)
	}

	public async deleteShareOffer(id: Guid): Promise<void> {
		return this.sharingService.deleteShareOffer(id)
	}

	public async updateUserData(): Promise<void> {
		return this.authManager.updateUserData()
	}

	public async addComment(postId: Guid, displayName: string, comment: string) {
		return this.api.addComment(postId, displayName, comment)
	}

	public async logout(): Promise<void> {
		await this.authManager.logout()
		this.api.logout()
		this.cryptoManager.clearKeys()
		this.sharedState.clientConfig = { features: [] }
		this.sharedState.userStats = {
			size: 0,
			noteCount: 0,
			maxTotalBytes: 0,
			maxNoteBytes: 0,
			maxNoteCount: 0,
		}
	}

	public getIconPath(icon: string): string {
		return this.paymentClient.getIconPath(icon)
	}

	public async createPaymentLink(request: InvoiceToLinkRequest): Promise<any> {
		return this.paymentClient.createPaymentLink(request)
	}

	public async chargeExistingMethod(request: ChargeExistingMethodRequest): Promise<any> {
		return this.paymentClient.chargeExistingMethod(request)
	}

	public async createAuthQuery(request: any): Promise<string> {
		return this.paymentClient.createAuthQuery(request)
	}

	public async getPdfUrl(invoice: Invoice): Promise<string> {
		return this.paymentClient.getPdfUrl(invoice)
	}

	public async getCustomerData() {
		return this.paymentClient.getCustomerData()
	}

	public async saveCustomerData(data: CreateCustomerRequest) {
		return this.paymentClient.saveCustomerData(data)
	}

	public async verifyEmail() {
		return this.paymentClient.verifyEmail()
	}

	public async getCountries() {
		return this.paymentClient.getCountries()
	}

	public async getInvoices() {
		return this.paymentClient.getInvoices()
	}

	public async getOpenInvoices() {
		return this.paymentClient.getOpenInvoices()
	}

	public async getCurrentSubscriptionProduct() {
		return this.paymentClient.getCurrentSubscriptionProduct()
	}

	public async getCurrentSubscription() {
		return this.paymentClient.getCurrentSubscription()
	}

	public async cancelSubscription() {
		return this.paymentClient.cancelSubscription()
	}

	public async resumeSubscription() {
		return this.paymentClient.resumeSubscription()
	}

	public async getSubscriptionProducts() {
		return this.paymentClient.getSubscriptionProducts()
	}

	public async newSubscription(request: NewSubscriptionRequest) {
		return this.paymentClient.newSubscription(request)
	}

	public async getPaymentMethods() {
		return this.paymentClient.getPaymentMethods()
	}

	public async getInvoice(invoiceId: Guid, auth?: string) {
		return this.paymentClient.getInvoice(invoiceId, auth)
	}

	public async getInvoicePaymentStatus(invoiceId: Guid) {
		return this.paymentClient.getInvoicePaymentStatus(invoiceId)
	}

	public async createNewPaymentMethod(request: CreatePaymentMethodRequest) {
		return this.paymentClient.createNewPaymentMethod(request)
	}

	public async makePaymentMethodDefault(methodId: Guid) {
		return this.paymentClient.makePaymentMethodDefault(methodId)
	}

	public async deletePaymentMethodDefault(methodId: Guid) {
		return this.paymentClient.deletePaymentMethodDefault(methodId)
	}

	public get userData(): any {
		return this.authManager.userData
	}

	public get isOnline(): boolean {
		return this.sharedState.isOnline
	}

	public get isLoggedIn(): boolean {
		return this.sharedState.isLoggedIn
	}

	public get userId(): Guid {
		return this.sharedState.userId ?? emptyGuid()
	}

	public get username(): string {
		return this.authManager.username
	}

	public get usedBytes() {
		return this.sharedState.userStats.size
	}

	public get maxBytes() {
		return this.sharedState.userStats.maxTotalBytes
	}

	public get noteCount() {
		return this.sharedState.userStats.noteCount
	}

	public get maxNoteCount() {
		return this.sharedState.userStats.maxNoteCount
	}

	public get maxNoteSize() {
		return this.sharedState.userStats.maxNoteBytes
	}

	public get clientConfig(): ClientConfig {
		return this.sharedState.clientConfig
	}

	get workOffline(): boolean {
		return this.api.workOffline
	}
	set workOffline(value: boolean) {
		this.api.workOffline = value
	}
}
