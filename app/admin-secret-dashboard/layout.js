// app/admin-secret-dashboard/layout.js
// This layout wraps ALL admin pages.
// It overrides the dark theme with a light admin theme.
// It does NOT affect the main Strangr app.

import './admin-globals.css'

export const metadata = {
  title: 'Intelligence — Curator Panel',
  robots: 'noindex, nofollow', // hide from search engines
}

export default function AdminLayout({ children }) {
  return (
    <div className="admin-root">
      {children}
    </div>
  )
}
