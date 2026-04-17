'use client'

import HexBadge from '../badges/HexBadge'
import TraceProgressBar from './TraceProgressBar'
import styles from './RankCard.module.css'

export default function RankCard({
  rank,
  nextRank,
  trace = 0,
  progress = 0,
  traceToNext = 0,
  size = 'full',
  animated = true,
  showLevelUp = false,
  onBadgeClick = null,
}) {
  if (!rank) return null

  if (size === 'compact') {
    return (
      <div className={styles.compact}>
        <HexBadge rank={rank} size="small" animated={animated} />
        <div className={styles.compactInfo}>
          <span className={styles.compactName} style={{ color: rank.color }}>
            {rank.name}
          </span>
          <TraceProgressBar
            progress={progress}
            rank={rank}
            nextRank={nextRank}
            size="compact"
            animated={animated}
          />
        </div>
      </div>
    )
  }

  if (size === 'hero') {
    return (
      <div className={styles.hero}>
        <div className={styles.heroBadgeWrap}>
          <HexBadge
            rank={rank}
            size="large"
            animated={animated}
            showLevelUp={showLevelUp}
            onClick={onBadgeClick}
          />
          {showLevelUp && (
            <div className={styles.levelUpText} style={{ color: rank.color }}>
              Rank Up → {rank.name}
            </div>
          )}
        </div>
        <div className={styles.heroInfo}>
          <p className={styles.heroRankLabel}>YOUR RANK</p>
          <h2 className={styles.heroRankName} style={{ color: rank.color }}>
            {rank.name}
          </h2>
          <p className={styles.heroDesc}>{rank.description}</p>
          <div className={styles.heroTrace}>
            <span className={styles.heroTraceNum}>{formatTrace(trace)}</span>
            <span className={styles.heroTraceLabel}>Trace</span>
          </div>
          <div className={styles.heroProgress}>
            <TraceProgressBar
              progress={progress}
              rank={rank}
              nextRank={nextRank}
              trace={trace}
              traceToNext={traceToNext}
              size="full"
              animated={animated}
            />
          </div>
        </div>
      </div>
    )
  }

  // Default: 'full'
  return (
    <div className={styles.full}>
      <div className={styles.fullBadge}>
        <HexBadge
          rank={rank}
          size="medium"
          animated={animated}
          showLevelUp={showLevelUp}
          onClick={onBadgeClick}
        />
        {showLevelUp && (
          <div className={styles.levelUpText} style={{ color: rank.color }}>
            Rank Up!
          </div>
        )}
      </div>
      <div className={styles.fullInfo}>
        <div className={styles.fullNameRow}>
          <span className={styles.fullName} style={{ color: rank.color }}>{rank.name}</span>
          <span className={styles.fullTrace}>{formatTrace(trace)} Trace</span>
        </div>
        <TraceProgressBar
          progress={progress}
          rank={rank}
          nextRank={nextRank}
          trace={trace}
          traceToNext={traceToNext}
          size="full"
          animated={animated}
        />
      </div>
    </div>
  )
}

function formatTrace(val) {
  const n = Number(val) || 0
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toFixed(1)
}
