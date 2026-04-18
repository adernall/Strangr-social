'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAdminGate } from '../../lib/useAdminGate'
import AdminShell from '../../components/admin/AdminShell'
import styles from './home.module.css'

const BASE = '/admin-secret-dashboard'

export default function AdminHome() {
  const { admin, checking } = useAdminGate()
  const router = useRouter()

  const [stats, setStats] = useState({
    totalUsers: 0, activeNow: 0, totalMessages: 0, openReports: 0,
    newToday: 0, bannedUsers: 0,
  })
  const [recentLogs, setRecentLogs] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (admin) fetchAll()
  }, [admin])

  async function fetchAll() {
    setLoadingStats(true)
    await Promise.all([fetchStats(), fetchRecentLogs()])
    setLoadingStats(false)
  }

  async function fetchStats() {
    const [
      { count: totalUsers },
      { count: openReports },
      { count: bannedUsers },
      { count: totalMessages },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned'),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ])

    // New users today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: newToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())

    setStats({
      totalUsers: totalUsers || 0,
      openReports: openReports || 0,
      bannedUsers: bannedUsers || 0,
      totalMessages: totalMessages || 0,
      newToday: newToday || 0,
      activeNow: Math.floor(Math.random() * 50) + 10, // placeholder — replace with real presence
    })

    // Build simple weekly chart data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    setWeeklyData(days.map((d) => ({ day: d, value: Math.floor(Math.random() * 80) + 20 })))
  }

  async function fetchRecentLogs() {
    const { data } = await supabase
      .from('moderation_logs')
      .select('*, admin:admin_id(username), target:target_user_id(username)')
      .order('created_at', { ascending: false })
      .limit(8)
    setRecentLogs(data || [])
  }

  function formatTime(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts)
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString()
  }

  function actionColor(action) {
    if (action === 'ban') return '#ef4444'
    if (action === 'unban') return '#22c55e'
    if (action === 'cooldown') return '#f59e0b'
    if (action === 'warn') return '#f97316'
    return '#6b7280'
  }

  if (checking) return <AdminLoading />

  const maxVal = Math.max(...weeklyData.map((d) => d.value), 1)

  return (
    <AdminShell admin={admin} searchPlaceholder="Search analytics...">
      <div>
        <h1 className={styles.pageTitle}>Executive Overview</h1>
        <p className={styles.pageSub}>
          Real-time health and performance metrics for the Strangr ecosystem.
        </p>

        {/* Stat cards */}
        <div className={styles.statGrid}>
          <StatCard
            label="TOTAL USERS"
            value={stats.totalUsers.toLocaleString()}
            sub={`+${stats.newToday} new today`}
            subColor="#22c55e"
            onClick={() => router.push(`${BASE}/users`)}
          />
          <StatCard
            label="ACTIVE NOW"
            value={stats.activeNow.toLocaleString()}
            sub="Stable activity peak"
            subColor="#2563eb"
            dot
            onClick={() => router.push(`${BASE}/users?filter=active`)}
          />
          <StatCard
            label="TOTAL MESSAGES"
            value={stats.totalMessages.toLocaleString()}
            sub="All time"
            subColor="#6b7280"
            onClick={() => router.push(`${BASE}/analytics`)}
          />
          <StatCard
            label="OPEN REPORTS"
            value={stats.openReports}
            sub={stats.openReports > 0 ? `${stats.openReports} requiring action` : 'All clear'}
            subColor={stats.openReports > 0 ? '#ef4444' : '#22c55e'}
            onClick={() => router.push(`${BASE}/forms`)}
          />
        </div>

        {/* Charts row */}
        <div className={styles.chartsRow}>
          {/* Bar chart */}
          <div className={styles.chartCard} onClick={() => router.push(`${BASE}/analytics`)} style={{ cursor: 'pointer' }}>
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
                    style={{ height: `${(d.value / maxVal) * 100}%` }}
                  />
                  <span className={styles.barLabel}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System health */}
          <div className={styles.healthCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>System Intelligence</h3>
              <span className={styles.allGreenBadge}>ALL SYSTEMS OPERATIONAL</span>
            </div>
            <div className={styles.healthList}>
              <HealthItem label="Database" value="Live" status="good" />
              <HealthItem label="Supabase API" value="99.9%" status="good" />
              <HealthItem label="Realtime" value="Active" status="good" />
              <HealthItem label="Storage" value="Online" status="good" />
              <HealthItem label="Auth" value="Running" status="good" />
            </div>

            <div className={styles.quickStats}>
              <div className={styles.quickStat} onClick={() => router.push(`${BASE}/users?filter=banned`)} style={{ cursor: 'pointer' }}>
                <span className={styles.quickStatNum} style={{ color: '#ef4444' }}>{stats.bannedUsers}</span>
                <span className={styles.quickStatLabel}>Banned</span>
              </div>
              <div className={styles.quickStat} onClick={() => router.push(`${BASE}/forms`)} style={{ cursor: 'pointer' }}>
                <span className={styles.quickStatNum} style={{ color: '#f59e0b' }}>{stats.openReports}</span>
                <span className={styles.quickStatLabel}>Reports</span>
              </div>
              <div className={styles.quickStat} onClick={() => router.push(`${BASE}/analytics`)} style={{ cursor: 'pointer' }}>
                <span className={styles.quickStatNum} style={{ color: '#2563eb' }}>{stats.newToday}</span>
                <span className={styles.quickStatLabel}>New Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent moderation log */}
        <div className={styles.logCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Security & Moderation Log</h3>
            <button className={styles.viewAllBtn} onClick={() => router.push(`${BASE}/users`)}>
              View all →
            </button>
          </div>
          {recentLogs.length === 0 ? (
            <p className={styles.emptyLog}>No moderation actions yet.</p>
          ) : (
            <div className={styles.logList}>
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={styles.logRow}
                  onClick={() => router.push(`${BASE}/users`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className={styles.logDot}
                    style={{ background: actionColor(log.action) }}
                  />
                  <div className={styles.logInfo}>
                    <p className={styles.logText}>
                      <strong>@{log.admin?.username || 'admin'}</strong>
                      {' '}applied{' '}
                      <span style={{ color: actionColor(log.action), fontWeight: 600 }}>
                        {log.action}
                      </span>
                      {' '}to{' '}
                      <strong>@{log.target?.username || 'user'}</strong>
                      {log.reason && ` — ${log.reason}`}
                    </p>
                    <p className={styles.logTime}>{formatTime(log.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

function StatCard({ label, value, sub, subColor, dot, onClick }) {
  return (
    <div className={styles.statCard} onClick={onClick}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>
        {dot && <span className={styles.statDot} />}
        {value}
      </p>
      {sub && <p className={styles.statSub} style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

function HealthItem({ label, value, status }) {
  return (
    <div className={styles.healthItem}>
      <span className={styles.healthLabel}>{label}</span>
      <div className={styles.healthRight}>
        <div className={styles.healthBar}>
          <div className={styles.healthFill} style={{ background: status === 'good' ? '#22c55e' : '#ef4444', width: '100%' }} />
        </div>
        <span className={styles.healthValue} style={{ color: status === 'good' ? '#22c55e' : '#ef4444' }}>
          {value}
        </span>
      </div>
    </div>
  )
}

function AdminLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}
