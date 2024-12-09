import { ipcClient } from '../global'

class WatchDog {
	check() {
		ipcClient.watchDog.ok()
	}
}

export const watchDog = new WatchDog()
