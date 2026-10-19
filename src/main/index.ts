import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
  shell
} from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

type ProxyConfig = {
  type: 'direct' | 'http' | 'socks5'
  host: string
  port: string
  username: string
  password: string
}

type BrowserProfile = {
  id: string
  name: string
  createdAt: string
  userAgent: string
  proxy: ProxyConfig
}

const directProxy = (): ProxyConfig => ({
  type: 'direct',
  host: '',
  port: '',
  username: '',
  password: ''
})

let mainWindow: BrowserWindow | null = null
let profiles: BrowserProfile[] = []

const profileWindows = new Map<string, BrowserWindow>()
const sessionProxies = new Map<Electron.Session, ProxyConfig>()

const profilesFile = () =>
  join(app.getPath('userData'), 'profiles.json')

function isValidProfileId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)
}

function normalizeProfile(value: unknown): BrowserProfile | null {
  if (!value || typeof value !== 'object') return null

  const p = value as Partial<BrowserProfile>

  if (
    !isValidProfileId(p.id) ||
    typeof p.name !== 'string' ||
    typeof p.createdAt !== 'string'
  ) {
    return null
  }

  const oldProxy = p.proxy

  const proxy: ProxyConfig = {
    type:
      oldProxy?.type === 'http' || oldProxy?.type === 'socks5'
        ? oldProxy.type
        : 'direct',
    host: typeof oldProxy?.host === 'string' ? oldProxy.host : '',
    port: typeof oldProxy?.port === 'string' ? oldProxy.port : '',
    username:
      typeof oldProxy?.username === 'string' ? oldProxy.username : '',
    password:
      typeof oldProxy?.password === 'string' ? oldProxy.password : ''
  }

  return {
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    userAgent: typeof p.userAgent === 'string' ? p.userAgent : '',
    proxy
  }
}

async function saveProfiles() {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(profilesFile(), JSON.stringify(profiles, null, 2), 'utf8')
}

async function loadProfiles() {
  try {
    const content = await readFile(profilesFile(), 'utf8')
    const saved: unknown = JSON.parse(content)

    profiles = Array.isArray(saved)
      ? saved
          .map(normalizeProfile)
          .filter((p): p is BrowserProfile => p !== null)
      : []
  } catch {
    profiles = []
    await saveProfiles()
  }
}

function validateProxy(value: unknown): ProxyConfig {
  if (!value || typeof value !== 'object') {
    return directProxy()
  }

  const p = value as Partial<ProxyConfig>

  if (!p.type || p.type === 'direct') return directProxy()

  if (p.type !== 'http' && p.type !== 'socks5') {
    throw new Error('Choose a supported proxy type.')
  }

  const host = typeof p.host === 'string' ? p.host.trim() : ''
  const port = typeof p.port === 'string' ? p.port.trim() : ''

  if (
    !host ||
    host.length > 253 ||
    /[\s/@?#]/.test(host) ||
    !/^\d{1,5}$/.test(port) ||
    Number(port) < 1 ||
    Number(port) > 65535
  ) {
    throw new Error('Enter a valid proxy host and port.')
  }

  return {
    type: p.type,
    host,
    port,
    username: typeof p.username === 'string' ? p.username : '',
    password: typeof p.password === 'string' ? p.password : ''
  }
}

function validateUserAgent(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''

  if (
    typeof value !== 'string' ||
    value.length > 1024 ||
    /[\r\n]/.test(value)
  ) {
    throw new Error('Enter a valid User-Agent string.')
  }

  return value.trim()
}

function getProfileSession(profileId: string) {
  return session.fromPartition(`persist:profile-${profileId}`)
}

async function applyProfileSettings(profile: BrowserProfile) {
  const ses = getProfileSession(profile.id)
  const proxy = profile.proxy

  sessionProxies.set(ses, proxy)

  if (proxy.type === 'direct') {
    await ses.setProxy({ mode: 'direct' })
  } else {
    const rules =
      proxy.type === 'http'
        ? `http=${proxy.host}:${proxy.port};https=${proxy.host}:${proxy.port}`
        : `socks5://${proxy.host}:${proxy.port}`

    await ses.setProxy({ proxyRules: rules })
  }

  await ses.forceReloadProxyConfig()
}

function installProxyAuthenticationHandler() {
  app.on('login', (event, webContents, _details, authInfo, callback) => {
    if (!authInfo.isProxy) return

    const proxy = sessionProxies.get(webContents.session)

    if (!proxy || !proxy.username || proxy.type === 'direct') {
      return
    }

    event.preventDefault()
    callback(proxy.username, proxy.password)
  })
}

function setSafeExternalLinks(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url)

      if (target.protocol === 'https:' || target.protocol === 'http:') {
        void shell.openExternal(target.toString())
      }
    } catch {
      // Reject invalid URLs.
    }

    return { action: 'deny' }
  })
}

/**
 * Auto Update
 *
 * Updates are checked only in the packaged application.
 * electron-builder must publish the installer and latest.yml
 * to a GitHub Release for this repository.
 */
function setupAutoUpdates() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => {
    console.error('Auto update error:', error)
  })

  autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log(`Browser is up to date: ${info.version}`)
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Update download progress: ${Math.round(progress.percent)}%`)
  })

  autoUpdater.on('update-downloaded', async (info) => {
    try {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Up Network Browser Update',
        message: `Version ${info.version} is ready to install.`,
        detail:
          'Restart the browser now to install the update. Choose Later to continue working; the downloaded update will install when you quit the browser.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      })

      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    } catch (error) {
      console.error('Could not show update dialog:', error)
    }
  })

  const checkForUpdates = () => {
    void autoUpdater.checkForUpdates().catch((error) => {
      console.error('Could not check for updates:', error)
    })
  }

  // Check once at startup.
  checkForUpdates()

  // Check again every four hours.
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000)
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    title: 'Up Network Browser',
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  setSafeExternalLinks(mainWindow)

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function openProfileWindow(profile: BrowserProfile) {
  const existing = profileWindows.get(profile.id)

  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  await applyProfileSettings(profile)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${profile.name} — Up Network Browser`,
    webPreferences: {
      session: getProfileSession(profile.id),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  setSafeExternalLinks(win)

  if (profile.userAgent) {
    win.webContents.setUserAgent(profile.userAgent)
  }

  profileWindows.set(profile.id, win)

  win.on('closed', () => {
    profileWindows.delete(profile.id)
  })

  await win.loadURL('https://www.google.com')
  return win
}

function validateHttpUrl(rawUrl: unknown): URL {
  if (
    typeof rawUrl !== 'string' ||
    !rawUrl.trim() ||
    rawUrl.length > 2048
  ) {
    throw new Error('Enter a valid website address.')
  }

  let target: URL

  try {
    const candidate = rawUrl.trim()

    target = new URL(
      candidate.includes('://') ? candidate : `https://${candidate}`
    )
  } catch {
    throw new Error('That website address is not valid.')
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    throw new Error('Only HTTP and HTTPS websites are supported.')
  }

  return target
}

app.whenReady().then(async () => {
  await loadProfiles()
  installProxyAuthenticationHandler()

  ipcMain.handle('profiles:list', () => profiles)

  // Test a profile's configured proxy and retrieve its public IP.
  ipcMain.handle('proxy:test', async (_event, rawId: unknown) => {
    if (!isValidProfileId(rawId)) {
      throw new Error('Invalid profile.')
    }

    const profile = profiles.find((p) => p.id === rawId)

    if (!profile) {
      throw new Error('Profile not found.')
    }

    if (profile.proxy.type === 'direct') {
      throw new Error('এই প্রোফাইলে Proxy সেট করা নেই।')
    }

    await applyProfileSettings(profile)

    const ses = getProfileSession(profile.id)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await ses.fetch(
        'https://api.ipify.org?format=json',
        { signal: controller.signal }
      )

      if (!response.ok) {
        throw new Error(`IP service returned HTTP ${response.status}.`)
      }

      const result = await response.json() as { ip?: string }

      if (!result.ip) {
        throw new Error('Public IP পাওয়া যায়নি।')
      }

      return {
        success: true,
        ip: result.ip,
        proxyType: profile.proxy.type
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Connection error'

      throw new Error(`Proxy test failed: ${message}`)
    } finally {
      clearTimeout(timeout)
    }
  })

  ipcMain.handle('profiles:create', async (_event, input: unknown) => {
    const data =
      typeof input === 'string'
        ? { name: input }
        : (input as {
            name?: unknown
            userAgent?: unknown
            proxy?: unknown
          } | null)

    if (typeof data?.name !== 'string' || !data.name.trim()) {
      throw new Error('Enter a profile name.')
    }

    if (data.name.trim().length > 60) {
      throw new Error('Profile name must be 60 characters or less.')
    }

    const profile: BrowserProfile = {
      id: randomUUID(),
      name: data.name.trim(),
      createdAt: new Date().toISOString(),
      userAgent: validateUserAgent(data.userAgent),
      proxy: validateProxy(data.proxy)
    }

    profiles.push(profile)

    try {
      await saveProfiles()
    } catch (error) {
      profiles = profiles.filter((p) => p.id !== profile.id)
      throw error
    }

    return profile
  })

  ipcMain.handle(
    'profiles:update-settings',
    async (_event, id, settings) => {
      if (!isValidProfileId(id)) throw new Error('Invalid profile.')

      const profile = profiles.find((p) => p.id === id)
      if (!profile) throw new Error('Profile not found.')

      const data = settings as {
        userAgent?: unknown
        proxy?: unknown
      }

      const updated: BrowserProfile = {
        ...profile,
        userAgent: validateUserAgent(data?.userAgent),
        proxy: validateProxy(data?.proxy)
      }

      const oldProfile = { ...profile, proxy: { ...profile.proxy } }
      Object.assign(profile, updated)

      try {
        await saveProfiles()
        await applyProfileSettings(profile)

        const win = profileWindows.get(id)

        if (win && !win.isDestroyed()) {
          win.webContents.setUserAgent(
            profile.userAgent || app.userAgentFallback
          )
          await win.webContents.reload()
        }
      } catch (error) {
        Object.assign(profile, oldProfile)
        await saveProfiles()
        throw error
      }

      return profile
    }
  )

  ipcMain.handle('profiles:open', async (_event, rawId: unknown) => {
    if (!isValidProfileId(rawId)) throw new Error('Invalid profile.')

    const profile = profiles.find((p) => p.id === rawId)
    if (!profile) throw new Error('Profile not found.')

    await openProfileWindow(profile)
    return { opened: true, profileId: profile.id }
  })

  ipcMain.handle(
    'profiles:delete',
    async (_event, rawId: unknown, confirmDelete: unknown) => {
      if (!isValidProfileId(rawId)) throw new Error('Invalid profile.')
      if (confirmDelete !== true) {
        throw new Error('Confirm deletion first.')
      }

      const index = profiles.findIndex((p) => p.id === rawId)
      if (index === -1) throw new Error('Profile not found.')

      const win = profileWindows.get(rawId)
      if (win && !win.isDestroyed()) win.destroy()

      profileWindows.delete(rawId)
      profiles.splice(index, 1)
      await saveProfiles()

      // The profile's browser data is intentionally retained.
      return { deleted: true, profileId: rawId }
    }
  )

  ipcMain.handle(
    'browser:open-url',
    async (_event, rawUrl: unknown, rawProfileId?: unknown) => {
      const target = validateHttpUrl(rawUrl)

      if (rawProfileId !== undefined) {
        if (!isValidProfileId(rawProfileId)) {
          throw new Error('Invalid profile.')
        }

        const profile = profiles.find((p) => p.id === rawProfileId)
        if (!profile) throw new Error('Profile not found.')

        const win = await openProfileWindow(profile)
        await win.loadURL(target.toString())

        return {
          opened: true,
          url: target.toString(),
          profileId: profile.id
        }
      }

      const parent = BrowserWindow.getFocusedWindow()

      if (!parent) {
        throw new Error('Browser window is not available.')
      }

      const view = new BrowserWindow({
        width: 1200,
        height: 800,
        parent,
        title: target.hostname,
        webPreferences: {
          session: session.fromPartition('persist:upnetwork-default'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true
        }
      })

      setSafeExternalLinks(view)
      await view.loadURL(target.toString())

      return { opened: true, url: target.toString() }
    }
  )

  createMainWindow()

  // Enable automatic updates in the installed/packaged application.
  setupAutoUpdates()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})