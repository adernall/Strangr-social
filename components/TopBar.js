'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import NotificationBell from './notifications/NotificationBell'
import styles from './TopBar.module.css'

export default function TopBar() {
  const { user } = useAuth()
  const router   = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profile, setProfile]   = useState(null)

  async function loadProfile() {
    if (!user || profile) return
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

  return (
    <header className={styles.topbar}>
      {/* Logo */}
      <button className={styles.logo} onClick={() => router.push('/')}>Strangr</button>

      {/* Search */}
      <button className={styles.searchBtn} onClick={() => router.push('/search')}>
        <SearchIcon />
        <span className={styles.searchPlaceholder}>Search...</span>
      </button>

      {/* Right side */}
      <div className={styles.right}>
        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        {user ? (
          <div
            className={styles.profileWrap}
            onMouseEnter={loadProfile}
          >
            <button
              className={styles.profileBtn}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className={styles.profileAvatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className={styles.profileAvatarImg} />
                  : <span>{(user.email || '?')[0].toUpperCase()}</span>
                }
              </div>
              <ChevronIcon />
            </button>

            {menuOpen && (
              <div className={styles.dropdown} onClick={() => setMenuOpen(false)}>
                <div className={styles.dropUser}>
                  <p className={styles.dropUsername}>@{profile?.username || user.email}</p>
                  {profile?.rank_name && <p className={styles.dropRank}>{profile.rank_name}</p>}
                </div>
                <div className={styles.dropDivider} />
                <button className={styles.dropItem} onClick={() => router.push(`/profile/${profile?.username}`)}>
                  <UserIcon /> View Profile
                </button>
                <button className={styles.dropItem} onClick={() => router.push('/rank')}>
                  <StarIcon /> Rank & Trace
                </button>
                <button className={styles.dropItem} onClick={() => router.push('/dashboard')}>
                  <SettingsIcon /> Settings
                </button>
                <div className={styles.dropDivider} />
                <button className={`${styles.dropItem} ${styles.dropLogout}`} onClick={handleLogout}>
                  <LogoutIcon /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className={styles.loginBtn} onClick={() => router.push('/?auth=login')}>
            Log in
          </button>
        )}
      </div>
    </header>
  )
}

function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ChevronIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg> }
function UserIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function StarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function SettingsIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
function LogoutIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
