// components/AppShell.js
'use client'

import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import styles from './AppShell.module.css'

export default function AppShell({ children, noPadding = false }) {
  return (
    <div className={styles.shell}>
      <TopBar />
      <Sidebar />
      <BottomNav />
      <main className={`${styles.main} ${noPadding ? styles.noPadding : ''}`}>
        {children}
      </main>
    </div>
  )
}
