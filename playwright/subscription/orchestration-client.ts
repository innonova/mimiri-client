import { add } from 'date-fns'
import { config } from './data'
import { Guid } from './guid'
import { passwordHasher } from './password-hasher'

export interface PreLoginResponse {
	salt: string
	iterations: number
	algorithm: string
	challenge: string
}

export interface LoginRequest {
	username: string
	response: string
	hashLength: number
}

export interface LoginResponse {
	userId: Guid
	publicKey: string
	privateKey: string
	asymmetricAlgorithm: string
	salt: string
	iterations: number
	algorithm: string
	symmetricAlgorithm: string
	symmetricKey: string
	data: string
	config: string
	size: number
	noteCount: number
	maxTotalBytes: number
	maxNoteBytes: number
	maxNoteCount: number
	maxHistoryEntries: number
}

export class OrchestrationClient {
	private _host = 'http://localhost:3000'
	private _mockPayrexx = 'http://localhost:3001'

	constructor() {}

	public async resetDatabaseSoft(username: string) {
		await fetch(`${this._host}/reset-database-soft/${username}`).then(res => res.text())
	}

	public async grandfather(username: string) {
		await fetch(`${this._host}/set-grand-fathered-sharing/${username}`).then(res => res.text())
	}

	public async triggerRenewals(now?: Date) {
		if (now) {
			return await fetch(`${this._host}/subscription/trigger-renewals?now=${now.toISOString()}`).then(res => res.text())
		} else {
			return await fetch(`${this._host}/subscription/trigger-renewals`).then(res => res.text())
		}
	}

	public async triggerNextRenewalsFor(username: string) {
		const now = add((await this.nextRenewalDate(username)).time, { hours: 3 })
		return this.triggerRenewals(now)
	}

	public async nextRenewalDate(username: string): Promise<{ action: string; time: Date }> {
		const data = await fetch(`${this._host}/next-renewal-action/${username}`).then(res => res.json())
		return {
			action: data.action,
			time: new Date(data.time),
		}
	}

	public async failNextCharge(mode: string) {
		await fetch(`${this._mockPayrexx}/fail-next`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode }),
		}).then(res => res.json())
	}

	public async useRealPayrexx() {
		await fetch(`${this._host}/payment/set-host`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mock: false }),
		}).then(res => res.json())
		config.payrexxMode = 'real'
	}

	public async useMockPayrexx() {
		await fetch(`${this._host}/payment/set-host`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mock: true }),
		}).then(res => res.json())
		config.payrexxMode = 'mock'
	}

	public async login(username: string, password: string) {
		const preLoginResponse = (await fetch(`https://dev-api.mimiri.io/api/user/pre-login/${username}`).then(res =>
			res.json(),
		)) as PreLoginResponse

		const passwordHash = await passwordHasher.hashPassword(
			password,
			preLoginResponse.salt,
			preLoginResponse.algorithm,
			preLoginResponse.iterations,
		)

		const loginRequest: LoginRequest = {
			username,
			response: await passwordHasher.computeResponse(passwordHash, preLoginResponse.challenge),
			hashLength: passwordHash.length / 2,
		}

		return (await fetch('https://dev-api.mimiri.io/api/user/login', {
			method: 'POST',
			body: JSON.stringify(loginRequest),
		}).then(res => res.json())) as LoginResponse
	}
}
