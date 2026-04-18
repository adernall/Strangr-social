'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAdminGate } from '../../../../lib/useAdminGate'
import AdminShell from '../../../../components/admin/AdminShell'
import styles from './users.module.css'

function UsersPageInner() {
  const { admin, checking } = useAdminGate()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0, reported: 0 })
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionUser, setActionUser] = useState(null) // user for modal
  const [actionType, setActionType] = useState(null) // 'ban'|'unban'|'cooldown'|'message'
  const [actionReason, setActionReason] = useState('')
  const [cooldownHours, setCooldownHours] = useState(24)
  const [msgContent, setMsgContent] = useState('')
  const [processing, setProcessing] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    if (admin) { fetchUsers(); fetchStats() }
  }, [admin, filter, page])

  async function fetchStats() {
    const [
      { count: total },
      { count: active },
      { count: banned },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('role', 'admin'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'banned').neq('role', 'admin'),
    ])
    const { count: reported } = await supabase
      .from('reports')
      .select('reported_id', { count: 'exact', head: true })
      .eq('status', 'open')

    setStats({ total: total || 0, active: active || 0, banned: banned || 0, reported: reported || 0 })
  }

  async function fetchUsers() {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('id, username, email:id, status, created_at, avatar_url, ban_reason, cooldown_until, trace, rank_name')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (filter === 'active') query = query.eq('status', 'active')
    if (filter === 'banned') query = query.eq('status', 'banned')
    if (filter === 'cooldown') query = query.eq('status', 'cooldown')

    const { data } = await query

    // Fetch report counts per user
    const userIds = (data || []).map((u) => u.id)
    let reportCounts = {}
    if (userIds.length > 0) {
      const { data: reps } = await supabase
        .from('reports')
        .select('reported_id')
        .in('reported_id', userIds)
        .eq('status', 'open')
      reps?.forEach((r) => {
        reportCounts[r.reported_id] = (reportCounts[r.reported_id] || 0) + 1
      })
    }

    // Also get emails from auth — we only have IDs in profiles
    // We'll show the profile username as identity
    setUsers((data || []).map((u) => ({ ...u, reportCount: reportCounts[u.id] || 0 })))
    setLoading(false)
  }

  async function handleSearch(q) {
    setSearch(q)
    if (!q.trim()) { fetchUsers(); return }
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, status, created_at, avatar_url, ban_reason, cooldown_until, trace, rank_name')
      .neq('role', 'admin')
      .ilike('username', `%${q}%`)
      .limit(20)
    setUsers(data || [])
    setLoading(false)
  }

  async function executeAction() {
    if (!actionUser || !admin) return
    setProcessing(true)

    try {
      if (actionType === 'ban') {
        await supabase.from('profiles').update({
          status: 'banned',
          ban_reason: actionReason,
          banned_at: new Date().toISOString(),
        }).eq('id', actionUser.id)

        await supabase.from('moderation_logs').insert({
          admin_id: admin.id,
          target_user_id: actionUser.id,
          action: 'ban',
          reason: actionReason,
        })

        await supabase.from('system_messages').insert({
          recipient_id: actionUser.id,
          sent_by: admin.id,
          type: 'ban_notice',
          subject: 'Your account has been banned',
          content: `Your account has been permanently banned from Strangr.\n\nReason: ${actionReason || 'Violation of community guidelines.'}\n\nIf you believe this is a mistake, contact support.`,
        })
      }

      if (actionType === 'unban') {
        await supabase.from('profiles').update({
          status: 'active',
          ban_reason: '',
          banned_at: null,
        }).eq('id', actionUser.id)

        await supabase.from('moderation_logs').insert({
          admin_id: admin.id,
          target_user_id: actionUser.id,
          action: 'unban',
          reason: actionReason,
        })

        await supabase.from('system_messages').insert({
          recipient_id: actionUser.id,
          sent_by: admin.id,
          type: 'unban_notice',
          subject: 'Your account has been reinstated',
          content: `Your account ban has been lifted. Welcome back to Strangr.\n\nPlease review our community guidelines to avoid future violations.`,
        })
      }

      if (actionType === 'cooldown') {
        const until = new Date(Date.now() + cooldownHours * 3600000)
        await supabase.from('profiles').update({
          status: 'cooldown',
          cooldown_until: until.toISOString(),
        }).eq('id', actionUser.id)

        await supabase.from('moderation_logs').insert({
          admin_id: admin.id,
          target_user_id: actionUser.id,
          action: 'cooldown',
          reason: actionReason,
          meta: { hours: cooldownHours, until: until.toISOString() },
        })

        await supabase.from('system_messages').insert({
          recipient_id: actionUser.id,
          sent_by: admin.id,
          type: 'cooldown_notice',
          subject: `Your account is in cooldown for ${cooldownHours}h`,
          content: `Your account has been placed in cooldown for ${cooldownHours} hours.\n\nReason: ${actionReason || 'Policy violation.'}\n\nYou can resume normal activity after ${until.toLocaleString()}.`,
        })
      }

      if (actionType === 'message') {
        await supabase.from('system_messages').insert({
          recipient_id: actionUser.id,
          sent_by: admin.id,
          type: 'custom',
          subject: 'Message from Strangr team',
          content: msgContent,
        })

        await supabase.from('moderation_logs').insert({
          admin_id: admin.id,
          target_user_id: actionUser.id,
          action: 'message_sent',
          reason: 'Custom admin message',
        })
      }

      closeModal()
      fetchUsers()
      fetchStats()
    } catch (e) {
      console.error('Action failed:', e)
    }
    setProcessing(false)
  }

  function openAction(user, type) {
    setActionUser(user)
    setActionType(type)
    setActionReason('')
    setMsgContent('')
    setCooldownHours(24)
  }

  function closeModal() {
    setActionUser(null)
    setActionType(null)
    setActionReason('')
    setMsgContent('')
  }

  function statusBadge(user) {
    if (user.status === 'banned') return { text: 'BANNED', bg: '#fee2e2', color: '#dc2626' }
    if (user.status === 'cooldown') return { text: 'COOLDOWN', bg: '#fef3c7', color: '#d97706' }
    return { text: 'Active', bg: '#f0fdf4', color: '#16a34a' }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (checking) return null

  return (
    <AdminShell admin={admin} searchPlaceholder="Filter identities, roles, or status..." onSearch={handleSearch}>
      <div>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>User Management</h1>
            <p className={styles.pageSub}>
              Manage platform access, monitor user engagement, and handle moderation reports.
            </p>
          </div>
          <div className={styles.filterTabs}>
            {['all', 'active', 'banned', 'cooldown'].map((f) => (
              <button
                key={f}
                className={`${styles.filterTab} ${filter === f ? styles.filterActive : ''}`}
                onClick={() => { setFilter(f); setPage(1) }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className={styles.statGrid}>
          <div className={styles.statCard} onClick={() => setFilter('all')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>TOTAL ENTITIES</p>
            <p className={styles.statValue}>{stats.total.toLocaleString()}</p>
          </div>
          <div className={styles.statCard} onClick={() => setFilter('active')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>ACTIVE USERS</p>
            <p className={styles.statValue}>{stats.active.toLocaleString()} <span className={styles.onlineDot} /></p>
          </div>
          <div className={styles.statCard} onClick={() => router.push('/admin-secret-dashboard/forms')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>OPEN REPORTS</p>
            <p className={styles.statValue}>{stats.reported} {stats.reported > 0 && <span className={styles.criticalBadge}>Critical</span>}</p>
          </div>
          <div className={styles.statCard} onClick={() => setFilter('banned')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>BANNED USERS</p>
            <p className={styles.statValue}>{stats.banned.toLocaleString()}</p>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableCard}>
          {loading ? (
            <div className={styles.tableLoading}><div className={styles.spinner} /></div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>IDENTITY</th>
                    <th className={styles.th}>STATUS</th>
                    <th className={styles.th}>JOINED</th>
                    <th className={styles.th}>RANK</th>
                    <th className={styles.th}>REPORTS</th>
                    <th className={styles.th}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className={styles.emptyRow}>No users found.</td></tr>
                  ) : users.map((user) => {
                    const badge = statusBadge(user)
                    return (
                      <tr key={user.id} className={styles.tr}>
                        <td className={styles.td}>
                          <div className={styles.identity}>
                            <div className={styles.userAvatar}>
                              {user.avatar_url
                                ? <img src={user.avatar_url} alt="" className={styles.userAvatarImg} />
                                : <span>{(user.username || '?')[0].toUpperCase()}</span>
                              }
                            </div>
                            <div>
                              <p className={styles.userName}>{user.username || 'No username'}</p>
                              <p className={styles.userId}>ID: {user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span
                            className={styles.statusBadge}
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.text}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.dateText}>{formatDate(user.created_at)}</span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.rankText}>{user.rank_name || 'Newcomer'}</span>
                        </td>
                        <td className={styles.td}>
                          <span className={`${styles.reportBadge} ${user.reportCount > 0 ? styles.reportAlert : ''}`}>
                            {user.reportCount > 0 ? `${user.reportCount} Report${user.reportCount > 1 ? 's' : ''}` : '0 Reports'}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <div className={styles.actions}>
                            {user.status !== 'banned' && (
                              <button className={`${styles.actionBtn} ${styles.banBtn}`} onClick={() => openAction(user, 'ban')}>
                                Ban
                              </button>
                            )}
                            {user.status === 'banned' && (
                              <button className={`${styles.actionBtn} ${styles.unbanBtn}`} onClick={() => openAction(user, 'unban')}>
                                Unban
                              </button>
                            )}
                            {user.status !== 'cooldown' && user.status !== 'banned' && (
                              <button className={`${styles.actionBtn} ${styles.cooldownBtn}`} onClick={() => openAction(user, 'cooldown')}>
                                Cooldown
                              </button>
                            )}
                            <button className={`${styles.actionBtn} ${styles.msgBtn}`} onClick={() => openAction(user, 'message')}>
                              Message
                            </button>
                            <button className={`${styles.actionBtn} ${styles.viewBtn}`} onClick={() => router.push(`/profile/${user.username}`)}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>Showing {users.length} users</span>
                <div className={styles.paginationBtns}>
                  <button className={styles.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</button>
                  <span className={styles.pageNum}>{page}</span>
                  <button className={styles.pageBtn} onClick={() => setPage((p) => p + 1)} disabled={users.length < PAGE_SIZE}>→</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {actionUser && actionType && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {actionType === 'ban' && '🚫 Ban User'}
                {actionType === 'unban' && '✅ Unban User'}
                {actionType === 'cooldown' && '⏳ Set Cooldown'}
                {actionType === 'message' && '📩 Send Message'}
              </h3>
              <button className={styles.modalClose} onClick={closeModal}>✕</button>
            </div>

            <p className={styles.modalTarget}>
              Target: <strong>@{actionUser.username}</strong>
            </p>

            {actionType === 'ban' && (
              <>
                <label className={styles.modalLabel}>Reason (shown to user)</label>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="e.g. Hate speech, spam, impersonation..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                />
                <p className={styles.modalNote}>
                  ⚠️ This will permanently ban the user and send them a ban notice.
                </p>
              </>
            )}

            {actionType === 'unban' && (
              <>
                <label className={styles.modalLabel}>Note (optional)</label>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Reason for lifting the ban..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                />
              </>
            )}

            {actionType === 'cooldown' && (
              <>
                <label className={styles.modalLabel}>Duration</label>
                <div className={styles.cooldownOptions}>
                  {[1, 6, 12, 24, 48, 72, 168].map((h) => (
                    <button
                      key={h}
                      className={`${styles.cooldownOption} ${cooldownHours === h ? styles.cooldownSelected : ''}`}
                      onClick={() => setCooldownHours(h)}
                    >
                      {h < 24 ? `${h}h` : `${h / 24}d`}
                    </button>
                  ))}
                </div>
                <label className={styles.modalLabel}>Reason</label>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Reason for cooldown..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                />
              </>
            )}

            {actionType === 'message' && (
              <>
                <label className={styles.modalLabel}>Message content</label>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Write your message to the user..."
                  value={msgContent}
                  onChange={(e) => setMsgContent(e.target.value)}
                  rows={4}
                />
                <p className={styles.modalNote}>
                  This will appear in the user's system inbox.
                </p>
              </>
            )}

            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={closeModal}>Cancel</button>
              <button
                className={`${styles.modalConfirm} ${actionType === 'ban' ? styles.confirmDanger : ''}`}
                onClick={executeAction}
                disabled={processing || (actionType === 'message' && !msgContent.trim())}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

export default function UsersPage() {
  return <Suspense fallback={null}><UsersPageInner /></Suspense>
}
