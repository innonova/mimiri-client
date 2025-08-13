import { ipcClient } from '../global'

class WatchDog {
	check() {
		void ipcClient.watchDog.ok()
	}
}

export const watchDog = new WatchDog()
