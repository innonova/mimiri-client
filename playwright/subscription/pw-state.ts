import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

export class PwState {
	private _browser: Browser
	private _context: BrowserContext
	private _mainPage: Page
	private _pageStack: Page[] = []
	private _expectedPage: Promise<Page> | undefined

	public async init() {
		this._browser = await chromium.launch()
		this._context = await this._browser.newContext()
		this._mainPage = await this._context.newPage()
		this._pageStack.push(this._mainPage)
	}

	public get page() {
		return this._pageStack[this._pageStack.length - 1]
	}

	public reload() {
		return this.page.reload()
	}

	public goto(url: string) {
		return this.page.goto(url)
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
		this._expectedPage = this.page.context().waitForEvent('page', p => p.url().startsWith(href))
	}

	public async enterTab() {
		if (this._expectedPage) {
			const page = await this._expectedPage
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
}

export const pwState = new PwState()

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
