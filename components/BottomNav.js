// components/BottomNav.js
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import QuickPost from './QuickPost'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const router   = useRouter()
  const pathname = usePathname()
  const [showQuickPost, setShowQuickPost] = useState(false)

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path)

  return (
    <>
      <nav className={styles.nav}>
        <button className={`${styles.item} ${isActive('/') ? styles.active : ''}`} onClick={() => router.push('/')} title="Home">
          <HomeIcon />
          <span className={styles.label}>Home</span>
        </button>

        <button className={`${styles.item} ${isActive('/feed') ? styles.active : ''}`} onClick={() => router.push('/feed')} title="Feed">
          <FeedIcon />
          <span className={styles.label}>Feed</span>
        </button>

        {/* Center + button */}
        <button className={`${styles.item} ${styles.plusBtn}`} onClick={() => setShowQuickPost(true)} title="Create Post">
          <div className={styles.plusCircle}>
            <PlusIcon />
          </div>
          <span className={styles.label}>Post</span>
        </button>

        <button className={`${styles.item} ${isActive('/inbox') ? styles.active : ''}`} onClick={() => router.push('/inbox')} title="Space">
          <SpaceIcon />
          <span className={styles.label}>Space</span>
        </button>

        <button className={`${styles.item} ${isActive('/rank') ? styles.active : ''}`} onClick={() => router.push('/rank')} title="Rank">
          <RankIcon />
          <span className={styles.label}>Rank</span>
        </button>
      </nav>

      {showQuickPost && <QuickPost onClose={() => setShowQuickPost(false)} />}
    </>
  )
}

function HomeIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function FeedIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function SpaceIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function RankIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> }
function PlusIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
