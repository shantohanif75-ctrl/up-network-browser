import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('upNetwork', {
  openUrl: (url: string) => ipcRenderer.invoke('browser:open-url', url)
})
