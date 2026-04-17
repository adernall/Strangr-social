'use client'

import { useEffect, useState } from 'react'
import HexBadge from '../badges/HexBadge'
import { RANK_MAP } from '../../data/ranks'
import styles from './RankUpBanner.module.css'

export default function RankUpBanner({ rankUpEvent }) {
  const [show, setShow] = useState(false)
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    if (!rankUpEvent?.to) { setShow(false); return }
    setCurrent(rankUpEvent)
    setShow(true)
    const t = setTimeout(() => setShow(false), 4000)
    return () => clearTimeout(t)
  }, [rankUpEvent?.to])

  if (!show || !current) return null

  const newRank = RANK_MAP[current.to]
  if (!newRank) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.banner}>
        <p className={styles.label}>RANK UP</p>
        <HexBadge rank={newRank} size="large" animated showLevelUp />
        <h2 className={styles.rankName} style={{ color: newRank.color }}>
          {newRank.name}
        </h2>
        <p className={styles.desc}>{newRank.description}</p>
      </div>
    </div>
  )
}
