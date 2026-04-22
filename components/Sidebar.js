'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../lib/AuthContext'
import QuickPost from './QuickPost'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const router    = useRouter()
  const pathname  = usePathname()
  const { user }  = useAuth()
  const [showPost, setShowPost] = useState(false)

  const isActive = (path) =>
    path === '/' ? pathname === '/' || pathname === '/feed'
    : pathname.startsWith(path)

  const navItems = [
    { label: 'Home',        path: '/',          icon: <HomeIcon /> },
    { label: 'Communities', path: '/feed',       icon: <GridIcon /> },
    { label: 'Messages',    path: '/inbox',      icon: <ChatIcon /> },
    { label: 'Bookmarks',   path: '/friends',    icon: <BookmarkIcon /> },
    { label: 'Profile',     path: '/dashboard',  icon: <PersonIcon /> },
  ]

  return (
    <>
      <aside className={styles.sidebar}>
        {/* User info at top */}
        {user && (
          <div className={styles.userSection}>
            <UserInfo router={router} />
          </div>
        )}

        {/* Nav links */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.navActive : ''}`}
              onClick={() => router.push(item.path)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom area */}
        <div className={styles.bottom}>
          <button className={styles.newPostBtn} onClick={() => setShowPost(true)}>
            NEW POST
          </button>
          <div className={styles.bottomLinks}>
            <button className={styles.bottomLink} onClick={() => router.push('/about')}>Support</button>
            <button className={styles.bottomLink} onClick={() => {}}>Privacy</button>
          </div>
        </div>
      </aside>

      {showPost && <QuickPost onClose={() => setShowPost(false)} />}
    </>
  )
}

function UserInfo({ router }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)

  // Load profile once
  useState(() => {
    if (!user) return
    import('../lib/supabase').then(({ supabase }) => {
      supabase.from('profiles').select('username, avatar_url, rank_name')
        .eq('id', user.id).maybeSingle()
        .then(({ data }) => setProfile(data))
    })
  })

  return (
    <div className={styles.userInfo} onClick={() => router.push(`/profile/${profile?.username || ''}`)}>
      <div className={styles.userAvatar}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className={styles.userAvatarImg} />
          : <span>{(profile?.username || 'U')[0].toUpperCase()}</span>
        }
      </div>
      <div className={styles.userText}>
        <p className={styles.userName}>@{profile?.username || '...'}</p>
        {profile?.rank_name && (
          <p className={styles.userRank}>{profile.rank_name}</p>
        )}
      </div>
    </div>
  )
}

// Icons
function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function GridIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function ChatIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function BookmarkIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg> }
function PersonIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
