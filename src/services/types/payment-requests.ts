import type { Guid } from './guid'
import type { Currency, RenewalType } from './subscription'

export interface SignedRequest {
	username?: string
	signatures?: { name: string; signature: string }[]
}

export interface CreateCustomerRequest extends SignedRequest {
	givenName: string
	familyName: string
	company: string
	email: string
	countryCode: string
	country: string
	stateCode?: string
	state?: string
	city: string
	postalCode: string
	address: string
	termsAccepted?: boolean
	privacyPolicyAccepted?: boolean
}

export interface NewSubscriptionRequest extends SignedRequest {
	productId: Guid
	renewalType: RenewalType
	currency: Currency
}

export interface InvoiceToLinkRequest extends SignedRequest {
	invoiceId: Guid
	save: boolean
	clientRef: string
}

export interface ChargeExistingMethodRequest extends SignedRequest {
	invoiceId: Guid
	methodId: Guid
	purpose: string
}

export interface EditPaymentMethodRequest extends SignedRequest {
	methodId: Guid
}

export interface CreatePaymentMethodRequest extends SignedRequest {
	clientReference: string
}
