import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const { isDark, toggleTheme }    = useTheme()
  const navigate                   = useNavigate()
  const [menuOpen, setMenuOpen]    = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    setSigningOut(false)
    navigate('/login', { replace: true })
  }

  const navLinkClass = ({ isActive }) =>
    `relative px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
     ${isActive
       ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
       : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
     }`

  const mobileNavLinkClass = ({ isActive }) =>
    `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
     ${isActive
       ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
       : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
     }`

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">

          {/* ── Logo ── */}
          <Link
            to={user ? '/dashboard' : '/login'}
            className="flex items-center gap-2 font-bold text-gray-900 dark:text-white hover:opacity-80 transition"
          >
            <span className="text-xl" aria-hidden="true">🔥</span>
            <span className="hidden sm:inline">StreakTracker</span>
          </Link>

          {/* ── Desktop nav ── */}
          {user && (
            <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
              <NavLink to="/dashboard"   className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/leaderboard" className={navLinkClass}>Leaderboard</NavLink>
            </nav>
          )}

          {/* ── Right controls ── */}
          <div className="flex items-center gap-2">

            {/* Dark-mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-9 h-9 flex items-center justify-center rounded-lg
                         text-gray-500 dark:text-gray-400
                         hover:bg-gray-100 dark:hover:bg-gray-800
                         transition"
            >
              {isDark ? (
                /* Sun */
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              ) : (
                /* Moon */
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {user ? (
              <>
                {/* Avatar + sign-out — desktop */}
                <div className="hidden sm:flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full bg-brand-400 text-white flex items-center justify-center text-sm font-bold select-none"
                    aria-hidden="true"
                  >
                    {(profile?.display_name || profile?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="text-sm font-medium text-gray-500 dark:text-gray-400
                               hover:text-red-500 dark:hover:text-red-400
                               disabled:opacity-50 transition"
                  >
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>

                {/* Hamburger — mobile */}
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={menuOpen}
                  className="sm:hidden w-9 h-9 flex items-center justify-center rounded-lg
                             text-gray-500 dark:text-gray-400
                             hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  {menuOpen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </>
            ) : (
              /* Auth links when logged out */
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 dark:text-gray-300
                             hover:text-gray-900 dark:hover:text-white transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg
                             bg-brand-500 hover:bg-brand-600 text-white transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && user && (
        <div
          className="sm:hidden border-t border-gray-200 dark:border-gray-800
                     bg-white dark:bg-gray-950 px-4 pt-2 pb-4 space-y-1 animate-slide-up"
        >
          {/* User info */}
          <div className="flex items-center gap-2.5 px-4 py-3 mb-1">
            <div className="w-9 h-9 rounded-full bg-brand-400 text-white flex items-center justify-center font-bold text-sm">
              {(profile?.display_name || profile?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {profile?.display_name || 'User'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
                {profile?.email || user.email}
              </p>
            </div>
          </div>

          <NavLink
            to="/dashboard"
            className={mobileNavLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            🏠 Dashboard
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={mobileNavLinkClass}
            onClick={() => setMenuOpen(false)}
          >
            🏆 Leaderboard
          </NavLink>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
            <button
              onClick={() => { setMenuOpen(false); handleSignOut() }}
              disabled={signingOut}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                         text-red-500 dark:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-900/20
                         disabled:opacity-50 transition"
            >
              {signingOut ? 'Signing out…' : '↩ Sign out'}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
