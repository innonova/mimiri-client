import { add } from 'date-fns'
import { emptyGuid, Guid } from './guid'
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
}

export class OrchestrationClient {
	private _host = 'https://dev-payment.mimiri.io'
	// private _host = 'http://localhost:3000'
	private _mockPayrexx = 'https://mock-payrexx.mimiri.io'

	constructor() {}

	public async cleanUp(username: string) {
		await fetch(`${this._host}/clean-up/${username}`).then(res => res.text())
	}

	public async setUserType(username: string, userType: number) {
		await fetch(`${this._host}/set-user-type/${username}/${userType}`).then(res => res.text())
	}

	public async resetDatabaseSoft(username: string) {
		await fetch(`${this._host}/reset-database-soft/${username}`).then(res => res.text())
	}

	public async grandfather(username: string) {
		await fetch(`${this._host}/set-grand-fathered-sharing/${username}`).then(res => res.text())
	}

	public async triggerRenewals(username: string, now?: Date) {
		if (now) {
			return await fetch(`${this._host}/subscription/trigger-renewals/${username}?now=${now.toISOString()}`).then(res =>
				res.text(),
			)
		} else {
			return await fetch(`${this._host}/subscription/trigger-renewals/${username}`).then(res => res.text())
		}
	}

	public async triggerNextRenewalsFor(username: string) {
		const now = add((await this.nextRenewalDate(username)).time, { hours: 3 })
		return this.triggerRenewals(username, now)
	}

	public async nextRenewalDate(username: string): Promise<{ action: string; time: Date }> {
		const data = await fetch(`${this._host}/next-renewal-action/${username}`).then(res => res.json() as any)
		return {
			action: data.action,
			time: new Date(data.time),
		}
	}

	public async waitForMailQueue(email: string) {
		return await fetch(`${this._host}/email/wait-for-queue/${email}`).then(res => res.text())
	}

	public async failNextCharge(mode: string, username: string) {
		await fetch(`${this._mockPayrexx}/fail-next`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mode, username }),
		}).then(res => res.json())
	}

	public async useRealPayrexx(username: string) {
		await fetch(`${this._host}/payment/set-host`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mock: false, username }),
		}).then(res => res.json())
	}

	public async useMockPayrexx(username: string) {
		await fetch(`${this._host}/payment/set-host`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ mock: true, username }),
		}).then(res => res.json())
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

	public async triggerDeletions() {
		return await fetch(`${this._host}/customer/trigger-deletions`).then(res => res.text())
	}

	public async associatedObjects(customerId: Guid) {
		return await fetch(`${this._host}/customer/associated-objects/${customerId}`).then(res => res.json() as any)
	}

	public async getCustomerId(username: string) {
		const res = await fetch(`${this._host}/customer/id/${username}`)
		if (res.status === 200) {
			return (await res.text()) as Guid
		}
		return emptyGuid()
	}
}
