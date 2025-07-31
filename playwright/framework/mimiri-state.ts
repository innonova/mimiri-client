import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { MailPitClient } from './mailpit-client'
import { OrchestrationClient } from './orchestration-client'
import 'dotenv/config'
import { Guid } from './guid'

const createId = () => {
	const rnd = Math.floor(Math.random() * 10000)
	const str = `${Date.now()}`
	return rnd + str.substring(6, str.length)
}

export class MimiriState {
	private static _defaultBrowser: Browser | undefined
	private _browser: Browser | undefined
	private _context!: BrowserContext
	private _mainPage!: Page
	private _pageStack: Page[] = []
	private _expectedPage: Promise<Page> | undefined
	private _start = 0
	private _config = {
		username: 'auto_test_',
		password: '1234',
		currency: 'CHF',
		currencySymbol: 'Fr.',
		// invoiceNo: 10327,
		testId: '',
		payrexxMode: 'real',
		paymentMethod: 'visa',
		cardNumber: '4242424242424242',
		cardExpiration: '1026',
		cardCvc: '123',
		payUrl: 'https://mock-payrexx.mimiri.io',
		invoiceUrl: 'https://account.mimiri.io/invoice',
	}
	private _customer = {
		givenName: 'Max',
		familyName: 'Mustermann',
		company: '',
		email: '',
		countryCode: 'CH',
		state: '',
		stateCode: '',
		city: 'Dübendorf',
		postalCode: '8600',
		address: 'Kriesbachstrasse 24',
	}
	private _mailClient: MailPitClient
	private _orchestrationClient: OrchestrationClient
	orch: any

	constructor() {
		this._config.testId = createId()
		this._config.username = `auto_test_${this._config.testId}`
		this._customer.email = `max+${this._config.testId}@testmail.mimiri.io`
		this._mailClient = new MailPitClient(this._config.testId)
		this._orchestrationClient = new OrchestrationClient()
	}

	public clone() {
		const newState = new MimiriState()
		newState._config = { ...this._config }
		newState._customer = { ...this._customer }
		newState._mailClient = new MailPitClient(this._config.testId)
		newState._orchestrationClient = new OrchestrationClient()
		return newState
	}

	public async init(index = 0) {
		// console.log('testId', this._config.testId)
		this._start = performance.now()
		if (!this._browser) {
			if (index === 0) {
				if (!MimiriState._defaultBrowser) {
					MimiriState._defaultBrowser = await chromium.launch()
				}
				this._browser = MimiriState._defaultBrowser
			} else {
				this._browser = await chromium.launch({
					args: ['--window-position=1350,10'],
				})
			}
		}
		this._context = await this._browser.newContext()
		this._mainPage = await this._context.newPage()
		// this._mainPage.on('console', msg => console.log(msg.text()));
		this._pageStack.push(this._mainPage)
		await this.useMockPayrexx()
	}

	public async terminate() {
		await this._orchestrationClient.waitForMailQueue(this._config.testId)
		await this._orchestrationClient.cleanUp(this._config.username)
		await new Promise(resolve => setTimeout(resolve, 250))
		await this._mailClient.cleanUp()
		await this._mainPage.close()
		await this._context.close()
	}

	public get page() {
		return this._pageStack[this._pageStack.length - 1]
	}

	public get keyboard() {
		return this.page.keyboard
	}

	public async getClipboardText() {
		return this.page.evaluate(() => (globalThis as any).navigator.clipboard.readText())
	}

	public printElapsed() {
		console.log(`${performance.now() - this._start}`)
	}

	public async pause() {
		return this.page.pause()
	}

	public reload() {
		return this.page.reload()
	}

	public goto(url: string) {
		return this.page.goto(url)
	}

	public home() {
		return this.goto('/')
	}

	public getByTestId(id: string) {
		return this.page.getByTestId(id)
	}

	public locator(id: string) {
		return this.page.locator(id)
	}

	public getByRole(role: Role, options: any) {
		return this.page.getByRole(role, options)
	}

	public waitForTimeout(timeout: number) {
		return this.page.waitForTimeout(timeout)
	}

	public expectTab(href: string) {
		this._expectedPage = this.page.context().waitForEvent('page', p => {
			if (p.url().startsWith(href)) {
				return true
			}
			console.log('unexpected tab', p.url(), href)
			return false
		})
	}

	public async enterTab() {
		if (this._expectedPage) {
			const page = await this._expectedPage
			// page.on('console', msg => console.log(msg.text()));
			this._pageStack.push(page)
			this._expectedPage = undefined
			await this.page.bringToFront()
		}
	}

	public async openTab() {
		const page = await this._context.newPage()
		this._pageStack.push(page)
		await this.page.bringToFront()
	}

	public async leaveTab() {
		if (this._pageStack.length > 0) {
			this._pageStack.pop()
			await this.page.bringToFront()
		}
	}

	public async closeTab() {
		if (this._pageStack.length > 0) {
			const page = this._pageStack.pop()
			await this.page.bringToFront()
			await page?.close()
		}
	}

	public async useRealPayrexx() {
		this._config.payUrl = 'https://mimiri.payrexx.com/'
		await this._orchestrationClient.useRealPayrexx(this._config.username)
		this._config.payrexxMode = 'real'
	}

	public async useMockPayrexx() {
		this._config.payUrl = 'https://mock-payrexx.mimiri.io'
		await this._orchestrationClient.useMockPayrexx(this._config.username)
		this._config.payrexxMode = 'mock'
	}

	public async login(username: string, password: string) {
		return await this._orchestrationClient.login(username, password)
	}

	public async triggerRenewals(now?: Date) {
		await this._orchestrationClient.triggerRenewals(this._config.username, now)
	}

	public async triggerNextRenewalsFor() {
		await this._orchestrationClient.triggerNextRenewalsFor(this._config.username)
	}

	public async triggerDeletions() {
		await this._orchestrationClient.triggerDeletions()
	}

	public async nextRenewalDate() {
		return this._orchestrationClient.nextRenewalDate(this._config.username)
	}

	public async failNextCharge(mode: string) {
		return this._orchestrationClient.failNextCharge(mode, this._config.username)
	}

	public async customerId() {
		return this._orchestrationClient.getCustomerId(this._config.username)
	}

	public async associatedObjects(customerId: Guid) {
		return this._orchestrationClient.associatedObjects(customerId)
	}

	public async setUserTypeCountTest() {
		await this._orchestrationClient.setUserType(this._config.username, 1002)
	}

	public async setUserTypeSizeTest() {
		await this._orchestrationClient.setUserType(this._config.username, 1001)
	}

	public async waitForMailQueue() {
		const result = await this._orchestrationClient.waitForMailQueue(this._config.testId)
		if (result !== 'OK') {
			throw new Error('failed to wait for email queue')
		}
	}
	public async waitForSubjectToInclude(subject: string) {
		await this.waitForMailQueue()
		return this._mailClient.waitForSubjectToInclude(subject)
	}

	public async deleteTagged() {
		await this.waitForMailQueue()
		return this._mailClient.deleteTagged()
	}

	public async list() {
		await this.waitForMailQueue()
		return this._mailClient.list()
	}

	public resetData() {
		this._config.currency = 'CHF'
		this._config.currencySymbol = 'Fr.'
		// this._config.invoiceNo = 10327
		this._config.testId = createId()
		this._customer.email = `max+${this._config.testId}@testmail.mimiri.io`
		this._config.paymentMethod = 'visa'
	}

	public setVisaSuccess() {
		this._config.paymentMethod = 'visa'
		this._config.cardNumber = '4242424242424242'
		this._config.cardExpiration = '1026'
		this._config.cardCvc = '123'
	}

	public setVisaFailure() {
		this._config.paymentMethod = 'visa'
		this._config.cardNumber = '4000000000000002'
		this._config.cardExpiration = '1026'
		this._config.cardCvc = '123'
	}

	public setMasterSuccess() {
		this._config.paymentMethod = 'mastercard'
		this._config.cardNumber = '5555555555554444'
		this._config.cardExpiration = '1026'
		this._config.cardCvc = '123'
	}

	public setTwintSuccess() {
		this._config.paymentMethod = 'twint'
		this._config.cardNumber = ''
		this._config.cardExpiration = ''
		this._config.cardCvc = ''
	}

	public get config() {
		return this._config
	}

	public get username() {
		return this._config.username
	}

	public get password() {
		return this._config.password
	}

	public get customer() {
		return this._customer
	}

	public get orchestrationClient() {
		return this._orchestrationClient
	}
}

// export const mimiriState = new MimiriState()

type Role =
	| 'alert'
	| 'alertdialog'
	| 'application'
	| 'article'
	| 'banner'
	| 'blockquote'
	| 'button'
	| 'caption'
	| 'cell'
	| 'checkbox'
	| 'code'
	| 'columnheader'
	| 'combobox'
	| 'complementary'
	| 'contentinfo'
	| 'definition'
	| 'deletion'
	| 'dialog'
	| 'directory'
	| 'document'
	| 'emphasis'
	| 'feed'
	| 'figure'
	| 'form'
	| 'generic'
	| 'grid'
	| 'gridcell'
	| 'group'
	| 'heading'
	| 'img'
	| 'insertion'
	| 'link'
	| 'list'
	| 'listbox'
	| 'listitem'
	| 'log'
	| 'main'
	| 'marquee'
	| 'math'
	| 'meter'
	| 'menu'
	| 'menubar'
	| 'menuitem'
	| 'menuitemcheckbox'
	| 'menuitemradio'
	| 'navigation'
	| 'none'
	| 'note'
	| 'option'
	| 'paragraph'
	| 'presentation'
	| 'progressbar'
	| 'radio'
	| 'radiogroup'
	| 'region'
	| 'row'
	| 'rowgroup'
	| 'rowheader'
	| 'scrollbar'
	| 'search'
	| 'searchbox'
	| 'separator'
	| 'slider'
	| 'spinbutton'
	| 'status'
	| 'strong'
	| 'subscript'
	| 'superscript'
	| 'switch'
	| 'tab'
	| 'table'
	| 'tablist'
	| 'tabpanel'
	| 'term'
	| 'textbox'
	| 'time'
	| 'timer'
	| 'toolbar'
	| 'tooltip'
	| 'tree'
	| 'treegrid'
	| 'treeitem'
