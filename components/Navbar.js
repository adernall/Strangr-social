// components/Navbar.js
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const moreRef = useRef()
  const searchRef = useRef()

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSearch(q) {
    setSearchQuery(q)
    if (!q.trim()) return setSearchResults([])
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .ilike('username', `%${q}%`)
      .limit(6)
    setSearching(false)
    setSearchResults(data || [])
  }

  function requireAuth(path) {
    if (!user) {
      router.push('/?auth=login')
    } else {
      router.push(path)
    }
  }

  const isActive = (path) => pathname === path

  return (
    <nav className={styles.nav}>
      {/* Logo */}
      <span className={styles.logo} onClick={() => router.push('/')}>strangr</span>

      {/* Center links */}
      <div className={styles.centerLinks}>
        <span
          className={`${styles.link} ${isActive('/about') ? styles.activeLink : ''}`}
          onClick={() => router.push('/about')}
        >
          About
        </span>
        <span
          className={`${styles.link} ${isActive('/how-it-works') ? styles.activeLink : ''}`}
          onClick={() => router.push('/how-it-works')}
        >
          How it works
        </span>
        <span
          className={`${styles.link} ${isActive('/support') ? styles.activeLink : ''}`}
          onClick={() => router.push('/support')}
        >
          Support
        </span>

        {/* More dropdown */}
        <div className={styles.dropItem} onClick={() => { router.push('/friends'); setMoreOpen(false) }}>
  Friends
</div>
        <div className={styles.moreWrap} ref={moreRef}>
          <span className={styles.link} onClick={() => setMoreOpen(!moreOpen)}>
            More {moreOpen ? '↑' : '↓'}
          </span>
          {moreOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropItem} onClick={() => { router.push('/about#team'); setMoreOpen(false) }}>
                Our Team
              </div>
              <div className={styles.dropItem} onClick={() => { router.push('/about#mission'); setMoreOpen(false) }}>
                Our Mission
              </div>
              <div className={styles.dropItem} onClick={() => { router.push('/support#faq'); setMoreOpen(false) }}>
                FAQ
              </div>
              <div className={styles.dropDivider} />
              <div className={styles.dropItem} onClick={() => { router.push('/support#contact'); setMoreOpen(false) }}>
                Contact us
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right icons */}
      <div className={styles.rightIcons}>

        {/* Search */}
        <div className={styles.searchWrap} ref={searchRef}>
          <button
            className={styles.iconBtn}
            onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setSearchResults([]) }}
            title="Search users"
          >
            <SearchIcon />
          </button>
          {searchOpen && (
            <div className={styles.searchDropdown}>
              <input
                className={styles.searchInput}
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
              {searching && <p className={styles.searchHint}>Searching…</p>}
              {!searching && searchQuery && searchResults.length === 0 && (
                <p className={styles.searchHint}>No users found.</p>
              )}
              {searchResults.map((u) => (
                <div
                  key={u.username}
                  className={styles.searchResult}
                  onClick={() => {
                    setSearchOpen(false)
                    setSearchQuery('')
                    router.push(`/profile/${u.username}`)
                  }}
                >
                  <div className={styles.resultAvatar}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" className={styles.resultAvatarImg} />
                      : <span>{u.username[0].toUpperCase()}</span>
                    }
                  </div>
                  <span className={styles.resultName}>@{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbox — auth gated */}
        <button
          className={styles.iconBtn}
          onClick={() => requireAuth('/inbox')}
          title="Inbox"
        >
        <button
  className={styles.iconBtn}
  onClick={() => requireAuth('/friends')}
  title="Friends"
>
  <InboxIcon />
</button>

        {/* Profile or login */}
        {user ? (
          <button
            className={styles.iconBtn}
            onClick={() => router.push('/dashboard')}
            title="Profile"
          >
            <ProfileIcon />
          </button>
        ) : (
          <button
            className={styles.loginBtn}
            onClick={() => router.push('/?auth=login')}
          >
            Log in
          </button>
        )}
      </div>
    </nav>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function InboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}