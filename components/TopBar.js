// components/TopBar.js
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './TopBar.module.css'

export default function TopBar() {
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef()

  useEffect(() => {
    if (user) fetchProfile()
  }, [user])

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
    setDropOpen(false)
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left} />

      <span className={styles.logo} onClick={() => router.push('/')}>Strangr</span>

      <div className={styles.right}>
        <button className={styles.iconBtn} onClick={() => router.push('/search')} title="Search">
          <SearchIcon />
        </button>

        {user && profile ? (
          <div className={styles.profileWrap} ref={dropRef} onClick={() => setDropOpen(!dropOpen)}>
            <div className={styles.avatar}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className={styles.avatarImg} />
                : <span>{profile.username?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{profile.username}</span>
              <span className={styles.profileEmail}>{user.email}</span>
            </div>
            <ChevronIcon open={dropOpen} />

            {dropOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropItem} onClick={() => { router.push('/dashboard'); setDropOpen(false) }}>
                  Profile
                </div>
                <div className={styles.dropItem} onClick={() => { router.push('/friends'); setDropOpen(false) }}>
                  Friends
                </div>
                <div className={styles.dropItem} onClick={() => { router.push('/groups'); setDropOpen(false) }}>
                  Groups
                </div>
                <div className={styles.dropDivider} />
                <div className={styles.dropItemDanger} onClick={handleLogout}>
                  Log out
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.anonRight} ref={dropRef}>
            <button className={styles.iconBtn} onClick={() => setDropOpen(!dropOpen)} title="More">
              <ChevronDownIcon />
            </button>
            {dropOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropItem} onClick={() => { router.push('/about'); setDropOpen(false) }}>About</div>
                <div className={styles.dropItem} onClick={() => { router.push('/how-it-works'); setDropOpen(false) }}>How it works</div>
                <div className={styles.dropItem} onClick={() => { router.push('/support'); setDropOpen(false) }}>Support</div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
