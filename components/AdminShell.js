'use client'

import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'
import styles from './AdminShell.module.css'

export default function AdminShell({ admin, children, searchPlaceholder, onSearch }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar admin={admin} />
      <div className={styles.main}>
        <AdminTopBar admin={admin} searchPlaceholder={searchPlaceholder} onSearch={onSearch} />
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  )
}
