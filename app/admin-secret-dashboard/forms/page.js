'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAdminGate } from '../../../../lib/useAdminGate'
import AdminShell from '../../../../components/admin/AdminShell'
import styles from './forms.module.css'

export default function FormsPage() {
  const { admin, checking } = useAdminGate()
  const router = useRouter()

  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({ active: 0, total: 0, resolved: 0, avgCompletion: 68.4 })
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (admin) { fetchReports(); fetchStats() }
  }, [admin, filter])

  async function fetchStats() {
    const [{ count: open }, { count: total }, { count: resolved }] = await Promise.all([
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
    ])
    setStats({ active: open || 0, total: total || 0, resolved: resolved || 0, avgCompletion: 68.4 })
  }

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:reporter_id(username, avatar_url),
        reported:reported_id(username, avatar_url)
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(30)
    setReports(data || [])
    setLoading(false)
  }

  async function ignoreReport(report) {
    setProcessing(true)
    await supabase.from('reports').update({
      status: 'ignored',
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
      action_taken: 'Ignored by admin',
    }).eq('id', report.id)

    await supabase.from('moderation_logs').insert({
      admin_id: admin.id,
      target_user_id: report.reported_id,
      action: 'report_resolved',
      reason: 'Report ignored',
      meta: { report_id: report.id },
    })
    setSelected(null)
    setProcessing(false)
    fetchReports()
    fetchStats()
  }

  async function banReported(report) {
    setProcessing(true)
    await supabase.from('profiles').update({
      status: 'banned',
      ban_reason: report.reason,
      banned_at: new Date().toISOString(),
    }).eq('id', report.reported_id)

    await supabase.from('reports').update({
      status: 'resolved',
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
      action_taken: 'User banned',
    }).eq('id', report.id)

    await supabase.from('system_messages').insert({
      recipient_id: report.reported_id,
      sent_by: admin.id,
      type: 'ban_notice',
      subject: 'Your account has been banned',
      content: `Your account has been banned following a community report.\n\nReason: ${report.reason}`,
    })

    await supabase.from('moderation_logs').insert({
      admin_id: admin.id,
      target_user_id: report.reported_id,
      action: 'ban',
      reason: `Report: ${report.reason}`,
      meta: { report_id: report.id },
    })

    setSelected(null)
    setProcessing(false)
    fetchReports()
    fetchStats()
  }

  function formatDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (checking) return null

  return (
    <AdminShell admin={admin} searchPlaceholder="Search forms, surveys or results...">
      <div>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>Forms & Reports</h1>
            <p className={styles.pageSub}>
              Review user-submitted reports and take moderation action from a centralized interface.
            </p>
          </div>
          <button className={styles.createBtn}>+ New Template</button>
        </div>

        {/* Stat cards */}
        <div className={styles.statGrid}>
          <div className={styles.statCard} onClick={() => setFilter('open')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>OPEN REPORTS</p>
            <p className={styles.statValue}>{stats.active}</p>
            <p className={styles.statSub} style={{ color: stats.active > 0 ? '#ef4444' : '#22c55e' }}>
              {stats.active > 0 ? `${stats.active} requiring action` : 'All clear'}
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>TOTAL REPORTS</p>
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statSub} style={{ color: '#6b7280' }}>All time</p>
          </div>
          <div className={styles.statCard} onClick={() => setFilter('resolved')} style={{ cursor: 'pointer' }}>
            <p className={styles.statLabel}>RESOLVED</p>
            <p className={styles.statValue}>{stats.resolved}</p>
            <p className={styles.statSub} style={{ color: '#22c55e' }}>Handled</p>
          </div>
        </div>

        {/* Filter + list */}
        <div className={styles.contentGrid}>
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <h3 className={styles.listTitle}>Recent Reports</h3>
              <div className={styles.filterTabs}>
                {['open', 'resolved', 'ignored'].map((f) => (
                  <button
                    key={f}
                    className={`${styles.filterTab} ${filter === f ? styles.filterActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingWrap}><div className={styles.spinner} /></div>
            ) : reports.length === 0 ? (
              <p className={styles.empty}>No {filter} reports.</p>
            ) : (
              <div className={styles.reportList}>
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className={`${styles.reportRow} ${selected?.id === r.id ? styles.selectedRow : ''}`}
                    onClick={() => setSelected(r)}
                  >
                    <div className={styles.reportIcon}>⚑</div>
                    <div className={styles.reportInfo}>
                      <p className={styles.reportTitle}>{r.reason}</p>
                      <p className={styles.reportMeta}>
                        Reported by @{r.reporter?.username || 'unknown'} · {formatDate(r.created_at)}
                      </p>
                    </div>
                    <span className={`${styles.reportStatus} ${
                      r.status === 'open' ? styles.statusOpen :
                      r.status === 'resolved' ? styles.statusResolved : styles.statusIgnored
                    }`}>
                      {r.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className={styles.detailCard}>
            {!selected ? (
              <div className={styles.detailEmpty}>
                <p>Select a report to view details</p>
              </div>
            ) : (
              <div className={styles.detail}>
                <div className={styles.detailHeader}>
                  <h3 className={styles.detailTitle}>Report Details</h3>
                  <button className={styles.detailClose} onClick={() => setSelected(null)}>✕</button>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailLabel}>REPORTER</p>
                  <div className={styles.detailUser}>
                    <div className={styles.detailAvatar}>
                      {selected.reporter?.avatar_url
                        ? <img src={selected.reporter.avatar_url} alt="" className={styles.detailAvatarImg} />
                        : <span>{(selected.reporter?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <span className={styles.detailUsername}>@{selected.reporter?.username || 'unknown'}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailLabel}>REPORTED USER</p>
                  <div className={styles.detailUser}>
                    <div className={styles.detailAvatar}>
                      {selected.reported?.avatar_url
                        ? <img src={selected.reported.avatar_url} alt="" className={styles.detailAvatarImg} />
                        : <span>{(selected.reported?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <span className={styles.detailUsername}>@{selected.reported?.username || 'unknown'}</span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <p className={styles.detailLabel}>REASON</p>
                  <p className={styles.detailText}>{selected.reason}</p>
                </div>

                {selected.description && (
                  <div className={styles.detailSection}>
                    <p className={styles.detailLabel}>DESCRIPTION</p>
                    <p className={styles.detailText}>{selected.description}</p>
                  </div>
                )}

                <div className={styles.detailSection}>
                  <p className={styles.detailLabel}>SUBMITTED</p>
                  <p className={styles.detailText}>{formatDate(selected.created_at)}</p>
                </div>

                {selected.status === 'open' && (
                  <div className={styles.detailActions}>
                    <button
                      className={styles.ignoreBtn}
                      onClick={() => ignoreReport(selected)}
                      disabled={processing}
                    >
                      Ignore Report
                    </button>
                    <button
                      className={styles.banFromReportBtn}
                      onClick={() => banReported(selected)}
                      disabled={processing}
                    >
                      {processing ? 'Processing...' : 'Ban User'}
                    </button>
                  </div>
                )}

                {selected.status !== 'open' && (
                  <div className={styles.resolvedNote}>
                    ✓ {selected.action_taken || 'Resolved'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
