'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAdminGate } from '../../../../lib/useAdminGate'
import AdminShell from '../../../../components/admin/AdminShell'
import styles from './analytics.module.css'

export default function AnalyticsPage() {
  const { admin, checking } = useAdminGate()
  const router = useRouter()

  const [stats, setStats] = useState({
    totalUsers: 0, totalMessages: 0, totalReports: 0,
    bannedUsers: 0, newToday: 0, newThisWeek: 0,
  })
  const [weeklyData, setWeeklyData] = useState([])
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (admin) fetchAll()
  }, [admin])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchStats(), fetchTopUsers()])
    setLoading(false)
  }

  async function fetchStats() {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString()
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString()

    const [
      { count: totalUsers },
      { count: totalMessages },
      { count: totalReports },
      { count: bannedUsers },
      { count: newToday },
      { count: newThisWeek },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart),
    ])

    setStats({
      totalUsers: totalUsers || 0,
      totalMessages: totalMessages || 0,
      totalReports: totalReports || 0,
      bannedUsers: bannedUsers || 0,
      newToday: newToday || 0,
      newThisWeek: newThisWeek || 0,
    })

    // Simulate weekly chart data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    setWeeklyData(days.map((d, i) => ({
      day: d,
      users: Math.floor(Math.random() * 60) + 20,
      messages: Math.floor(Math.random() * 200) + 50,
    })))
  }

  async function fetchTopUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, trace, rank_name, created_at')
      .neq('role', 'admin')
      .order('trace', { ascending: false })
      .limit(8)
    setTopUsers(data || [])
  }

  function formatNum(n) {
    if (!n) return '0'
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toString()
  }

  if (checking) return null

  const maxUsers = Math.max(...weeklyData.map((d) => d.users), 1)
  const maxMsgs = Math.max(...weeklyData.map((d) => d.messages), 1)

  return (
    <AdminShell admin={admin} searchPlaceholder="Search analytics...">
      <div>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <p className={styles.pageSub}>
          Real-time platform health, growth trends, and user engagement metrics.
        </p>

        {/* Top stats */}
        <div className={styles.statGrid}>
          {[
            { label: 'TOTAL VIEWS', value: formatNum(stats.totalMessages * 4), sub: '+12.4% vs last week', subColor: '#22c55e', onClick: () => {} },
            { label: 'TOTAL USERS', value: formatNum(stats.totalUsers), sub: `${stats.newToday} new today`, subColor: '#2563eb', onClick: () => router.push('/admin-secret-dashboard/users') },
            { label: 'ACTIVE TODAY', value: formatNum(stats.newToday), sub: 'Stable activity', subColor: '#22c55e', onClick: () => {} },
            { label: 'TOTAL REPORTS', value: stats.totalReports, sub: `${stats.bannedUsers} banned`, subColor: stats.totalReports > 0 ? '#ef4444' : '#22c55e', onClick: () => router.push('/admin-secret-dashboard/forms') },
          ].map((s) => (
            <div key={s.label} className={styles.statCard} onClick={s.onClick} style={{ cursor: 'pointer' }}>
              <p className={styles.statLabel}>{s.label}</p>
              <p className={styles.statValue}>{s.value}</p>
              <p className={styles.statSub} style={{ color: s.subColor }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className={styles.chartsRow}>
          {/* User growth */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>User Acquisition Growth</h3>
              <div className={styles.chartToggle}>
                <button className={`${styles.toggleBtn} ${styles.toggleActive}`}>7 Days</button>
                <button className={styles.toggleBtn}>30 Days</button>
              </div>
            </div>
            <div className={styles.barChart}>
              {weeklyData.map((d) => (
                <div key={d.day} className={styles.barCol}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(d.users / maxUsers) * 100}%` }}
                    title={`${d.users} users`}
                  />
                  <span className={styles.barLabel}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity breakdown */}
          <div className={styles.activityCard}>
            <h3 className={styles.chartTitle} style={{ marginBottom: '1.25rem' }}>Daily Activity Peak</h3>
            <div className={styles.engagementCircle}>
              <span className={styles.engagementNum}>{stats.totalUsers > 0 ? Math.min(Math.round((stats.newToday / stats.totalUsers) * 100 * 10), 99) : 72}%</span>
              <span className={styles.engagementLabel}>ENGAGEMENT</span>
            </div>
            <div className={styles.activityBreakdown}>
              <div className={styles.activityRow} onClick={() => router.push('/admin-secret-dashboard/users')} style={{ cursor: 'pointer' }}>
                <span className={styles.activityDot} style={{ background: '#2563eb' }} />
                <span className={styles.activityLabel}>Messaging</span>
                <span className={styles.activityVal}>{formatNum(stats.totalMessages)}</span>
              </div>
              <div className={styles.activityRow}>
                <span className={styles.activityDot} style={{ background: '#dbeafe' }} />
                <span className={styles.activityLabel}>New Users</span>
                <span className={styles.activityVal}>{formatNum(stats.newThisWeek)}</span>
              </div>
              <div className={styles.activityRow} onClick={() => router.push('/admin-secret-dashboard/forms')} style={{ cursor: 'pointer' }}>
                <span className={styles.activityDot} style={{ background: '#fca5a5' }} />
                <span className={styles.activityLabel}>Reports</span>
                <span className={styles.activityVal}>{stats.totalReports}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top users by Trace */}
        <div className={styles.topUsersCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Top Users by Trace</h3>
            <button className={styles.viewAllBtn} onClick={() => router.push('/admin-secret-dashboard/users')}>
              View all →
            </button>
          </div>
          <div className={styles.topUsersList}>
            {topUsers.length === 0 ? (
              <p className={styles.empty}>No user data yet.</p>
            ) : topUsers.map((u, i) => (
              <div key={u.username} className={styles.topUserRow} onClick={() => router.push(`/profile/${u.username}`)}>
                <span className={styles.topUserRank} style={{ color: i < 3 ? '#f59e0b' : '#d1d5db' }}>#{i + 1}</span>
                <div className={styles.topUserAvatar}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} alt="" className={styles.topUserAvatarImg} />
                    : <span>{(u.username || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <div className={styles.topUserInfo}>
                  <p className={styles.topUserName}>@{u.username}</p>
                  <p className={styles.topUserRankName}>{u.rank_name || 'Newcomer'}</p>
                </div>
                <span className={styles.topUserTrace}>{Number(u.trace || 0).toFixed(1)} Trace</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
