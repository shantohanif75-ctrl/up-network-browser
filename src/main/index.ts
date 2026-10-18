import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

type BrowserProfile = {
  id: string
  name: string
  createdAt: string
}

let mainWindow: BrowserWindow | null = null
let profiles: BrowserProfile[] = []
const profileWindows = new Map<string, BrowserWindow>()

const profilesFile = () => join(app.getPath('userData'), 'profiles.json')

function isValidProfileId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f0-9-]{36}$/i.test(id)
}

async function saveProfiles() {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(profilesFile(), JSON.stringify(profiles, null, 2), 'utf8')
}

async function loadProfiles() {
  try {
    const content = await readFile(profilesFile(), 'utf8')
    const saved: unknown = JSON.parse(content)

    if (Array.isArray(saved)) {
      profiles = saved.filter(
        (p): p is BrowserProfile =>
          p !== null &&
          typeof p === 'object' &&
          isValidProfileId((p as BrowserProfile).id) &&
          typeof (p as BrowserProfile).name === 'string' &&
          typeof (p as BrowserProfile).createdAt === 'string'
      )
    }
  } catch {
    profiles = []
    await saveProfiles()
  }
}

function getProfileSession(profileId: string) {
  return session.fromPartition(`persist:profile-${profileId}`)
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function openProfileWindow(profile: BrowserProfile) {
  const existing = profileWindows.get(profile.id)

  if (existing && !existing.isDestroyed()) {
    existing.focus()
    return existing
  }

  const profileSession = getProfileSession(profile.id)

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${profile.name} — Up Network Browser`,
    webPreferences: {
      session: profileSession,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

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

  profileWindows.set(profile.id, win)

  win.on('closed', () => {
    profileWindows.delete(profile.id)
  })

  void win.loadURL('https://www.google.com')
  return win
}

function validateHttpUrl(rawUrl: unknown): URL {
  if (
    typeof rawUrl !== 'string' ||
    rawUrl.trim().length === 0 ||
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

  ipcMain.handle('profiles:list', () => profiles)

  ipcMain.handle('profiles:create', async (_event, rawName: unknown) => {
    if (typeof rawName !== 'string' || !rawName.trim()) {
      throw new Error('Enter a profile name.')
    }

    if (rawName.trim().length > 60) {
      throw new Error('Profile name must be 60 characters or less.')
    }

    const profile: BrowserProfile = {
      id: randomUUID(),
      name: rawName.trim(),
      createdAt: new Date().toISOString()
    }

    profiles.push(profile)
    await saveProfiles()

    return profile
  })

  ipcMain.handle('profiles:open', (_event, rawId: unknown) => {
    if (!isValidProfileId(rawId)) {
      throw new Error('Invalid profile.')
    }

    const profile = profiles.find((p) => p.id === rawId)

    if (!profile) {
      throw new Error('Profile not found.')
    }

    openProfileWindow(profile)
    return { opened: true, profileId: profile.id }
  })

  ipcMain.handle(
    'profiles:delete',
    async (_event, rawId: unknown, confirmDelete: unknown) => {
      if (!isValidProfileId(rawId)) {
        throw new Error('Invalid profile.')
      }

      if (confirmDelete !== true) {
        throw new Error('Confirm profile deletion first.')
      }

      const index = profiles.findIndex((p) => p.id === rawId)

      if (index === -1) {
        throw new Error('Profile not found.')
      }

      const win = profileWindows.get(rawId)

      if (win && !win.isDestroyed()) {
        win.destroy()
      }

      profileWindows.delete(rawId)
      profiles.splice(index, 1)
      await saveProfiles()

      // Profile data is deliberately retained.
      // Storage is not cleared automatically when deleting a profile.

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

        if (!profile) {
          throw new Error('Profile not found.')
        }

        const win = openProfileWindow(profile)
        await win.loadURL(target.toString())

        return { opened: true, url: target.toString(), profileId: profile.id }
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

      view.webContents.setWindowOpenHandler(({ url }) => {
        try {
          const external = new URL(url)

          if (['http:', 'https:'].includes(external.protocol)) {
            void shell.openExternal(external.toString())
          }
        } catch {
          // Reject invalid URLs.
        }

        return { action: 'deny' }
      })

      await view.loadURL(target.toString())
      return { opened: true, url: target.toString() }
    }
  )

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
