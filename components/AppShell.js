'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import QuickPost from './QuickPost'
import styles from './AppShell.module.css'

export default function AppShell({ children, noSidebar = false }) {
  const [showPost, setShowPost] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  const isActive = (p) => p === '/' ? pathname === '/' || pathname === '/feed' : pathname.startsWith(p)

  return (
    <div className={styles.shell}>
      <TopBar />
      {!noSidebar && <Sidebar />}
      <main className={`${styles.main} ${noSidebar ? styles.noSidebar : ''}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className={styles.mobileNav}>
        <MobileNavBtn icon={<HomeIcon />} label="Home" active={isActive('/')} onClick={() => router.push('/')} />
        <MobileNavBtn icon={<GridIcon />} label="Feed" active={isActive('/feed')} onClick={() => router.push('/feed')} />
        <button className={styles.mobilePost} onClick={() => setShowPost(true)} aria-label="Create post">
          <PlusIcon />
        </button>
        <MobileNavBtn icon={<ChatIcon />} label="Space" active={isActive('/inbox')} onClick={() => router.push('/inbox')} />
        <MobileNavBtn icon={<PersonIcon />} label="Profile" active={isActive('/dashboard')} onClick={() => router.push('/dashboard')} />
      </nav>

      {showPost && <QuickPost onClose={() => setShowPost(false)} />}
    </div>
  )
}

function MobileNavBtn({ icon, label, active, onClick }) {
  return (
    <button
      className={`${styles.mobileBtn} ${active ? styles.mobileBtnActive : ''}`}
      onClick={onClick}
    >
      {icon}
      <span className={styles.mobileBtnLabel}>{label}</span>
    </button>
  )
}

function HomeIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function GridIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> }
function ChatIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> }
function PersonIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function PlusIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
