import { app, BrowserWindow, ipcMain, session, shell } from 'electron'
import { join } from 'node:path'

function createMainWindow() {
  const win = new BrowserWindow({
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

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        void shell.openExternal(parsed.toString())
      }
    } catch {
      // Reject malformed URLs.
    }
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('browser:open-url', async (_event, rawUrl: unknown) => {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0 || rawUrl.length > 2048) {
      throw new Error('Enter a valid website address.')
    }

    let target: URL
    try {
      const candidate = rawUrl.trim()
      target = new URL(candidate.includes('://') ? candidate : `https://${candidate}`)
    } catch {
      throw new Error('That website address is not valid.')
    }

    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Only HTTP and HTTPS websites are supported.')
    }

    const parent = BrowserWindow.getFocusedWindow()
    if (!parent) throw new Error('Browser window is not available.')

    const browserSession = session.fromPartition('persist:upnetwork-default')
    const view = new BrowserWindow({
      width: 1200,
      height: 800,
      parent,
      title: target.hostname,
      webPreferences: {
        session: browserSession,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    await view.loadURL(target.toString())
    return { opened: true, url: target.toString() }
  })

  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
