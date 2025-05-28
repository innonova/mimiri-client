import { Capacitor, registerPlugin } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { reactive } from 'vue'
import { env } from '../global'

interface PlatformInfo {
	mode: string
	biometrics: boolean
}

interface BiometryResponse {
	verified: boolean
}

interface MimiriNativePlatform {
	info(): Promise<PlatformInfo>
	verifyBiometry(): Promise<BiometryResponse>
}

interface MimiriPlatformState {
	locked: boolean
}

class MimiriPlatform {
	private state: MimiriPlatformState = reactive({ locked: false })
	private _nativePlatform: MimiriNativePlatform
	private _platformInfo: PlatformInfo
	private _displayMode = 'browser'
	private _isCapacitor = false
	private _isIos = false
	private _isAndroid = false
	private _isWeb = false
	private _isElectron = false
	private _isMac = false
	private _isWindows = false
	private _isLinux = false
	private _isFlatpak = false
	private _isSnap = false
	private _isAppImage = false
	private _isTarGz = false
	private _isSnapStore = false
	private _isFlatHub = false
	private _isMacAppStore = false

	constructor() {
		if (Capacitor.isPluginAvailable('MimiriPlatform')) {
			this._isCapacitor = true
			this._nativePlatform = registerPlugin<MimiriNativePlatform>('MimiriPlatform')
			this._isIos = Capacitor.getPlatform() === 'ios'
			this._isAndroid = Capacitor.getPlatform() === 'android'
		} else if ((window as any).mimiri) {
			this._displayMode = 'pc'
			this._isElectron = true
			const platform = (window as any).mimiri.platform
			this._isMac = platform === 'darwin'
			this._isWindows = platform === 'win32'
			this._isLinux = platform === 'linux'
			this._isFlatpak = (window as any).mimiri.isFlatpak
			this._isSnap = (window as any).mimiri.isSnap
			this._isAppImage = (window as any).mimiri.isAppImage
			this._isTarGz = (window as any).mimiri.isTarGz
			this._isFlatHub = (window as any).mimiri.isFlatHub
			this._isSnapStore = (window as any).mimiri.isSnapStore
		} else {
			this._isWeb = true
		}
		// TODO consider a global async init
		void this.init()
	}

	public async init() {
		if (Capacitor.isPluginAvailable('Keyboard')) {
			if (Capacitor.getPlatform() === 'ios') {
				Keyboard.setScroll({ isDisabled: true }).catch(ex => console.log(ex))
			}
		}

		this._platformInfo = (await this._nativePlatform?.info()) ?? { mode: '', biometrics: false }
		this._displayMode = this._platformInfo.mode
	}

	private isMobileBrowser() {
		return (
			/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
				navigator.userAgent,
			) ||
			/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
				navigator.userAgent.substr(0, 4),
			)
		)
	}

	private isTabletBrowser() {
		const isTablet =
			/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(
				navigator.userAgent,
			)
		return isTablet
	}

	public async verifyBiometry() {
		if (env.DEV) {
			return true
		}
		const result = await this._nativePlatform.verifyBiometry()
		return result.verified
	}

	public get isPhone() {
		if (this.isIos || this.isAndroid) {
			return this._displayMode === 'phone'
		}
		if (this._isWeb && this.isMobileBrowser()) {
			return !this.isTabletBrowser()
		}
		return false
	}

	public get isTablet() {
		if (this.isIos || this.isAndroid) {
			return this._displayMode === 'tablet'
		}
		if (this._isWeb && this.isMobileBrowser()) {
			return this.isTabletBrowser()
		}
		return false
	}

	public get isDesktop() {
		if (this.isElectron) {
			return true
		}
		if (this._isWeb) {
			return !this.isMobileBrowser()
		}
	}

	public get isCapacitor() {
		return this._isCapacitor
	}

	public get isIos() {
		return this._isIos
	}

	public get isAndroid() {
		return this._isAndroid
	}

	public get isWeb() {
		return this._isWeb
	}

	public get isElectron() {
		return this._isElectron
	}

	public get isMac() {
		return this._isMac
	}

	public get isWindows() {
		return this._isWindows
	}

	public get isLinux() {
		return this._isLinux
	}

	public get isFlatpak() {
		return this._isFlatpak
	}

	public get isSnap() {
		return this._isSnap
	}

	public get isAppImage() {
		return this._isAppImage
	}

	public get isTarGz() {
		return this._isTarGz
	}

	public get isSnapStore() {
		return this._isSnapStore
	}

	public get isFlatHub() {
		return this._isFlatHub
	}

	public get isHostUpdateManaged() {
		return this.isIos || this.isAndroid || this.isSnapStore || this.isFlatHub || this._isMacAppStore
	}

	public get isLocked() {
		return this.state.locked
	}

	public get supportsBiometry() {
		return this._platformInfo?.biometrics ?? false
	}

	public get platform() {
		if (this.isElectron) {
			if (this.isWindows) {
				return `Electron-Windows`
			}
			if (this.isMac) {
				return `Electron-Mac`
			}
			if (this.isFlatpak) {
				return `Electron-Flatpak`
			}
			if (this.isSnap) {
				return `Electron-Snap`
			}
			if (this.isLinux) {
				return `Electron-Linux`
			}
			return `Electron`
		}
		if (this.isWeb) {
			return `Web`
		}
		if (this.isIos) {
			if (this.isPhone) {
				return `iOS-Phone`
			}
			if (this.isTablet) {
				return `iOS-Tablet`
			}
			return `iOS`
		}
		if (this.isAndroid) {
			if (this.isPhone) {
				return `Android-Phone`
			}
			if (this.isTablet) {
				return `Android-Tablet`
			}
			return `Android`
		}
		return 'unknown'
	}
}

export const mimiriPlatform = new MimiriPlatform()
