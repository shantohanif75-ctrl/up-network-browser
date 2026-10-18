import { contextBridge, ipcRenderer } from 'electron'

type BrowserProfile = {
  id: string
  name: string
  createdAt: string
}

contextBridge.exposeInMainWorld('upNetwork', {
  openUrl: (url: string, profileId?: string) =>
    ipcRenderer.invoke('browser:open-url', url, profileId),

  listProfiles: (): Promise<BrowserProfile[]> =>
    ipcRenderer.invoke('profiles:list'),

  createProfile: (name: string): Promise<BrowserProfile> =>
    ipcRenderer.invoke('profiles:create', name),

  openProfile: (id: string): Promise<{ opened: boolean; profileId: string }> =>
    ipcRenderer.invoke('profiles:open', id),

  deleteProfile: (
    id: string,
    confirmDelete: boolean
  ): Promise<{ deleted: boolean; profileId: string }> =>
    ipcRenderer.invoke('profiles:delete', id, confirmDelete)
})