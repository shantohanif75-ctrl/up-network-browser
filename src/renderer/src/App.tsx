import { useState } from 'react'
import {
  ShieldCheck, Globe, Plus, ArrowRight, Settings2, Shield,
  LockKeyhole, ExternalLink, Zap, CircleUserRound
} from 'lucide-react'

declare global {
  interface Window {
    upNetwork: {
      openUrl: (url: string) => Promise<{ opened: boolean; url: string }>
    }
  }
}

export default function App() {
  const [address, setAddress] = useState('https://example.com')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function openWebsite() {
    setBusy(true)
    setNotice('')
    try {
      const result = await window.upNetwork.openUrl(address.trim())
      setNotice(`Opened ${result.url} in a separate browser window.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not open website.')
    } finally {
      setBusy(false)
    }
  }

  const planned = (feature: string) => setNotice(`${feature} is planned for the next development step.`)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={24} strokeWidth={2.4} /></div>
          <div className="brand-copy"><strong>Up Network</strong><span>BROWSER</span></div>
        </div>

        <div className="workspace">
          <span className="workspace-dot" />
          <div><b>Personal workspace</b><small>Local profile</small></div>
          <Settings2 size={16} />
        </div>

        <div className="nav-label">YOUR BROWSER</div>
        <button className="nav-item active"><Globe size={18} /> Overview</button>
        <button className="nav-item" onClick={() => planned('Profile manager')}><CircleUserRound size={18} /> Profiles <span className="soon">SOON</span></button>
        <button className="nav-item" onClick={() => planned('Tracker protection')}><Shield size={18} /> Protection <span className="soon">SOON</span></button>
        <button className="nav-item" onClick={() => planned('Proxy settings')}><Settings2 size={18} /> Proxy settings <span className="soon">SOON</span></button>

        <div className="sidebar-bottom">
          <div className="privacy-icon"><LockKeyhole size={17} /></div>
          <div><b>Privacy first</b><small>Local-first design goals</small></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> Overview</div>
          <div className="top-right"><span className="status"><i /> Browser ready</span><div className="avatar">UN</div></div>
        </header>

        <section className="welcome">
          <div>
            <div className="eyebrow"><span /> PRIVATE BY DESIGN</div>
            <h1>Your space to <em>browse freely.</em></h1>
            <p>A cleaner, more private browsing experience starts here.</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orb orb-one" /><div className="orb orb-two" />
            <div className="hero-shield"><ShieldCheck size={48} /></div>
            <div className="spark spark-one">✦</div><div className="spark spark-two">✧</div>
          </div>
        </section>

        <section className="quick-grid">
          <article className="quick-card launch-card">
            <div className="card-icon purple"><Globe size={20} /></div>
            <div className="card-title">Quick browse</div>
            <p>Open a website in a separate secure browser window.</p>
            <div className="address-box">
              <Globe size={17} />
              <input aria-label="Website address" value={address}
                onChange={e => setAddress(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void openWebsite() }}
                placeholder="Enter a website address" />
              <button aria-label="Open website" onClick={() => void openWebsite()} disabled={busy}><ArrowRight size={17} /></button>
            </div>
            {notice && <div className="notice" role="status">{notice}</div>}
          </article>

          <article className="quick-card">
            <div className="card-icon mint"><ShieldCheck size={20} /></div>
            <div className="card-title">Privacy overview</div>
            <p>Security-focused defaults for a safer desktop browser.</p>
            <div className="feature-line"><span className="check"><ShieldCheck size={15} /></span><span>Context isolation</span><b>Enabled</b></div>
            <div className="feature-line"><span className="check"><ShieldCheck size={15} /></span><span>Renderer sandbox</span><b>Enabled</b></div>
          </article>

          <article className="quick-card">
            <div className="card-icon amber"><Zap size={20} /></div>
            <div className="card-title">Coming into focus</div>
            <p>Tools for organizing your browsing, coming soon.</p>
            <div className="feature-line"><span className="feature-dot purple-dot" /><span>Multiple profiles</span><span className="pill">Planned</span></div>
            <div className="feature-line"><span className="feature-dot blue-dot" /><span>Per-profile proxy</span><span className="pill">Planned</span></div>
            <div className="feature-line"><span className="feature-dot green-dot" /><span>Tracker blocking</span><span className="pill">Planned</span></div>
          </article>
        </section>

        <section className="bottom-grid">
          <div className="section-card">
            <div className="section-heading">
              <div><h2>Get started</h2><p>Your browser foundation is ready to explore.</p></div>
              <span className="round-plus"><Plus size={18} /></span>
            </div>
            <div className="start-row"><div className="start-icon"><Globe size={18} /></div><div className="start-copy"><b>Open your first website</b><small>Enter a URL in Quick browse above.</small></div><span className="step-done">01</span></div>
            <div className="start-row"><div className="start-icon"><CircleUserRound size={18} /></div><div className="start-copy"><b>Create separate profiles</b><small>Keep browsing sessions organized.</small></div><span className="step-number">02</span></div>
            <div className="start-row"><div className="start-icon"><Shield size={18} /></div><div className="start-copy"><b>Configure privacy controls</b><small>Review protections and permissions.</small></div><span className="step-number">03</span></div>
          </div>

          <div className="section-card safety-card">
            <div className="safety-top"><div className="card-icon mint"><LockKeyhole size={20} /></div><span className="safe-badge"><i /> Secure defaults</span></div>
            <h2>Built with care.</h2>
            <p>Up Network Browser starts with context isolation, disabled Node integration, and sandboxed renderer processes.</p>
            <div className="safety-footer"><span><ShieldCheck size={16} /> Security baseline</span><a href="https://www.electronjs.org/docs/latest/tutorial/security" target="_blank" rel="noreferrer">Learn more <ExternalLink size={13} /></a></div>
          </div>
        </section>

        <footer><span>© {new Date().getFullYear()} Up Network Browser</span><span><i className="footer-dot" /> Early development preview</span></footer>
      </main>
    </div>
  )
    }
