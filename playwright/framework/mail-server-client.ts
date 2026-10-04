import { decode } from 'html-entities'

/**
 * Reads the mail the dev payments service sends, from the estate's mail-server
 * (https://docs.int.innonova.ch/mail-server/api.md). In dev the service holds a
 * sandbox key: mail is captured, never sent, and readable with its bodies
 * through /v1/sandbox/messages by a key of the same application. The test
 * environment needs such a key (MAIL_SERVER_API_KEY) and, outside the estate,
 * the estate's CA for Node (NODE_EXTRA_CA_CERTS; see .env.example).
 *
 * Each MimiriState has its own recipient address (max+<testId>@…), which is
 * what scopes everything here: list, wait and delete are per address.
 */

export interface MailAddress {
	Name: string
	Address: string
}

export interface Link {
	text: string
	url: string
}

export interface MailListItem {
	ID: string
	From: MailAddress
	To: MailAddress[]
	Subject: string
	Created: string
	Status: string
}

export interface MailAttachment {
	filename: string
	contentType: string
	size: number
}

export interface MailSummary extends MailListItem {
	Text: string
	HTML: string
	Links: Link[]
	/** names, types and sizes only; the sandbox never returns attachment content */
	Attachments: MailAttachment[]
}

interface SandboxMessage {
	id: string
	status: string
	to: { email: string; name?: string }
	from: { email: string; name?: string }
	subject: string
	text?: string
	html?: string
	attachments?: MailAttachment[]
	createdAt: string
}

const linkRegex = /<a href=(?:'|")([^'"]+)(?:'|")[^>]*>((?:.(?!<\/a>))+.)<\/a>/gs

const parseLinks = (html: string): Link[] => {
	const links: Link[] = []
	for (const link of html.matchAll(linkRegex)) {
		links.push({
			text: link[2].trim(),
			url: decode(link[1].trim()),
		})
	}
	return links
}

const toAddress = (a: { email: string; name?: string }): MailAddress => ({ Name: a.name ?? '', Address: a.email })

const toListItem = (m: SandboxMessage): MailListItem => ({
	ID: m.id,
	From: toAddress(m.from),
	To: [toAddress(m.to)],
	Subject: m.subject,
	Created: m.createdAt,
	Status: m.status,
})

const toSummary = (m: SandboxMessage): MailSummary => ({
	...toListItem(m),
	Text: m.text ?? '',
	HTML: m.html ?? '',
	Links: parseLinks(m.html ?? ''),
	Attachments: m.attachments ?? [],
})

export class MailServerClient {
	private _host = (process.env.MAIL_SERVER_URL || 'https://mail.int.innonova.ch').replace(/\/$/, '')
	private _key = process.env.MAIL_SERVER_API_KEY ?? ''

	constructor(private recipient: string) {}

	private async request<T>(method: string, path: string): Promise<T> {
		if (!this._key) {
			throw new Error('MAIL_SERVER_API_KEY is not set (a sandbox key of the application the dev payments service uses)')
		}
		const response = await fetch(`${this._host}${path}`, { method, headers: { authorization: `Bearer ${this._key}` } })
		if (!response.ok) {
			throw new Error(`mail-server ${method} ${path} failed: ${response.status} ${await response.text()}`)
		}
		return (await response.json()) as T
	}

	private async delay(ms: number) {
		await new Promise(resolve => setTimeout(resolve, ms))
	}

	public async cleanUp() {
		await this.deleteTagged()
	}

	/** Deletes every captured message to this state's address (and its simulated suppressions). */
	public async deleteTagged() {
		await this.request('DELETE', `/v1/sandbox/messages?to=${encodeURIComponent(this.recipient)}`)
		return true
	}

	public async waitForSubjectToInclude(subject: string) {
		for (let i = 0; i < 20; i++) {
			const messages = await this.list()
			const message = messages.find(m => m.Subject.includes(subject))
			if (message) {
				return this.message(message.ID)
			}
			await this.delay(250)
		}
		throw new Error(`No email with subject including ${subject} found`)
	}

	/** Newest first, as the sandbox lists them; the payments queue is already drained by the caller. */
	public async list(): Promise<MailListItem[]> {
		const json = await this.request<{ messages: SandboxMessage[] }>(
			'GET',
			`/v1/sandbox/messages?to=${encodeURIComponent(this.recipient)}&limit=50`,
		)
		return json.messages.map(toListItem)
	}

	public async message(id: string): Promise<MailSummary> {
		const json = await this.request<{ message: SandboxMessage }>(
			'GET',
			`/v1/sandbox/messages/${encodeURIComponent(id)}`,
		)
		return toSummary(json.message)
	}
}
