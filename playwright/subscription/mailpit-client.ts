import { decode } from 'html-entities'

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
  MessageID: string
  Read: boolean
  From: MailAddress
  To: MailAddress[]
  Cc: MailAddress[]
  Bcc: MailAddress[]
  ReplyTo: MailAddress[]
  Subject: string
  Created: string
  Tags: string[]
  Size: number
  Attachments: number
  Snippet: string
}

export interface MailSummary {
  ID: string
  MessageID: string
  From: MailAddress
  To: MailAddress[]
  Bcc: MailAddress[]
  ReplyTo: MailAddress[]
  ReturnPath: string
  Subject: string
  ListUnsubscribe: {
    Header: string
    Links: string[]
    Errors: string
    HeaderPost: string
  }
  Date: string
  Tags: string[]
  Text: string
  HTML: string
  Size: number
  Inline: any[]
  Attachments: any[]
  Links: Link[]
}

const linkRegex = /<a href=(?:'|")([^'"]+)(?:'|")[^>]*>((?:.(?!<\/a>))+.)<\/a>/gs

const parseLinks = (mail: MailSummary) => {
  mail.Links = []
  for (const link of mail.HTML.matchAll(linkRegex)) {
    mail.Links.push({
      text: link[2].trim(),
      url: decode(link[1].trim()),
    })
  }
  return mail
}

export class MailPitClient {
  private _host = 'http://testmail.mimiri.io:8025/api/v1'
  private _user = 'inno'
  private _password = 'jfeH23wsK'
  private _auth: string
  private _hidden: { [id: string]: boolean } = {}

  constructor() {
    this._auth = 'Basic ' + btoa(this._user + ':' + this._password)

    // headers.set('Authorization', 'Basic ' + );
  }

  public async info() {
    const json = await fetch(`${this._host}/info`, { headers: { authorization: this._auth } }).then(
      (res) => res.json(),
    )
    return json
  }

  public async deleteTagged(tag: string) {
    const text = await fetch(`${this._host}/search?query=tag:${tag}`, {
      method: 'DELETE',
      headers: { authorization: this._auth },
    }).then((res) => res.text())
    return text === 'OK'
  }

  public async hideTagged(tag: string) {
    for (const message of await this.list(tag)) {
      this._hidden[message.ID] = true
    }
  }

  public async waitForSubjectToInclude(subject: string, tag?: string) {
    for (let i = 0; i < 20; i++) {
      const messages = await this.list(tag)
      const message = messages.find((m) => m.Subject.includes(subject))
      if (message) {
        return this.message(message.ID)
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`No email with subject including ${subject} found`)
  }

  public async waitForCount(count: number, tag?: string) {
    for (let i = 0; i < 20; i++) {
      const messages = await this.list(tag)
      if (messages.length >= count) {
        return messages
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`Email count failed to reach ${count}`)
  }

  public async list(tag?: string): Promise<MailListItem[]> {
    const url = tag ? `${this._host}/search?query=tag:${tag}` : `${this._host}/messages`
    const json = await fetch(url, {
      headers: { authorization: this._auth },
    }).then((res) => res.json())
    return json.messages.filter((m: any) => !this._hidden[m.ID])
  }

  public async message(id: string): Promise<MailSummary> {
    const json = await fetch(`${this._host}/message/${id}`, {
      headers: { authorization: this._auth },
    }).then((res) => res.json())
    return parseLinks(json)
  }
}
