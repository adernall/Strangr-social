'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { useTraceContext } from '../../components/TraceProvider'
import { getLeaderboard, getTraceHistory } from '../../lib/traceService'
import { RANKS } from '../../data/ranks'
import AppShell from '../../components/AppShell'
import HexBadge from '../../components/badges/HexBadge'
import TraceProgressBar from '../../components/rank/TraceProgressBar'
import styles from './rank.module.css'

export default function RankPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { rank, nextRank, trace, progress, traceToNext, loading } = useTraceContext()

  const [leaderboard, setLeaderboard] = useState([])
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('ranks') // 'ranks' | 'leaderboard' | 'history'
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    if (!user) router.push('/?auth=login')
  }, [user])

  useEffect(() => {
    if (tab === 'leaderboard' && leaderboard.length === 0) fetchLeaderboard()
    if (tab === 'history' && history.length === 0 && user) fetchHistory()
  }, [tab])

  async function fetchLeaderboard() {
    setLoadingData(true)
    const data = await getLeaderboard(50)
    setLeaderboard(data)
    setLoadingData(false)
  }

  async function fetchHistory() {
    setLoadingData(true)
    const data = await getTraceHistory(user.id, 30)
    setHistory(data)
    setLoadingData(false)
  }

  function formatTrace(val) {
    const n = Number(val) || 0
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return n.toFixed(1)
  }

  function formatEventType(type) {
    const map = {
      session: 'Anonymous Chat',
      anonymous: 'Anonymous Chat',
      dm: 'Direct Message',
      group: 'Group Chat',
      decay: 'Inactivity Decay',
    }
    return map[type] || type
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <AppShell>
      <div className={styles.page}>

        {/* My rank summary */}
        {!loading && rank && (
          <div className={styles.myRank}>
            <div className={styles.myRankBadge}>
              <HexBadge rank={rank} size="large" animated />
            </div>
            <div className={styles.myRankInfo}>
              <p className={styles.myRankLabel}>YOUR RANK</p>
              <h1 className={styles.myRankName} style={{ color: rank.color }}>{rank.name}</h1>
              <p className={styles.myRankDesc}>{rank.description}</p>
              <div className={styles.myTraceRow}>
                <span className={styles.myTraceNum}>{formatTrace(trace)}</span>
                <span className={styles.myTraceLabel}>Trace</span>
              </div>
              <div className={styles.myProgress}>
                <TraceProgressBar
                  progress={progress}
                  rank={rank}
                  nextRank={nextRank}
                  trace={trace}
                  traceToNext={traceToNext}
                  size="full"
                  animated
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {['ranks', 'leaderboard', 'history'].map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* All Ranks */}
        {tab === 'ranks' && (
          <div className={styles.allRanks}>
            {RANKS.map((r) => {
              const isCurrent = rank?.name === r.name
              const isPast = rank && r.order < rank.order
              const isFuture = rank && r.order > rank.order

              return (
                <div
                  key={r.name}
                  className={`${styles.rankRow} ${isCurrent ? styles.currentRankRow : ''} ${isPast ? styles.pastRankRow : ''}`}
                >
                  <HexBadge
                    rank={r}
                    size="medium"
                    animated={isCurrent}
                  />
                  <div className={styles.rankRowInfo}>
                    <div className={styles.rankRowTop}>
                      <span className={styles.rankRowName} style={{ color: isFuture ? 'rgba(240,240,245,0.25)' : r.color }}>
                        {r.name}
                      </span>
                      {isCurrent && <span className={styles.currentBadge}>Current</span>}
                      {isPast && <span className={styles.achievedBadge}>Achieved</span>}
                    </div>
                    <p className={styles.rankRowDesc} style={{ opacity: isFuture ? 0.3 : 0.6 }}>
                      {r.description}
                    </p>
                    <p className={styles.rankRowThreshold} style={{ opacity: isFuture ? 0.25 : 0.45 }}>
                      {r.maxTrace === Infinity
                        ? `${formatTrace(r.minTrace)}+ Trace`
                        : `${formatTrace(r.minTrace)} – ${formatTrace(r.maxTrace)} Trace`
                      }
                    </p>
                  </div>

                  {isCurrent && (
                    <div className={styles.rankRowProgress}>
                      <TraceProgressBar
                        progress={progress}
                        rank={r}
                        nextRank={nextRank}
                        size="compact"
                        animated
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div className={styles.leaderboard}>
            {loadingData ? (
              <div className={styles.loadingRow}><div className={styles.spinner} /></div>
            ) : leaderboard.length === 0 ? (
              <p className={styles.empty}>No data yet.</p>
            ) : (
              leaderboard.map((entry, i) => {
                const entryRank = RANKS.find((r) => r.name === entry.rank_name) || RANKS[0]
                const isMe = entry.username === rank?.name
                return (
                  <div
                    key={i}
                    className={`${styles.lbRow} ${entry.username === user?.email ? styles.lbMe : ''}`}
                    onClick={() => router.push(`/profile/${entry.username}`)}
                  >
                    <span className={styles.lbPos} style={{ color: i < 3 ? '#f59e0b' : 'rgba(240,240,245,0.25)' }}>
                      {i + 1}
                    </span>
                    <div className={styles.lbAvatar}>
                      {entry.avatar_url
                        ? <img src={entry.avatar_url} alt="" className={styles.lbAvatarImg} />
                        : <span>{entry.username?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.lbInfo}>
                      <p className={styles.lbUsername}>@{entry.username}</p>
                      <p className={styles.lbRankName} style={{ color: entryRank.color }}>{entry.rank_name}</p>
                    </div>
                    <HexBadge rank={entryRank} size="small" />
                    <span className={styles.lbTrace}>{formatTrace(entry.trace)}</span>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className={styles.history}>
            {loadingData ? (
              <div className={styles.loadingRow}><div className={styles.spinner} /></div>
            ) : history.length === 0 ? (
              <p className={styles.empty}>No trace history yet. Start chatting!</p>
            ) : (
              history.map((event) => (
                <div key={event.id} className={styles.historyRow}>
                  <div className={styles.historyDot}
                    style={{ background: event.final_amount < 0 ? '#ef4444' : '#6c63ff' }}
                  />
                  <div className={styles.historyInfo}>
                    <p className={styles.historyType}>{formatEventType(event.event_type)}</p>
                    <p className={styles.historyMeta}>{formatTime(event.created_at)}</p>
                  </div>
                  <span
                    className={styles.historyAmount}
                    style={{ color: event.final_amount < 0 ? '#ef4444' : '#6c63ff' }}
                  >
                    {event.final_amount > 0 ? '+' : ''}{Number(event.final_amount).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </AppShell>
  )
}
