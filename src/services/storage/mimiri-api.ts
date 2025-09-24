import { reactive } from 'vue'
import { settingsManager } from '../settings-manager'
import { env, noteManager } from '../../global'
import { persistedState } from '../persisted-state'
import type { HistoryItem } from '../types/mimer-note'

export interface MimiriApiState {
	appearShared?: string[]
	shareCode?: string
	historyEntries?: HistoryItem[]
}

class MimiriApi {
	public state = reactive<MimiriApiState>({})

	constructor() {
		if (env.DEV) {
			globalThis.mimiriApi = {
				setDarkMode: (isDark: boolean | undefined) => {
					settingsManager.darkMode = !!isDark
				},
				appearShared: (names: string[]) => {
					this.state.appearShared = names
				},
				setShareCode: (code: string) => {
					this.state.shareCode = code
				},
				resetTreeState: () => {
					persistedState.clear()
				},
				setHistoryEntries: (entries: HistoryItem[]) => {
					this.state.historyEntries = entries
				},
				isMobile: () => {
					return noteManager.state.isMobile
				},
				setConnectDelay: (delay: number) => {
					noteManager.setConnectDelay(delay)
				},
			}
		}
	}
}

export const mimiriApi = new MimiriApi()
