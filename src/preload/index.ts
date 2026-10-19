import { contextBridge, ipcRenderer } from 'electron'

export type ProxyConfig = {
  type: 'direct' | 'http' | 'socks5'
  host: string
  port: string
  username: string
  password: string
}

export type BrowserProfile = {
  id: string
  name: string
  createdAt: string
  userAgent: string
  proxy: ProxyConfig
}

export type ProfileSettings = {
  userAgent: string
  proxy: ProxyConfig
}

contextBridge.exposeInMainWorld('upNetwork', {
  openUrl: (url: string, profileId?: string) =>
    ipcRenderer.invoke('browser:open-url', url, profileId),

  listProfiles: (): Promise<BrowserProfile[]> =>
    ipcRenderer.invoke('profiles:list'),

  createProfile: (
    input: string | {
      name: string
      userAgent?: string
      proxy?: ProxyConfig
    }
  ): Promise<BrowserProfile> =>
    ipcRenderer.invoke('profiles:create', input),

  updateProfileSettings: (
    id: string,
    settings: ProfileSettings
  ): Promise<BrowserProfile> =>
    ipcRenderer.invoke('profiles:update-settings', id, settings),

  openProfile: (
    id: string
  ): Promise<{ opened: boolean; profileId: string }> =>
    ipcRenderer.invoke('profiles:open', id),

  deleteProfile: (
    id: string,
    confirmDelete: boolean
  ): Promise<{ deleted: boolean; profileId: string }> =>
    ipcRenderer.invoke('profiles:delete', id, confirmDelete),

  testProxy: (
    profileId: string
  ): Promise<{
    success: boolean
    ip: string
    proxyType: 'http' | 'socks5'
  }> => ipcRenderer.invoke('proxy:test', profileId)
})