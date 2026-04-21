'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import QuickPost from './QuickPost'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [showQuickPost, setShowQuickPost] = useState(false)

  const isActive = (path) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(path + '/')
  }

  const items = [
    { icon: <HomeIcon />,    label: 'HOME',    path: '/' },
    { icon: <FeedIcon />,    label: 'FEED',    path: '/feed' },
    { icon: <SearchIcon />,  label: 'SEARCH',  path: '/search' },
    { icon: <MessagesIcon />,label: 'SPACE',   path: '/inbox' },
    { icon: <FriendsIcon />, label: 'FRIENDS', path: '/friends' },
  ]

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.inner}>
          <nav className={styles.nav}>
            {items.map((item) => (
              <button
                key={item.path}
                className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                onClick={() => router.push(item.path)}
              >
                <span className={styles.icon}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </button>
            ))}

            {/* + Create post */}
            <button
              className={`${styles.navItem} ${styles.createBtn}`}
              onClick={() => setShowQuickPost(true)}
            >
              <span className={styles.icon}><PlusIcon /></span>
              <span className={styles.label}>POST</span>
            </button>
          </nav>

          {/* Stranger button - bottom */}
          <div className={styles.bottom}>
            <button
              className={styles.strangerBtn}
              onClick={() => router.push('/chat')}
            >
              <span className={styles.icon}><StrangerIcon /></span>
              <span className={styles.label}>STRANGER</span>
            </button>
          </div>
        </div>
      </aside>

      {showQuickPost && <QuickPost onClose={() => setShowQuickPost(false)} />}
    </>
  )
}

function HomeIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function FeedIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function SearchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function MessagesIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function FriendsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> }
function PlusIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function StrangerIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> }
