import { useEffect, useState } from 'react'
import {
  ShieldCheck, Globe, Plus, ArrowRight, Settings2, Shield,
  LockKeyhole, ExternalLink, CircleUserRound, Trash2,
  RefreshCw, Play, Users
} from 'lucide-react'

type BrowserProfile = {
  id: string
  name: string
  createdAt: string
}

declare global {
  interface Window {
    upNetwork: {
      openUrl: (
        url: string,
        profileId?: string
      ) => Promise<{ opened: boolean; url?: string; profileId?: string }>
      listProfiles: () => Promise<BrowserProfile[]>
      createProfile: (name: string) => Promise<BrowserProfile>
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
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  async function refreshProfiles() {
    try {
      const result = await window.upNetwork.listProfiles()
      setProfiles(result)
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

  async function createProfile() {
    const name = profileName.trim()

    if (!name) {
      setNotice('Please enter a profile name.')
      return
    }

    setBusy(true)
    setNotice('')

    try {
      const created = await window.upNetwork.createProfile(name)
      setProfiles(current => [...current, created])
      setProfileName('')
      setNotice(`Profile "${created.name}" created successfully.`)
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not create profile.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function openProfile(profile: BrowserProfile) {
    setBusy(true)
    setNotice('')

    try {
      await window.upNetwork.openProfile(profile.id)
      setNotice(`Opened profile "${profile.name}".`)
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not open profile.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile(profile: BrowserProfile) {
    const confirmed = window.confirm(
      `Delete "${profile.name}" from the profile list?\n\nIts browser data will be retained and will not be automatically erased.`
    )

    if (!confirmed) return

    setBusy(true)
    setNotice('')

    try {
      await window.upNetwork.deleteProfile(profile.id, true)
      setProfiles(current =>
        current.filter(item => item.id !== profile.id)
      )
      setNotice(
        `Profile "${profile.name}" removed. Its stored browser data was not erased.`
      )
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not delete profile.'
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
      setNotice(`Opened ${result.url ?? address} in a browser window.`)
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Could not open website.'
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

  return (
    <div
      className="app-shell"
      style={{ minHeight: '100vh', background: '#f5f7fc', color: '#111827' }}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} strokeWidth={2.4} />
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
          <CircleUserRound size={18} /> Profiles
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
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> Overview</div>
          <div className="top-right">
            <span className="status"><i /> Browser ready</span>
            <div className="avatar">UN</div>
          </div>
        </header>

        <section className="welcome" id="overview">
          <div>
            <div className="eyebrow"><span /> YOUR BROWSER WORKSPACE</div>
            <h1>Browse your way.</h1>
            <p>Create as many profiles as you need and manage them here.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orb orb-one" />
            <div className="orb orb-two" />
            <div className="hero-shield"><ShieldCheck size={48} /></div>
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
            <p style={{ color: '#6b7280', marginBottom: 6 }}>Total profiles</p>
            <h2 style={{ fontSize: 30, margin: 0 }}>{profiles.length}</h2>
          </div>
          <div style={cardStyle}>
            <Globe color="#059669" size={24} />
            <p style={{ color: '#6b7280', marginBottom: 6 }}>Profile storage</p>
            <h2 style={{ fontSize: 20, margin: 0 }}>Persistent</h2>
          </div>
          <div style={cardStyle}>
            <ShieldCheck color="#d97706" size={24} />
            <p style={{ color: '#6b7280', marginBottom: 6 }}>Session isolation</p>
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

        <section id="profiles" style={{ ...cardStyle, marginBottom: 22 }}>
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
                Create and manage profiles whenever you need them.
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
              void createProfile()
            }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 20,
              marginBottom: 20
            }}
          >
            <input
              style={{ ...inputStyle, flex: '1 1 220px' }}
              value={profileName}
              onChange={event => setProfileName(event.target.value)}
              maxLength={60}
              placeholder="New profile name (e.g. Profile 04)"
              aria-label="New profile name"
            />
            <button
              type="submit"
              style={buttonStyle}
              disabled={busy}
            >
              <Plus size={18} /> Create Profile
            </button>
          </form>

          {loadingProfiles ? (
            <p>Loading profiles...</p>
          ) : profiles.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 12px',
                border: '1px dashed #cbd5e1',
                borderRadius: 12
              }}
            >
              <CircleUserRound
                size={36}
                color="#64748b"
                style={{ margin: '0 auto' }}
              />
              <h3>No profiles yet</h3>
              <p style={{ color: '#6b7280' }}>
                Enter a name above and create your first profile.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
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
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <strong>{profile.name}</strong>
                    <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                      Profile {String(index + 1).padStart(2, '0')} · Created{' '}
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
          <h2><ShieldCheck size={20} /> Security and privacy</h2>
          <p style={{ color: '#6b7280' }}>
            Each profile uses its own persistent browser session. Deleting a
            profile from this list does not automatically erase its stored
            browser data.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <LockKeyhole size={17} color="#059669" />
            <span>Context isolation and renderer sandbox are enabled.</span>
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
          <span><i className="footer-dot" /> Development preview</span>
        </footer>
      </main>
    </div>
  )
}