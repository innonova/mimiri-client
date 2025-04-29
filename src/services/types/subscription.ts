import type { Guid } from './guid'

export enum RenewalType {
	None = 'none',
	Automatic = 'automatic',
	Manual = 'manual',
}

export enum Currency {
	USD = 'USD',
	EUR = 'EUR',
	CHF = 'CHF',
}

export enum ProductType {
	Subscription = 'subscription',
}

export enum Period {
	Year = 'year',
	Month = 'month',
}

export enum UserType {
	Free = 1,
	Unlimited = 2,
	Test = 3,
	Tier1 = 4,
	Tier2 = 5,
	Tier3 = 6,
}

export enum InvoiceStatus {
	Prospective = 'prospective',
	Issued = 'issued',
	Paid = 'paid',
	Credited = 'credited',
	CreditNote = 'credit-note',
}

export interface Country {
	code: string
	name: string
	states?: State[]
}

export interface State {
	code: string
	name: string
}

export interface Customer {
	id: Guid
	userId: Guid
	givenName: string
	familyName: string
	company: string
	email: string
	emailVerified: boolean
	countryCode: string
	country: string
	stateCode?: string
	state?: string
	city: string
	postalCode: string
	address: string
	termsAccepted?: Date
	privacyPolicyAccepted?: Date
	created: Date
	modified: Date
}

export interface ProductFeature {
	description: string
}

export interface ProductData {
	description: string
	features: ProductFeature[]
}

export interface SubscriptionData extends ProductData {
	period: Period
	userType: UserType
}

export interface Product {
	id?: Guid
	sku: string
	name: string
	type: ProductType
	data: ProductData
	price: number
	created?: Date
	modified?: Date
}

export interface SubscriptionProduct extends Omit<Product, 'data'> {
	data: SubscriptionData
}

export interface PaymentMethod {
	id: Guid
	customerId: Guid
	brand: string
	expiry: string
	name: string
	priority: number
	transactionId: string
	created: Date
	modified: Date
}

export interface InvoiceIssuer {
	name: string
	address: string
	postalCode: string
	city: string
	state?: string
	stateCode?: string
	country: string
	countryCode: string
}

export interface InvoiceRecipient {
	givenName: string
	familyName: string
	company: string
	address: string
	postalCode: string
	city: string
	state?: string
	stateCode?: string
	country: string
	countryCode: string
}

export interface SummaryItem {
	sku: string
	text: string
	quantity: number
	price: number
}

export interface InvoiceItem extends SummaryItem {
	sku: string
	text: string
	renewalType: RenewalType
	quantity: number
	price: number
	total: number
	vat: number
}

export interface InvoiceData {
	issuer: InvoiceIssuer
	recipient: InvoiceRecipient
	items: InvoiceItem[]
	total: number
	vat: number
}

export interface Invoice {
	id: Guid
	customerId: Guid
	no?: number
	subscriptionId?: Guid
	status: InvoiceStatus
	data: InvoiceData
	currency: Currency
	issued?: Date
	due?: Date
	closed?: Date
	created: Date
	modified: Date
}

export interface Subscription {
	id: Guid
	customerId: Guid
	userId: Guid
	productId: Guid
	period: Period
	paidUntil: Date
	renewalType: RenewalType
	renewalPrice: number
	renewalCurrency: Currency
	created: Date
	modified: Date
}

export interface EmailTemplate {
	id: Guid
	name: string
	subject: string
	body: string
	created: Date
	modified: Date
}
