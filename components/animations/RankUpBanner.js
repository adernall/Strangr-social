// components/animations/RankUpBanner.js
'use client'

import { useEffect, useState } from 'react'
import HexBadge from '../badges/HexBadge'
import { RANK_MAP } from '../../data/ranks'
import styles from './RankUpBanner.module.css'

// rankUpEvent: { from: 'Thread', to: 'Weave' } | null
export default function RankUpBanner({ rankUpEvent }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!rankUpEvent) { setShow(false); return }
    setShow(true)
    const t = setTimeout(() => setShow(false), 4000)
    return () => clearTimeout(t)
  }, [rankUpEvent])

  if (!show || !rankUpEvent) return null

  const newRank = RANK_MAP[rankUpEvent.to]
  if (!newRank) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.banner}>
        <p className={styles.label}>RANK UP</p>
        <HexBadge rank={newRank} size="large" animated showLevelUp />
        <div className={styles.arrow}>→</div>
        <h2 className={styles.rankName} style={{ color: newRank.color }}>
          {newRank.name}
        </h2>
        <p className={styles.desc}>{newRank.description}</p>
      </div>
    </div>
  )
}
