import { useEffect, useState } from 'react'
import {
  ShieldCheck, Globe, Plus, ArrowRight, Settings2, Shield,
  LockKeyhole, ExternalLink, CircleUserRound, Trash2,
  RefreshCw, Play, Users, Network, Smartphone
} from 'lucide-react'

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

const emptyProxy = (): ProxyConfig => ({
  type: 'direct',
  host: '',
  port: '',
  username: '',
  password: ''
})

const uaPresets: Record<string, string> = {
  default: '',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  macos:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad:
    'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
}

declare global {
  interface Window {
    upNetwork: {
      openUrl: (
        url: string,
        profileId?: string
      ) => Promise<{ opened: boolean; url?: string; profileId?: string }>
      listProfiles: () => Promise<BrowserProfile[]>
      createProfile: (input: {
        name: string
        userAgent?: string
        proxy?: ProxyConfig
      }) => Promise<BrowserProfile>
      updateProfileSettings: (
        id: string,
        settings: { userAgent: string; proxy: ProxyConfig }
      ) => Promise<BrowserProfile>
      openProfile: (id: string) => Promise<{
        opened: boolean
        profileId: string
      }>
      deleteProfile: (
        id: string,
        confirmDelete: boolean
      ) => Promise<{ deleted: boolean; profileId: string }>
    }
  }
}

export default function App() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([])
  const [profileName, setProfileName] = useState('')
  const [address, setAddress] = useState('https://example.com')
  const [uaMode, setUaMode] = useState('default')
  const [customUA, setCustomUA] = useState('')
  const [proxy, setProxy] = useState<ProxyConfig>(emptyProxy())
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function refreshProfiles() {
    try {
      setProfiles(await window.upNetwork.listProfiles())
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not load profiles.'
      )
    } finally {
      setLoadingProfiles(false)
    }
  }

  useEffect(() => {
    void refreshProfiles()
  }, [])

  function resetForm() {
    setProfileName('')
    setUaMode('default')
    setCustomUA('')
    setProxy(emptyProxy())
    setEditingId(null)
  }

  function selectedUserAgent() {
    return uaMode === 'custom'
      ? customUA.trim()
      : (uaPresets[uaMode] ?? '')
  }

  async function saveProfile() {
    const name = profileName.trim()

    if (!editingId && !name) {
      setNotice('Please enter a profile name.')
      return
    }

    if (uaMode === 'custom' && !customUA.trim()) {
      setNotice('Enter a custom User-Agent or choose a preset.')
      return
    }

    if (proxy.type !== 'direct') {
      if (!proxy.host.trim() || !proxy.port.trim()) {
        setNotice('Enter the proxy host and port.')
        return
      }
    }

    setBusy(true)
    setNotice('')

    try {
      const userAgent = selectedUserAgent()
      let saved: BrowserProfile

      if (editingId) {
        saved = await window.upNetwork.updateProfileSettings(
          editingId,
          { userAgent, proxy }
        )

        setProfiles(current =>
          current.map(p => p.id === saved.id ? saved : p)
        )

        setNotice(
          `Settings saved for "${saved.name}". Reopen the profile if needed.`
        )
      } else {
        saved = await window.upNetwork.createProfile({
          name,
          userAgent,
          proxy
        })

        setProfiles(current => [...current, saved])
        setNotice(`Profile "${saved.name}" created.`)
      }

      resetForm()
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not save profile.'
      )
    } finally {
      setBusy(false)
    }
  }

  function editProfile(profile: BrowserProfile) {
    setEditingId(profile.id)
    setProfileName(profile.name)
    setProxy(profile.proxy ?? emptyProxy())

    const match = Object.entries(uaPresets).find(
      ([key, value]) =>
        key !== 'default' && value === profile.userAgent
    )

    if (!profile.userAgent) {
      setUaMode('default')
      setCustomUA('')
    } else if (match) {
      setUaMode(match[0])
      setCustomUA('')
    } else {
      setUaMode('custom')
      setCustomUA(profile.userAgent)
    }

    setNotice(`Editing settings for "${profile.name}".`)
    document
      .getElementById('profiles')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  async function openProfile(profile: BrowserProfile) {
    setBusy(true)
    setNotice('')

    try {
      await window.upNetwork.openProfile(profile.id)
      setNotice(`Opened profile "${profile.name}".`)
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not open profile.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile(profile: BrowserProfile) {
    if (!window.confirm(
      `Remove "${profile.name}" from the list?\n\nIts stored browser data will not be automatically erased.`
    )) return

    setBusy(true)
    setNotice('')

    try {
      await window.upNetwork.deleteProfile(profile.id, true)

      setProfiles(current =>
        current.filter(p => p.id !== profile.id)
      )

      if (editingId === profile.id) resetForm()

      setNotice(
        `Removed "${profile.name}" from the list. Stored browser data was retained.`
      )
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not delete profile.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function openWebsite() {
    setBusy(true)
    setNotice('')

    try {
      const result = await window.upNetwork.openUrl(address.trim())
      setNotice(
        `Opened ${result.url ?? address} in a browser window.`
      )
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Could not open website.'
      )
    } finally {
      setBusy(false)
    }
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    minWidth: 0
  } as const

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 0,
    borderRadius: 10,
    padding: '11px 14px',
    background: '#4f46e5',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600
  } as const

  const inputStyle = {
    boxSizing: 'border-box' as const,
    width: '100%',
    minWidth: 0,
    border: '1px solid #d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    background: '#fff',
    color: '#111827'
  }

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 7,
    color: '#374151'
  } as const

  return (
    <div
      className="app-shell"
      style={{
        minHeight: '100vh',
        background: '#f5f7fc',
        color: '#111827'
      }}
    >
      <aside
        className="sidebar"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}
      >
        {/* Up Network logo and brand */}
        <div className="brand">
          <div
            className="brand-mark"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
              color: '#fff',
              fontWeight: 900,
              fontSize: 20,
              borderRadius: 12,
              boxShadow: '0 0 18px rgba(37, 99, 235, 0.35)',
              display: 'grid',
              placeItems: 'center'
            }}
            aria-label="Shanto Hanif logo"
          >
            SH
          </div>

          <div className="brand-copy">
            <strong>Up Network</strong>
            <span>BROWSER</span>
          </div>
        </div>

        <div className="workspace">
          <span className="workspace-dot" />
          <div>
            <b>Personal workspace</b>
            <small>{profiles.length} profiles saved</small>
          </div>
          <Settings2 size={16} />
        </div>

        <div className="nav-label">YOUR BROWSER</div>

        <a className="nav-item active" href="#overview">
          <Globe size={18} /> Overview
        </a>

        <a className="nav-item" href="#profiles">
          <CircleUserRound size={18} />
          Profiles
          <span className="soon">{profiles.length}</span>
        </a>

        <a className="nav-item" href="#privacy">
          <Shield size={18} /> Protection
        </a>

        <div className="sidebar-bottom">
          <div className="privacy-icon">
            <LockKeyhole size={17} />
          </div>
          <div>
            <b>Privacy first</b>
            <small>Separate profile sessions</small>
          </div>
        </div>

        {/* Creator branding at the bottom of the sidebar */}
        <div
          style={{
            marginTop: 'auto',
            marginLeft: 14,
            marginRight: 14,
            marginBottom: 16,
            padding: '13px 8px',
            background: '#080f22',
            color: '#ffffff',
            border: '1px solid #1677ff',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.6px',
            lineHeight: 1.8,
            boxShadow: '0 0 16px rgba(22,119,255,0.2)',
            flexShrink: 0
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: '#06b6d4',
              fontWeight: 900,
              lineHeight: 1.2
            }}
          >
            SH
          </div>

          <div
            style={{
              color: '#93c5fd',
              letterSpacing: '2px'
            }}
          >
            CREATED BY
          </div>

          <div
            style={{
              fontSize: 11,
              overflowWrap: 'anywhere',
              color: '#ffffff'
            }}
          >
            SHANTO HANIF ISLAM
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span> Overview
          </div>

          <div className="top-right">
            <span className="status">
              <i /> Browser ready
            </span>
            <div className="avatar">UN</div>
          </div>
        </header>

        <section className="welcome" id="overview">
          <div>
            <div className="eyebrow">
              <span /> YOUR BROWSER WORKSPACE
            </div>
            <h1>Browse your way.</h1>
            <p>
              Create profiles with independent sessions, User-Agent
              and proxy settings.
            </p>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="hero-shield">
              <ShieldCheck size={48} />
            </div>
            <div className="spark spark-one">✦</div>
            <div className="spark spark-two">✧</div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 22
          }}
        >
          <div style={cardStyle}>
            <Users color="#4f46e5" size={24} />
            <p style={{ color: '#6b7280', marginBottom: 6 }}>
              Total profiles
            </p>
            <h2 style={{ fontSize: 30, margin: 0 }}>
              {profiles.length}
            </h2>
          </div>

          <div style={cardStyle}>
            <Globe color="#059669" size={24} />
            <p style={{ color: '#6b7280', marginBottom: 6 }}>
              Profile storage
            </p>
            <h2 style={{ fontSize: 20, margin: 0 }}>Persistent</h2>
          </div>

          <div style={cardStyle}>
            <ShieldCheck color="#d97706" size={24} />
            <p style={{ color: '#6b7280', marginBottom: 6 }}>
              Session isolation
            </p>
            <h2 style={{ fontSize: 20, margin: 0 }}>Per profile</h2>
          </div>
        </section>

        <section style={{ ...cardStyle, marginBottom: 22 }}>
          <h2 style={{ marginTop: 0 }}>Quick browse</h2>
          <p style={{ color: '#6b7280' }}>
            Open a website in a separate browser window.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap'
            }}
          >
            <input
              aria-label="Website address"
              style={{ ...inputStyle, flex: '1 1 260px' }}
              value={address}
              onChange={event => setAddress(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') void openWebsite()
              }}
              placeholder="Enter website address"
            />

            <button
              style={buttonStyle}
              onClick={() => void openWebsite()}
              disabled={busy}
            >
              <ArrowRight size={17} /> Open website
            </button>
          </div>
        </section>

        <section
          id="profiles"
          style={{ ...cardStyle, marginBottom: 22 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>My Profiles</h2>
              <p style={{ color: '#6b7280', marginBottom: 0 }}>
                Create and manage browser profiles.
              </p>
            </div>

            <button
              style={{ ...buttonStyle, background: '#059669' }}
              onClick={() => void refreshProfiles()}
              disabled={busy}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <form
            onSubmit={event => {
              event.preventDefault()
              void saveProfile()
            }}
            style={{
              display: 'grid',
              gap: 16,
              marginTop: 22,
              padding: 16,
              background: '#f8faff',
              borderRadius: 14,
              border: '1px solid #e5e7eb'
            }}
          >
            <h3 style={{ margin: 0 }}>
              {editingId ? 'Edit profile settings' : 'Create a new profile'}
            </h3>

            <div>
              <label style={labelStyle}>Profile name</label>
              <input
                style={inputStyle}
                value={profileName}
                onChange={event => setProfileName(event.target.value)}
                maxLength={60}
                placeholder="e.g. Work profile"
                aria-label="Profile name"
              />
            </div>

            <div>
              <label style={labelStyle}>
                <Smartphone
                  size={15}
                  style={{ verticalAlign: 'middle' }}
                />{' '}
                User-Agent mode
              </label>

              <select
                style={inputStyle}
                value={uaMode}
                onChange={event => setUaMode(event.target.value)}
              >
                <option value="default">
                  Automatic — use browser default
                </option>
                <option value="windows">Desktop — Windows / Chrome</option>
                <option value="macos">Desktop — macOS / Chrome</option>
                <option value="linux">Desktop — Linux / Chrome</option>
                <option value="android">Mobile — Android / Chrome</option>
                <option value="iphone">Mobile — iPhone / Safari</option>
                <option value="ipad">Tablet — iPad / Safari</option>
                <option value="custom">Custom User-Agent</option>
              </select>
            </div>

            {uaMode === 'custom' && (
              <div>
                <label style={labelStyle}>
                  Custom User-Agent string
                </label>
                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: 94,
                    resize: 'vertical'
                  }}
                  value={customUA}
                  onChange={event => setCustomUA(event.target.value)}
                  placeholder="Paste the complete User-Agent string here"
                />
                <small style={{ color: '#6b7280' }}>
                  This changes the User-Agent header, not the complete
                  device fingerprint.
                </small>
              </div>
            )}

            <div
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: 16
              }}
            >
              <label style={labelStyle}>
                <Network
                  size={15}
                  style={{ verticalAlign: 'middle' }}
                />{' '}
                Proxy / IP routing
              </label>

              <select
                style={inputStyle}
                value={proxy.type}
                onChange={event =>
                  setProxy(p => ({
                    ...p,
                    type: event.target.value as ProxyConfig['type']
                  }))
                }
              >
                <option value="direct">
                  Direct connection — no proxy
                </option>
                <option value="http">HTTP proxy</option>
                <option value="socks5">SOCKS5 proxy</option>
              </select>
            </div>

            {proxy.type !== 'direct' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12
                  }}
                >
                  <div>
                    <label style={labelStyle}>Proxy host / IP</label>
                    <input
                      style={inputStyle}
                      value={proxy.host}
                      onChange={event =>
                        setProxy(p => ({
                          ...p,
                          host: event.target.value
                        }))
                      }
                      placeholder="proxy.example.com"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Port</label>
                    <input
                      style={inputStyle}
                      inputMode="numeric"
                      value={proxy.port}
                      onChange={event =>
                        setProxy(p => ({
                          ...p,
                          port: event.target.value
                        }))
                      }
                      placeholder="8080"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: 12
                  }}
                >
                  <div>
                    <label style={labelStyle}>
                      Username (optional)
                    </label>
                    <input
                      style={inputStyle}
                      autoComplete="off"
                      value={proxy.username}
                      onChange={event =>
                        setProxy(p => ({
                          ...p,
                          username: event.target.value
                        }))
                      }
                      placeholder="Proxy username"
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Password (optional)
                    </label>
                    <input
                      style={inputStyle}
                      type="password"
                      autoComplete="new-password"
                      value={proxy.password}
                      onChange={event =>
                        setProxy(p => ({
                          ...p,
                          password: event.target.value
                        }))
                      }
                      placeholder="Proxy password"
                    />
                  </div>
                </div>
              </>
            )}

            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap'
              }}
            >
              <button
                type="submit"
                style={buttonStyle}
                disabled={busy}
              >
                <Plus size={17} />
                {editingId ? 'Save settings' : 'Create profile'}
              </button>

              {editingId && (
                <button
                  type="button"
                  style={{ ...buttonStyle, background: '#64748b' }}
                  onClick={resetForm}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          {loadingProfiles ? (
            <p>Loading profiles...</p>
          ) : profiles.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 12px',
                border: '1px dashed #cbd5e1',
                borderRadius: 12,
                marginTop: 18
              }}
            >
              <CircleUserRound
                size={36}
                color="#64748b"
                style={{ margin: '0 auto' }}
              />
              <h3>No profiles yet</h3>
              <p style={{ color: '#6b7280' }}>
                Create your first profile above.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 12,
                marginTop: 20
              }}
            >
              {profiles.map((profile, index) => (
                <div
                  key={profile.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: 14,
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    background: '#fafbff'
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: '#ede9fe',
                      color: '#4f46e5',
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <Globe size={21} />
                  </div>

                  <div
                    style={{
                      flex: '1 1 180px',
                      minWidth: 0
                    }}
                  >
                    <strong>{profile.name}</strong>
                    <div
                      style={{
                        color: '#6b7280',
                        fontSize: 12,
                        marginTop: 4
                      }}
                    >
                      Profile {String(index + 1).padStart(2, '0')} ·{' '}
                      {profile.proxy?.type ?? 'direct'} proxy ·{' '}
                      {profile.userAgent ? 'Custom UA/preset' : 'Default UA'}
                    </div>
                    <div
                      style={{
                        color: '#6b7280',
                        fontSize: 12,
                        marginTop: 3
                      }}
                    >
                      Created{' '}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    style={buttonStyle}
                    onClick={() => void openProfile(profile)}
                    disabled={busy}
                  >
                    <Play size={15} /> Open
                  </button>

                  <button
                    style={{ ...buttonStyle, background: '#0f766e' }}
                    onClick={() => editProfile(profile)}
                    disabled={busy}
                  >
                    <Settings2 size={15} /> Settings
                  </button>

                  <button
                    style={{
                      ...buttonStyle,
                      background: '#fff',
                      color: '#b91c1c',
                      border: '1px solid #fecaca'
                    }}
                    onClick={() => void deleteProfile(profile)}
                    disabled={busy}
                    aria-label={`Delete ${profile.name}`}
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="privacy" style={cardStyle}>
          <h2>
            <ShieldCheck size={20} /> Security and privacy
          </h2>

          <p style={{ color: '#6b7280' }}>
            Each profile uses its own persistent browser session.
            Proxy credentials are currently stored locally in the
            profile configuration file. Do not use sensitive passwords
            until secure credential storage is added.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }}
          >
            <LockKeyhole size={17} color="#059669" />
            <span>
              Context isolation and renderer sandbox are enabled.
            </span>
          </div>

          <p>
            <a
              href="https://www.electronjs.org/docs/latest/tutorial/security"
              target="_blank"
              rel="noreferrer"
            >
              Electron security guidance <ExternalLink size={13} />
            </a>
          </p>
        </section>

        {notice && (
          <div
            role="status"
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 10,
              background: '#eef2ff',
              color: '#3730a3',
              overflowWrap: 'anywhere'
            }}
          >
            {notice}
          </div>
        )}

        <footer>
          <span>© {new Date().getFullYear()} Up Network Browser</span>
          <span>
            <i className="footer-dot" /> Development preview
          </span>
        </footer>
      </main>
    </div>
  )
}