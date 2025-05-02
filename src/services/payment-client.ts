import { HttpRequestError, type MimerClient } from './mimer-client'
import type {
	ChargeExistingMethodRequest,
	CreateCustomerRequest,
	CreatePaymentMethodRequest,
	InvoiceToLinkRequest,
	NewSubscriptionRequest,
} from './types/payment-requests'
import type { Country, Invoice, PaymentMethod, Subscription, SubscriptionProduct } from './types/subscription'
import type { Guid } from './types/guid'
import { add } from 'date-fns'

export class PaymentClient {
	private _countries: Country[] | undefined
	private _subscriptionProduct: SubscriptionProduct[] | undefined

	constructor(
		private mimerClient: MimerClient,
		private host: string,
	) {}

	private async get<T>(path: string): Promise<T> {
		// console.log('GET', `${this.host}${path}`, window.location.origin)
		const response = await fetch(`${this.host}${path}`, {
			method: 'GET',
		})
		if (response.status !== 200) {
			throw new HttpRequestError(`Get of ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	private async post<T>(path: string, data: any): Promise<T> {
		const body = data
		// console.log('POST', `${this.host}${path}`, data)
		const response = await fetch(`${this.host}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(body),
		})
		if (response.status < 200 || response.status > 299) {
			throw new HttpRequestError(`Post to ${path} failed with status code ${response.status}`, response.status)
		}
		return response.json()
	}

	private async sign(request: any) {
		request.username = this.mimerClient.username
		request.timestamp = new Date()
		await this.mimerClient.signRequest(request)
		return request
	}

	public async createAuthQuery(request: any) {
		request.username = this.mimerClient.username
		await this.mimerClient.signRequest(request)
		return btoa(JSON.stringify(request))
	}

	public async getPdfUrl(invoice: Invoice) {
		const auth = await this.createAuthQuery({
			request: 'invoice',
			timestamp: new Date(),
			validUntil: add(new Date(), { hours: 12 }),
		})
		return `${this.host}/invoice/${invoice.id}/pdf/mimiri_${invoice.no}.pdf?auth=${auth}`
	}

	public async getCountries() {
		if (!this._countries) {
			this._countries = await this.get<Country[]>(`/customer/countries`)
		}
		return this._countries
	}

	public async getSubscriptionProducts() {
		if (!this._subscriptionProduct) {
			this._subscriptionProduct = await this.get<SubscriptionProduct[]>(`/product/subscription`)
		}
		return this._subscriptionProduct
	}

	public async getPaymentMethods() {
		return this.post<PaymentMethod[]>(`/payment/list-methods`, await this.sign({}))
	}

	public async getCurrentSubscriptionProduct() {
		return await this.post<SubscriptionProduct>(`/subscription/current-product`, await this.sign({}))
	}

	public async getCurrentSubscription() {
		try {
			return await this.post<Subscription>(`/subscription/current`, await this.sign({}))
		} catch {
			return undefined
		}
	}

	public async getInvoices() {
		return this.post<Invoice[]>(`/invoice/list`, await this.sign({}))
	}

	public async getOpenInvoices() {
		return this.post<Invoice[]>(`/invoice/list/open`, await this.sign({}))
	}

	public async getInvoice(invoiceId: Guid, auth?: string) {
		if (auth) {
			return this.get<Invoice>(`/invoice/${invoiceId}?auth=${auth}`)
		} else {
			return this.post<Invoice>(`/invoice/${invoiceId}`, await this.sign({}))
		}
	}

	public async createNewPaymentMethod(request: CreatePaymentMethodRequest) {
		return await this.post<any>(`/payment/create-method`, await this.sign(request))
	}

	public async makePaymentMethodDefault(methodId: Guid) {
		return await this.post<any>(`/payment/make-default`, await this.sign({ methodId }))
	}

	public async deletePaymentMethodDefault(methodId: Guid) {
		return await this.post<any>(`/payment/delete-method`, await this.sign({ methodId }))
	}

	public async cancelSubscription() {
		return await this.post<any>(`/subscription/cancel`, await this.sign({}))
	}

	public async resumeSubscription() {
		return await this.post<any>(`/subscription/resume`, await this.sign({}))
	}

	public getIconPath(brand: string) {
		return `${this.host}/payment/icon/${brand}.svg`
	}

	public async saveCustomerData(request: CreateCustomerRequest) {
		return await this.post<any>(`/customer/set`, await this.sign(request))
	}

	public async newSubscription(request: NewSubscriptionRequest) {
		return await this.post<any>(`/subscription/new`, await this.sign(request))
	}

	public async createPaymentLink(request: InvoiceToLinkRequest) {
		return await this.post<any>(`/payment/create-link`, await this.sign(request))
	}

	public async chargeExistingMethod(request: ChargeExistingMethodRequest) {
		return await this.post<any>(`/payment/pay`, await this.sign(request))
	}

	public async getCustomerData() {
		return await this.post<any>(`/customer/get`, await this.sign({}))
	}

	public async verifyEmail() {
		return await this.post<any>(`/email/verify`, await this.sign({}))
	}

	public async verifyEmailResponse(token: string) {
		return await this.get<any>(`/email/verify-response?token=${encodeURIComponent(token)}`)
	}
}
