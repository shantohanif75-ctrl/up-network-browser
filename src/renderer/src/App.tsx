import { useEffect, useState } from 'react'
import {
  ShieldCheck, Globe, Plus, ArrowRight, Settings2, Shield,
  LockKeyhole, ExternalLink, CircleUserRound, Trash2,
  RefreshCw, Play, Users, Network, Smartphone, Zap,
  Monitor, Activity, ChevronRight
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
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
}

declare global {
  interface Window {
    upNetwork: {
      openUrl: (url: string, profileId?: string) => Promise<{
        opened: boolean
        url?: string
        profileId?: string
      }>
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

const styles = `
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #eaf0ff;
  background: #070b17;
  font-synthesis: none;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: #070b17; }
button, input, select, textarea { font: inherit; }
button { transition: transform .15s, opacity .15s, border-color .15s; }
button:hover { transform: translateY(-1px); }
button:disabled { opacity: .55; cursor: not-allowed; transform: none; }
.app-shell { min-height: 100vh; background: radial-gradient(ellipse at 75% 0%, #14234a 0%, #090e1e 38%, #070b17 75%); }
.sidebar { width: 248px; padding: 22px 14px; background: rgba(7,12,27,.94); border-right: 1px solid #202944; position: fixed!important; inset: 0 auto 0 0; overflow-y: auto; z-index: 2; }
.brand { display:flex; align-items:center; gap:12px; padding: 0 8px 24px; }
.brand-mark { display:grid; place-items:center; width:46px; height:46px; border-radius:14px; color:#fff; background:linear-gradient(140deg,#22d3ee,#2563eb 55%,#6d5dfc); box-shadow:0 8px 28px #2563eb35; font-size:20px; font-weight:900; }
.brand-copy strong { display:block; font-size:16px; letter-spacing:-.3px; }
.brand-copy span { display:block; margin-top:4px; color:#6ea5ff; font-size:10px; font-weight:800; letter-spacing:2.6px; }
.workspace { display:flex; align-items:center; gap:9px; padding:13px 10px; margin-bottom:25px; border:1px solid #253253; background:#101a32; border-radius:12px; font-size:11px; }
.workspace-dot { width:8px; height:8px; flex-shrink:0; border-radius:50%; background:#34d399; box-shadow:0 0 12px #34d399; }
.workspace div { flex:1; min-width:0; }
.workspace b,.workspace small { display:block; }
.workspace small { margin-top:4px; color:#8391b2; }
.nav-label { padding:0 10px 10px; font-size:10px; color:#697897; font-weight:800; letter-spacing:1.7px; }
.nav-item { display:flex; align-items:center; gap:11px; padding:12px 11px; margin:4px 0; border-radius:10px; text-decoration:none; color:#aab6d2; font-size:13px; }
.nav-item.active { color:#fff; background:linear-gradient(100deg,#2456d7,#4434a9); box-shadow:0 7px 24px #2649bb30; }
.nav-item:hover { background:#172441; color:#fff; }
.soon { margin-left:auto; font-size:11px; color:#8fbaff; }
.sidebar-bottom { display:flex; gap:10px; align-items:center; margin:35px 4px 15px; padding:13px 10px; border-top:1px solid #202944; color:#c8d4ef; font-size:12px; }
.privacy-icon { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; background:#10382f; color:#5eeac0; }
.sidebar-bottom b,.sidebar-bottom small { display:block; }
.sidebar-bottom small { margin-top:4px; color:#7d8baa; font-size:10px; }
.creator { margin-top:20px; padding:14px 8px; border:1px solid #234b85; border-radius:13px; text-align:center; background:linear-gradient(145deg,#101c37,#0a1022); }
.creator-mark { font-size:23px; font-weight:900; color:#22d3ee; }
.creator-label { margin-top:3px; font-size:9px; font-weight:800; letter-spacing:2px; color:#8bbdff; }
.creator-name { margin-top:5px; font-size:10px; font-weight:800; line-height:1.6; overflow-wrap:anywhere; }
.main { margin-left:248px; min-width:0; padding:0 30px 25px; }
.topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; min-height:72px; border-bottom:1px solid #202944; }
.crumb { font-size:12px; color:#8795b4; }
.crumb span { padding:0 8px; color:#4b5b7c; }
.top-right { display:flex; align-items:center; gap:15px; }
.status { display:flex; align-items:center; gap:7px; font-size:11px; color:#a4b3d1; }
.status i,.footer-dot { width:7px; height:7px; border-radius:50%; display:inline-block; background:#34d399; }
.avatar { display:grid; place-items:center; width:34px; height:34px; border:1px solid #3b62a5; border-radius:11px; background:#13294b; color:#a9d7ff; font-size:11px; font-weight:900; }
.welcome { display:flex; align-items:center; justify-content:space-between; gap:20px; min-height:210px; padding:25px 0; }
.eyebrow { display:flex; align-items:center; gap:8px; color:#6ecbff; font-size:10px; font-weight:800; letter-spacing:2px; }
.eyebrow span { width:7px; height:7px; border-radius:50%; background:#22d3ee; }
.welcome h1 { margin:13px 0 8px; font-size:clamp(27px,4vw,39px); line-height:1.1; letter-spacing:-1.5px; color:#fff; }
.welcome p { margin:0; color:#9ba9c8; font-size:13px; line-height:1.7; max-width:520px; }
.hero-art { position:relative; display:grid; place-items:center; flex:0 0 135px; height:135px; border:1px solid #263d6c; border-radius:30px; background:linear-gradient(140deg,#14294b,#17143c); overflow:hidden; }
.hero-shield { display:grid; place-items:center; width:74px; height:74px; border-radius:23px; color:#8ce8ff; background:linear-gradient(145deg,#1b4c83,#252b70); box-shadow:0 0 45px #277aff38; }
.orb { position:absolute; width:85px; height:85px; border:1px solid #3372d6; border-radius:50%; opacity:.3; }
.orb-one { top:-45px; right:-20px; }
.orb-two { bottom:-53px; left:-22px; }
.spark { position:absolute; color:#8deaff; }
.spark-one { top:16px; left:23px; }
.spark-two { right:17px; bottom:17px; }
.stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-bottom:20px; }
.stat-card { position:relative; overflow:hidden; padding:19px; border:1px solid #253253; border-radius:16px; background:linear-gradient(145deg,#121c34,#0d1427); }
.stat-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.stat-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:13px; }
.stat-caption { margin-top:16px; color:#93a2c1; font-size:12px; }
.stat-value { margin-top:6px; color:#f3f6ff; font-size:25px; font-weight:800; letter-spacing:-.6px; }
.stat-note { margin-top:6px; font-size:10px; color:#7183a6; }
.panel { margin-bottom:20px; padding:21px; border:1px solid #253253; border-radius:16px; background:linear-gradient(145deg,rgba(17,27,49,.96),rgba(11,17,32,.96)); box-shadow:0 12px 35px #00000012; }
.panel-head { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.panel h2 { margin:0; font-size:17px; color:#f2f6ff; letter-spacing:-.3px; }
.panel-sub { margin:7px 0 0; color:#8797b8; font-size:12px; line-height:1.6; }
.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:39px; padding:9px 13px; border:1px solid #3c5ec2; border-radius:10px; color:white; background:linear-gradient(120deg,#2563eb,#5145cd); cursor:pointer; font-size:12px; font-weight:700; }
.btn-green { border-color:#167e70; background:linear-gradient(120deg,#087f70,#0e9f85); }
.btn-muted { border-color:#35425f; background:#1a2640; color:#d9e3f8; }
.btn-danger { border-color:#743d51; background:#311c2b; color:#ffb6c6; }
.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:2px solid #5ee5ff; outline-offset:2px; }
.field-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.field { min-width:0; }
.field label { display:block; margin-bottom:7px; color:#c0cce5; font-size:12px; font-weight:700; }
.field input,.field select,.field textarea,.quick-input { display:block; width:100%; min-width:0; border:1px solid #34415e; border-radius:10px; padding:11px 12px; color:#edf3ff; background:#0a1224; outline:none; font-size:12px; }
.field input::placeholder,.field textarea::placeholder,.quick-input::placeholder { color:#657493; }
.field select option { background:#101a31; color:#fff; }
.field textarea { min-height:85px; resize:vertical; }
.form-box { display:grid; gap:16px; margin-top:20px; padding:17px; border:1px solid #263653; border-radius:13px; background:#0b1326; }
.form-title { margin:0; color:#dce7ff; font-size:14px; }
.form-actions { display:flex; flex-wrap:wrap; gap:9px; }
.quick-row { display:flex; flex-wrap:wrap; gap:10px; margin-top:16px; }
.quick-input { flex:1 1 240px; }
.profile-list { display:grid; gap:11px; margin-top:20px; }
.profile-item { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:14px; border:1px solid #283654; border-radius:13px; background:#0c1529; }
.profile-icon { display:grid; place-items:center; flex:0 0 42px; height:42px; border-radius:12px; color:#80dcff; background:#142d50; }
.profile-info { flex:1 1 160px; min-width:0; }
.profile-name { color:#f0f5ff; font-size:13px; font-weight:800; overflow-wrap:anywhere; }
.profile-meta { margin-top:5px; color:#8595b5; font-size:10px; line-height:1.6; overflow-wrap:anywhere; }
.empty-state { margin-top:18px; padding:30px 12px; text-align:center; border:1px dashed #354665; border-radius:13px; color:#8495b6; }
.empty-state h3 { color:#d9e4fb; font-size:15px; }
.notice { margin:15px 0; padding:13px 14px; border:1px solid #315a86; border-radius:11px; color:#bdeaff; background:#102540; font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
.notice.error { border-color:#793b4b; color:#ffc2ce; background:#301a28; }
.notice.success { border-color:#23695d; color:#a7f3d0; background:#102b2a; }
.security-row { display:flex; align-items:flex-start; gap:10px; color:#9baaca; font-size:12px; line-height:1.7; }
.security-row svg { flex-shrink:0; margin-top:2px; color:#59dfb1; }
.security-link { display:inline-flex; align-items:center; gap:5px; color:#7bc8ff; font-size:12px; text-decoration:none; }
footer { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:17px 2px 5px; color:#667694; font-size:10px; }
footer span:last-child { display:flex; align-items:center; gap:7px; }
@media(max-width:900px) {
  .sidebar { width:205px; }
  .main { margin-left:205px; padding:0 18px 22px; }
  .stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .hero-art { flex-basis:100px; height:100px; }
  .hero-shield { width:60px; height:60px; }
}
@media(max-width:650px) {
  .sidebar { position:relative!important; inset:auto; width:auto; min-height:0!important; padding:12px; border-right:0; border-bottom:1px solid #202944; }
  .brand { padding-bottom:12px; }
  .workspace { margin-bottom:10px; }
  .nav-label { padding-top:8px; }
  .nav-item { display:inline-flex; padding:9px; margin:2px; font-size:11px; }
  .sidebar-bottom { display:none; }
  .creator { margin-top:12px; }
  .main { margin-left:0; padding:0 13px 20px; }
  .topbar { min-height:58px; }
  .welcome { min-height:170px; }
  .hero-art { display:none; }
  .stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .stat-card { padding:14px; }
  .stat-value { font-size:22px; }
  .panel { padding:15px; }
  .field-grid { grid-template-columns:1fr; }
}
@media(max-width:380px) {
  .stats { grid-template-columns:1fr; }
  .top-right .status { display:none; }
}
`

export default function App() {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([])
  const [profileName, setProfileName] = useState('')
  const [address, setAddress] = useState('https://example.com')
  const [uaMode, setUaMode] = useState('default')
  const [customUA, setCustomUA] = useState('')
  const [proxy, setProxy] = useState<ProxyConfig>(emptyProxy())
  const [notice, setNotice] = useState('')
  const [noticeType, setNoticeType] = useState<'info' | 'error' | 'success'>('info')
  const [busy, setBusy] = useState(false)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  function message(text: string, type: 'info' | 'error' | 'success' = 'info') {
    setNotice(text)
    setNoticeType(type)
  }

  async function refreshProfiles() {
    try {
      const result = await window.upNetwork.listProfiles()
      setProfiles(Array.isArray(result) ? result : [])
    } catch (error) {
      message(error instanceof Error ? error.message : 'Could not load profiles.', 'error')
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
    return uaMode === 'custom' ? customUA.trim() : (uaPresets[uaMode] ?? '')
  }

  async function saveProfile() {
    const name = profileName.trim()

    if (!editingId && !name) {
      message('Please enter a profile name.', 'error')
      return
    }
    if (uaMode === 'custom' && !customUA.trim()) {
      message('Enter a custom User-Agent or choose a preset.', 'error')
      return
    }
    if (proxy.type !== 'direct') {
      const portNumber = Number(proxy.port)
      if (!proxy.host.trim() || !proxy.port.trim()) {
        message('Enter the proxy host and port.', 'error')
        return
      }
      if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
        message('Proxy port must be a number between 1 and 65535.', 'error')
        return
      }
    }

    setBusy(true)
    setNotice('')
    try {
      const userAgent = selectedUserAgent()
      let saved: BrowserProfile

      if (editingId) {
        saved = await window.upNetwork.updateProfileSettings(editingId, { userAgent, proxy })
        setProfiles(current => current.map(p => p.id === saved.id ? saved : p))
        message(`Settings saved for "${saved.name}".`, 'success')
      } else {
        saved = await window.upNetwork.createProfile({ name, userAgent, proxy })
        setProfiles(current => [...current, saved])
        message(`Profile "${saved.name}" created.`, 'success')
      }
      resetForm()
    } catch (error) {
      message(error instanceof Error ? error.message : 'Could not save profile.', 'error')
    } finally {
      setBusy(false)
    }
  }

  function editProfile(profile: BrowserProfile) {
    setEditingId(profile.id)
    setProfileName(profile.name)
    setProxy(profile.proxy ?? emptyProxy())

    const match = Object.entries(uaPresets).find(
      ([key, value]) => key !== 'default' && value === profile.userAgent
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

    message(`Editing settings for "${profile.name}".`)
    document.getElementById('profile-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function openProfile(profile: BrowserProfile) {
    setBusy(true)
    setNotice('')
    try {
      await window.upNetwork.openProfile(profile.id)
      message(`Opened profile "${profile.name}".`, 'success')
    } catch (error) {
      message(error instanceof Error ? error.message : 'Could not open profile.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProfile(profile: BrowserProfile) {
    const confirmed = window.confirm(
      `Remove "${profile.name}" from the profile list?\n\nStored browser data may remain on this device.`
    )
    if (!confirmed) return

    setBusy(true)
    setNotice('')
    try {
      await window.upNetwork.deleteProfile(profile.id, true)
      setProfiles(current => current.filter(p => p.id !== profile.id))
      if (editingId === profile.id) resetForm()
      message(`Removed "${profile.name}" from the list. Check the app's storage behavior before assuming its browser data was erased.`, 'success')
    } catch (error) {
      message(error instanceof Error ? error.message : 'Could not delete profile.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function openWebsite() {
    const target = address.trim()
    if (!target) {
      message('Enter a website address first.', 'error')
      return
    }

    setBusy(true)
    setNotice('')
    try {
      const result = await window.upNetwork.openUrl(target)
      message(`Opened ${result.url ?? target} in a browser window.`, 'success')
    } catch (error) {
      message(error instanceof Error ? error.message : 'Could not open website.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">UN</div>
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
          <a className="nav-item active" href="#overview"><Globe size={17} /> Overview</a>
          <a className="nav-item" href="#profiles">
            <CircleUserRound size={17} /> Profiles <span className="soon">{profiles.length}</span>
          </a>
          <a className="nav-item" href="#privacy"><Shield size={17} /> Protection</a>

          <div className="sidebar-bottom">
            <div className="privacy-icon"><LockKeyhole size={17} /></div>
            <div>
              <b>Privacy first</b>
              <small>Separate profile sessions</small>
            </div>
          </div>

          <div className="creator">
            <div className="creator-mark">SH</div>
            <div className="creator-label">CREATED BY</div>
            <div className="creator-name">SHANTO HANIF ISLAM</div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="crumb">Workspace <span>/</span> Overview</div>
            <div className="top-right">
              <span className="status"><i /> Browser workspace</span>
              <div className="avatar">UN</div>
            </div>
          </header>

          <section className="welcome" id="overview">
            <div>
              <div className="eyebrow"><span /> YOUR BROWSER WORKSPACE</div>
              <h1>Browse your way.</h1>
              <p>Manage browser profiles, session settings, User-Agent preferences and proxy connections in one workspace.</p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orb orb-one" />
              <div className="orb orb-two" />
              <div className="hero-shield"><ShieldCheck size={43} /></div>
              <div className="spark spark-one">✦</div>
              <div className="spark spark-two">✧</div>
            </div>
          </section>

          <section className="stats">
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon" style={{ color: '#9eaeff', background: '#242858' }}>
                  <Users size={21} />
                </div>
                <Activity size={17} color="#7486ad" />
              </div>
              <div className="stat-caption">Total profiles</div>
              <div className="stat-value">{profiles.length}</div>
              <div className="stat-note">Saved browser profiles</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon" style={{ color: '#67e8c1', background: '#123b3a' }}>
                  <Globe size={21} />
                </div>
                <Zap size={17} color="#67e8c1" />
              </div>
              <div className="stat-caption">Session storage</div>
              <div className="stat-value" style={{ fontSize: 22 }}>Persistent</div>
              <div className="stat-note">Depends on profile session setup</div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon" style={{ color: '#ffc875', background: '#44301e' }}>
                  <ShieldCheck size={21} />
                </div>
                <Monitor size={17} color="#ffc875" />
              </div>
              <div className="stat-caption">Profile isolation</div>
              <div className="stat-value" style={{ fontSize: 22 }}>Per profile</div>
              <div className="stat-note">Not a complete anti-detect fingerprint</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2><ArrowRight size={18} style={{ verticalAlign: 'middle', marginRight: 7 }} />Quick browse</h2>
                <p className="panel-sub">Open a website in a browser window.</p>
              </div>
            </div>
            <div className="quick-row">
              <input
                className="quick-input"
                aria-label="Website address"
                value={address}
                onChange={event => setAddress(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void openWebsite()
                }}
                placeholder="https://example.com"
              />
              <button className="btn" onClick={() => void openWebsite()} disabled={busy}>
                <ArrowRight size={16} /> Open website
              </button>
            </div>
          </section>

          <section id="profiles" className="panel">
            <div className="panel-head">
              <div>
                <h2><CircleUserRound size={19} style={{ verticalAlign: 'middle', marginRight: 7 }} />My Profiles</h2>
                <p className="panel-sub">Create and manage your browser profiles.</p>
              </div>
              <button className="btn btn-muted" onClick={() => void refreshProfiles()} disabled={busy}>
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            <form
              id="profile-form"
              className="form-box"
              onSubmit={event => {
                event.preventDefault()
                void saveProfile()
              }}
            >
              <h3 className="form-title">{editingId ? 'Edit profile settings' : 'Create a new profile'}</h3>

              <div className="field">
                <label htmlFor="profile-name">Profile name</label>
                <input
                  id="profile-name"
                  value={profileName}
                  onChange={event => setProfileName(event.target.value)}
                  maxLength={60}
                  placeholder="e.g. Work profile"
                  disabled={Boolean(editingId)}
                />
                {editingId && <small style={{ display: 'block', marginTop: 6, color: '#8293b5' }}>Profile name editing is not available through the current backend API.</small>}
              </div>

              <div className="field">
                <label htmlFor="ua-mode"><Smartphone size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />User-Agent mode</label>
                <select id="ua-mode" value={uaMode} onChange={event => setUaMode(event.target.value)}>
                  <option value="default">Automatic — browser default</option>
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
                <div className="field">
                  <label htmlFor="custom-ua">Custom User-Agent string</label>
                  <textarea
                    id="custom-ua"
                    value={customUA}
                    onChange={event => setCustomUA(event.target.value)}
                    placeholder="Paste a complete User-Agent string"
                  />
                  <small style={{ display: 'block', marginTop: 6, color: '#8293b5' }}>
                    This changes the User-Agent string only. It does not change every browser fingerprint signal.
                  </small>
                </div>
              )}

              <div className="field">
                <label htmlFor="proxy-type"><Network size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Proxy connection</label>
                <select
                  id="proxy-type"
                  value={proxy.type}
                  onChange={event => setProxy(p => ({
                    ...p,
                    type: event.target.value as ProxyConfig['type']
                  }))}
                >
                  <option value="direct">Direct connection — no proxy</option>
                  <option value="http">HTTP proxy</option>
                  <option value="socks5">SOCKS5 proxy</option>
                </select>
              </div>

              {proxy.type !== 'direct' && (
                <>
                  <div className="field-grid">
                    <div className="field">
                      <label htmlFor="proxy-host">Proxy host / IP</label>
                      <input
                        id="proxy-host"
                        value={proxy.host}
                        onChange={event => setProxy(p => ({ ...p, host: event.target.value }))}
                        placeholder="proxy.example.com"
                        autoComplete="off"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="proxy-port">Proxy port</label>
                      <input
                        id="proxy-port"
                        inputMode="numeric"
                        value={proxy.port}
                        onChange={event => setProxy(p => ({ ...p, port: event.target.value }))}
                        placeholder="8080"
                      />
                    </div>
                  </div>
                  <div className="field-grid">
                    <div className="field">
                      <label htmlFor="proxy-username">Username (optional)</label>
                      <input
                        id="proxy-username"
                        autoComplete="off"
                        value={proxy.username}
                        onChange={event => setProxy(p => ({ ...p, username: event.target.value }))}
                        placeholder="Proxy username"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="proxy-password">Password (optional)</label>
                      <input
                        id="proxy-password"
                        type="password"
                        autoComplete="new-password"
                        value={proxy.password}
                        onChange={event => setProxy(p => ({ ...p, password: event.target.value }))}
                        placeholder="Proxy password"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="submit" className="btn" disabled={busy}>
                  <Plus size={16} /> {busy ? 'Please wait...' : editingId ? 'Save settings' : 'Create profile'}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-muted" onClick={resetForm}>
                    Cancel edit
                  </button>
                )}
              </div>
            </form>

            {loadingProfiles ? (
              <div className="empty-state"><RefreshCw size={26} /><p>Loading profiles…</p></div>
            ) : profiles.length === 0 ? (
              <div className="empty-state">
                <CircleUserRound size={35} />
                <h3>No profiles yet</h3>
                <p>Create your first browser profile above.</p>
              </div>
            ) : (
              <div className="profile-list">
                {profiles.map((profile, index) => (
                  <div key={profile.id} className="profile-item">
                    <div className="profile-icon"><Globe size={21} /></div>
                    <div className="profile-info">
                      <div className="profile-name">{profile.name}</div>
                      <div className="profile-meta">
                        Profile {String(index + 1).padStart(2, '0')} · {(profile.proxy?.type ?? 'direct').toUpperCase()} proxy · {profile.userAgent ? 'Custom/preset UA' : 'Default UA'}
                      </div>
                      <div className="profile-meta">
                        Created {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Date unavailable'}
                      </div>
                    </div>
                    <button className="btn" onClick={() => void openProfile(profile)} disabled={busy}>
                      <Play size={14} /> Open
                    </button>
                    <button className="btn btn-green" onClick={() => editProfile(profile)} disabled={busy}>
                      <Settings2 size={14} /> Settings
                    </button>
                    <button className="btn btn-danger" onClick={() => void deleteProfile(profile)} disabled={busy} aria-label={`Delete ${profile.name}`}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section id="privacy" className="panel">
            <h2><ShieldCheck size={19} style={{ verticalAlign: 'middle', marginRight: 7 }} />Security and privacy</h2>
            <p className="panel-sub" style={{ marginBottom: 16 }}>
              Each profile should use its own persistent browser session. Actual session isolation and proxy behavior depend on the Electron main-process implementation.
            </p>
            <div className="security-row">
              <LockKeyhole size={17} />
              <span>Use a separate session partition for each profile. Avoid sharing sensitive proxy passwords on untrusted devices.</span>
            </div>
            <p style={{ marginBottom: 0, marginTop: 14 }}>
              <a className="security-link" href="https://www.electronjs.org/docs/latest/tutorial/security" target="_blank" rel="noreferrer">
                Electron security guidance <ExternalLink size={13} />
              </a>
            </p>
          </section>

          {notice && (
            <div role="status" aria-live="polite" className={`notice ${noticeType === 'error' ? 'error' : noticeType === 'success' ? 'success' : ''}`}>
              {notice}
            </div>
          )}

          <footer>
            <span>© {new Date().getFullYear()} Up Network Browser</span>
            <span><i className="footer-dot" /> Browser workspace</span>
            <span><ChevronRight size={12} /> Created by Shanto Hanif Islam</span>
          </footer>
        </main>
      </div>
    </>
  )
}