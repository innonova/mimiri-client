import { ref } from 'vue'
import { NoteManager } from './services/note-manager'
import type { ContextMenuControl } from './services/types/context-menu'
import type { MimerNote } from './services/types/mimer-note'
import type { Guid } from './services/types/guid'
import { IpcClient } from './services/ipc-client'
import { BrowserHistory } from './services/browser-history'
import { UpdateManager } from './services/update-manger'
import { NotificationManager } from './services/notification-manager'
import { MimiriEditor } from './services/editor/mimiri-editor'
import { MobileLog } from './services/mobile-log'
import { PasswordGenerator } from './services/password-generator'

export const env = import.meta.env
const host = env.VITE_MIMER_API_HOST
const serverKey = env.VITE_API_PUBLIC_KEY
const serverKeyId = env.VITE_API_PUBLIC_KEY_ID
export const ipcClient = new IpcClient()
export const browserHistory = new BrowserHistory()
export const noteManager = new NoteManager(host, serverKey, serverKeyId)
export const updateManager = new UpdateManager(env.VITE_MIMER_UPDATE_HOST)
export const notificationManager = new NotificationManager()
export const passwordGenerator = new PasswordGenerator()
export const noteTreeView = ref(null)
export const mainToolbar = ref(null)
export const noteEditor = ref(null)
export const aboutDialog = ref(null)
export const checkUpdateDialog = ref(null)
export const contextMenu = ref<ContextMenuControl>(null)
export const notificationList = ref(null)
export const deleteNodeDialog = ref(null)
export const emptyRecycleBinDialog = ref(null)
export const passwordGeneratorDialog = ref(null)
export const saveEmptyNodeDialog = ref(null)
export const limitDialog = ref(null)
export const shareDialog = ref(null)
export const changePasswordDialog = ref(null)
export const passwordDialog = ref(null)
export const createEditAccountScreen = ref(null)
export const settingsScreen = ref(null)
export const showDeleteAccount = ref(false)
export const titleBar = ref(null)
export const showCreateAccount = ref(false)
export const showSettings = ref(false)
export const showConvertAccount = ref(false)
export const showUpdate = ref(false)
export const conversionData = ref({ username: '', password: '' })
export const createNewNode = ref(false)
export const createNewRootNode = ref(false)
export const searchInput = ref(null)
export const mobileLog = new MobileLog()

export const clipboardNote = ref<MimerNote>(undefined)
export const isCut = ref(false)
export const dragId = ref<Guid>(undefined)

export const showShareOffers = ref(false)
export const showSearchBox = ref(false)

export const mimiriEditor = new MimiriEditor()

export const updateKeys = [
	{
		name: env.VITE_UPDATE_NAME,
		algorithm: env.VITE_UPDATE_ALGORITHM,
		key: env.VITE_UPDATE_PUBLIC_KEY,
		current: true,
	},
]
