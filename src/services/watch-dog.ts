import { ipcClient } from '../global'

let okCount = 0

class WatchDog {
	check() {
		if (okCount++ === 0) {
			ipcClient.watchDog.ok()
		}
	}
}

export const watchDog = new WatchDog()
