// components/BottomNav.js
'use client'

import { useRouter, usePathname } from 'next/navigation'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const router   = useRouter()
  const pathname = usePathname()

  const isActive = (path) => path === '/' ? pathname === '/' : pathname.startsWith(path)

  const items = [
    { path: '/',       icon: <HomeIcon />,     label: 'Home' },
    { path: '/feed',   icon: <FeedIcon />,     label: 'Feed' },
    { path: '/search', icon: <SearchIcon />,   label: 'Search' },
    { path: '/inbox',  icon: <SpaceIcon />,    label: 'Space' },
    { path: '/rank',   icon: <RankIcon />,     label: 'Rank' },
  ]

  return (
    <nav className={styles.nav}>
      {items.map((item) => (
        <button
          key={item.path}
          className={`${styles.item} ${isActive(item.path) ? styles.active : ''}`}
          onClick={() => router.push(item.path)}
          title={item.label}
        >
          {item.icon}
          <span className={styles.itemLabel}>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function HomeIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}

function FeedIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
}

function SearchIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

function SpaceIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}

function RankIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}