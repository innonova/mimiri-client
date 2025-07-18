import type { MimiriDb } from './mimiri-db'
import type { LocalState, SharedState } from './type'

export class LocalStateManager {
	private _localState: LocalState | undefined

	constructor(
		private db: MimiriDb,
		private state: SharedState,
	) {}

	public async login() {
		this._localState = await this.db.getLocalState()
		if (!this._localState) {
			this._localState = {
				firstLogin: true,
				workOffline: false,
				sizeDelta: 0,
				noteCountDelta: 0,
				size: 0,
				noteCount: 0,
			}
			await this.db.setLocalState(this._localState)
		}
		this.state.userStats.localSizeDelta = this._localState.sizeDelta
		this.state.userStats.localNoteCountDelta = this._localState.noteCountDelta
		this.state.userStats.localSize = this._localState.size
		this.state.userStats.localNoteCount = this._localState.noteCount
		this.state.workOffline = this._localState.workOffline
	}

	public async logout() {
		this._localState = undefined
	}

	public async updateLocalSizeData() {
		if (!this._localState) {
			throw new Error('Local state not initialized')
		}
		this._localState.sizeDelta = this.state.userStats.localSizeDelta
		this._localState.noteCountDelta = this.state.userStats.localNoteCountDelta
		this._localState.size = this.state.userStats.localSize
		this._localState.noteCount = this.state.userStats.localNoteCount
		await this.db.setLocalState(this._localState)
	}

	public async clearFirstLogin() {
		if (!this._localState) {
			throw new Error('Local state not initialized')
		}
		this._localState.firstLogin = false
		await this.db.setLocalState(this._localState)
	}

	public get firstLogin(): boolean {
		if (!this._localState) {
			throw new Error('Local state not initialized')
		}
		return this._localState.firstLogin
	}

	public async workOffline() {
		if (!this._localState) {
			throw new Error('Local state not initialized')
		}
		this._localState.workOffline = true
		this.state.workOffline = true
		await this.db.setLocalState(this._localState)
	}

	public async workOnline() {
		if (!this._localState) {
			throw new Error('Local state not initialized')
		}
		this._localState.workOffline = false
		this.state.workOffline = false
		await this.db.setLocalState(this._localState)
	}
}
