import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const PRIMARY_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/progression', label: 'Progress' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/journal', label: 'Journal' },
]

const LOG_LINK = { to: '/log', label: 'Log Workout' }

const SECONDARY_LINKS = [
  { to: '/scores', label: 'Scores' },
  { to: '/achievements', label: 'Character' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/frequency', label: 'Frequency' },
  { to: '/amrap', label: 'AMRAP' },
  { to: '/tonnage', label: 'Tonnage' },
  { to: '/bodyweight', label: 'Bodyweight' },
  { to: '/muscles', label: 'Muscles' },
  { to: '/overall', label: 'Overall' },
  { to: '/goals', label: 'Goals' },
]

export default function NavBar() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  useEffect(() => { setMobileOpen(false); setMoreOpen(false) }, [location.pathname])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">IronLogs</Link>

        <div className="navbar-links">
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={`navbar-link${isActive(link.to) ? ' active' : ''}`}>{link.label}</Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className={`navbar-link border-none bg-transparent cursor-pointer font-inherit${SECONDARY_LINKS.some((l) => isActive(l.to)) ? ' active' : ''}`}
            >
              More ▾
            </button>
            {moreOpen && (
              <div className="absolute top-full right-0 mt-1 rounded-md p-1 min-w-[150px] z-200 shadow-lg border border-border bg-bg-card-solid">
                {SECONDARY_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMoreOpen(false)}
                    className={`navbar-link block py-1.5 px-3 text-sm${isActive(link.to) ? ' active' : ''}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link to={LOG_LINK.to} className="navbar-log-btn">{LOG_LINK.label}</Link>
        </div>

        <button className="navbar-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
      </nav>

      <div className={`navbar-mobile-menu${mobileOpen ? ' open' : ''}`}>
        <div className="navbar-mobile-header">
          <Link to="/" className="navbar-brand" onClick={() => setMobileOpen(false)}>IronLogs</Link>
          <button className="navbar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>
        </div>
        <div className="navbar-mobile-links">
          <div style={{ padding: '0.75rem 1.5rem' }}>
            <Link to={LOG_LINK.to} className="navbar-log-btn" style={{ display: 'block', textAlign: 'center' }} onClick={() => setMobileOpen(false)}>{LOG_LINK.label}</Link>
          </div>
          <div className="navbar-mobile-section">Main</div>
          {PRIMARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={`navbar-mobile-link${isActive(link.to) ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>{link.label}</Link>
          ))}
          <div className="navbar-mobile-section">More</div>
          {SECONDARY_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={`navbar-mobile-link${isActive(link.to) ? ' active' : ''}`} onClick={() => setMobileOpen(false)}>{link.label}</Link>
          ))}
        </div>
      </div>
    </>
  )
}
