export const username = 'pgtest'
export const password = '1234'

const createId = () => {
	const str = `${Date.now()}`
	return str.substring(6, str.length)
}

export const config = {
	currency: 'CHF',
	currencySymbol: 'Fr.',
	invoiceNo: 10327,
	testId: createId(),
	payrexxMode: 'real',
	paymentMethod: 'visa',
	cardNumber: '4242424242424242',
	cardExpiration: '1026',
	cardCvc: '123',
	payUrl: 'http://localhost:3001/',
	invoiceUrl: 'http://localhost:5174/invoice/',
}

export const customer = {
	givenName: 'Max',
	familyName: 'Mustermann',
	company: '',
	email: `max+${config.testId}@testmail.mimiri.io`,
	countryCode: 'CH',
	state: '',
	stateCode: '',
	city: 'Dübendorf',
	postalCode: '8600',
	address: 'Kriesbachstrasse 24',
}

export const resetData = () => {
	config.currency = 'CHF'
	config.currencySymbol = 'Fr.'
	config.invoiceNo = 10327
	config.testId = createId()
	customer.email = `max+${config.testId}@testmail.mimiri.io`
	config.paymentMethod = 'visa'
}

export const setVisaSuccess = () => {
	config.paymentMethod = 'visa'
	config.cardNumber = '4242424242424242'
	config.cardExpiration = '1026'
	config.cardCvc = '123'
}

export const setVisaFailure = () => {
	config.paymentMethod = 'visa'
	config.cardNumber = '4000000000000002'
	config.cardExpiration = '1026'
	config.cardCvc = '123'
}

export const setMasterSuccess = () => {
	config.paymentMethod = 'mastercard'
	config.cardNumber = '5555555555554444'
	config.cardExpiration = '1026'
	config.cardCvc = '123'
}

export const setTwintSuccess = () => {
	config.paymentMethod = 'twint'
	config.cardNumber = ''
	config.cardExpiration = ''
	config.cardCvc = ''
}
