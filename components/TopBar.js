'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import NotificationBell from './notifications/NotificationBell'
import styles from './TopBar.module.css'

export default function TopBar() {
  const { user } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const menuRef  = useRef()

  const [profile, setProfile]   = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (user) loadProfile()
  }, [user])

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, rank_name')
      .eq('id', user.id)
      .maybeSingle()
    setProfile(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { label: 'Explore', href: '/' },
    { label: 'Messages', href: '/inbox' },
    { label: 'Notifications', href: null }, // handled by bell
  ]

  return (
    <header className={styles.bar}>
      {/* Logo */}
      <div className={styles.logoArea} onClick={() => router.push('/')}>
        <img src="/logo/strangr-logo.png" alt="Strangr" className={styles.logoImg} />
        <span className={styles.logoText}>Strangr</span>
      </div>

      {/* Center nav (desktop) */}
      <nav className={styles.centerNav}>
        <button
          className={`${styles.navLink} ${pathname === '/' || pathname === '/feed' ? styles.navActive : ''}`}
          onClick={() => router.push('/')}
        >
          Explore
        </button>
        <button
          className={`${styles.navLink} ${pathname.startsWith('/inbox') ? styles.navActive : ''}`}
          onClick={() => router.push('/inbox')}
        >
          Messages
        </button>
      </nav>

      {/* Right side */}
      <div className={styles.right}>
        {/* Search */}
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className={styles.searchInput}
            placeholder="Search Strangr..."
            onFocus={() => router.push('/search')}
            readOnly
          />
        </div>

        {/* Create button */}
        {user && (
          <button className={styles.createBtn} onClick={() => router.push('/spaces/create')}>
            Create
          </button>
        )}

        {/* Notification bell */}
        {user && <NotificationBell />}

        {/* Settings icon */}
        <button className={styles.iconBtn} onClick={() => router.push('/dashboard')} title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>

        {/* Avatar / login */}
        {user ? (
          <div className={styles.avatarWrap} ref={menuRef}>
            <button className={styles.avatarBtn} onClick={() => setMenuOpen(!menuOpen)}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
                : <span className={styles.avatarFallback}>{(profile?.username || user.email || 'U')[0].toUpperCase()}</span>
              }
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <div className={styles.menuUser}>
                  <p className={styles.menuUsername}>@{profile?.username}</p>
                  {profile?.rank_name && <p className={styles.menuRank}>{profile.rank_name}</p>}
                </div>
                <div className={styles.menuDivider} />
                <button className={styles.menuItem} onClick={() => { setMenuOpen(false); router.push(`/profile/${profile?.username}`) }}>Profile</button>
                <button className={styles.menuItem} onClick={() => { setMenuOpen(false); router.push('/rank') }}>Rank & Trace</button>
                <button className={styles.menuItem} onClick={() => { setMenuOpen(false); router.push('/dashboard') }}>Settings</button>
                <div className={styles.menuDivider} />
                <button className={`${styles.menuItem} ${styles.menuLogout}`} onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        ) : (
          <button className={styles.loginBtn} onClick={() => router.push('/?auth=login')}>Log in</button>
        )}
      </div>
    </header>
  )
}
