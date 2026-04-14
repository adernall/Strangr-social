// components/rank/TraceProgressBar.js
'use client'

import { useEffect, useRef } from 'react'
import styles from './TraceProgressBar.module.css'

// progress: 0–100
// rank: current rank object
// nextRank: next rank object (null if max)
// trace: current trace value
// traceToNext: how much more needed
// size: 'compact' | 'full'
export default function TraceProgressBar({
  progress = 0,
  rank,
  nextRank,
  trace = 0,
  traceToNext = 0,
  size = 'full',
  animated = true,
}) {
  const fillRef = useRef(null)

  useEffect(() => {
    if (!fillRef.current) return
    // Smooth animate to new progress
    fillRef.current.style.width = `${Math.min(Math.max(progress, 0), 100)}%`
  }, [progress])

  if (!rank) return null

  const isMaxRank = !nextRank

  return (
    <div className={`${styles.wrap} ${styles[size]}`}>
      {size === 'full' && (
        <div className={styles.labels}>
          <span className={styles.currentLabel} style={{ color: rank.color }}>
            {rank.name}
          </span>
          {!isMaxRank && (
            <span className={styles.nextLabel} style={{ color: nextRank.color }}>
              {nextRank.name}
            </span>
          )}
          {isMaxRank && (
            <span className={styles.maxLabel}>Max rank</span>
          )}
        </div>
      )}

      <div className={styles.track}>
        <div
          ref={fillRef}
          className={`${styles.fill} ${animated ? styles.fillAnimated : ''}`}
          style={{
            '--rank-color': rank.color,
            '--rank-glow': rank.glowColor,
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
          }}
        />
        {/* Shimmer effect */}
        <div className={styles.shimmer} />
      </div>

      {size === 'full' && (
        <div className={styles.stats}>
          <span className={styles.traceVal}>
            {formatTrace(trace)} Trace
          </span>
          {!isMaxRank && (
            <span className={styles.toNext}>
              {formatTrace(traceToNext)} to {nextRank.name}
            </span>
          )}
          {isMaxRank && (
            <span className={styles.toNext}>Inevitable.</span>
          )}
        </div>
      )}
    </div>
  )
}

function formatTrace(val) {
  const n = Number(val) || 0
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toFixed(0)
}
