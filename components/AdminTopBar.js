'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './AdminTopBar.module.css'

export default function AdminTopBar({ admin, searchPlaceholder = 'Search...', onSearch }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)

  function handleSearch(e) {
    setQuery(e.target.value)
    onSearch?.(e.target.value)
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className={styles.searchInput}
          placeholder={searchPlaceholder}
          value={query}
          onChange={handleSearch}
        />
      </div>

      <div className={styles.right}>
        {/* Notifications */}
        <div className={styles.iconWrap}>
          <button className={styles.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <span className={styles.notifDot} />
          </button>
        </div>

        {/* Mail */}
        <button className={styles.iconBtn} onClick={() => router.push('/admin-secret-dashboard/forms')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </button>

        <div className={styles.adminBadge}>
          {admin?.username ? `@${admin.username}` : 'Admin'}
        </div>
      </div>
    </header>
  )
}
