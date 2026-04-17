'use client'

import { useEffect, useState } from 'react'
import styles from './TraceGainFloat.module.css'

export default function TraceGainFloat({ traceGain, position = 'bottom-right' }) {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    if (!traceGain) return
    setCurrent(traceGain)
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2400)
    return () => clearTimeout(t)
  }, [traceGain?.id])

  if (!visible || !current) return null

  return (
    <div
      key={current.id}
      className={`${styles.float} ${styles[position] || styles['bottom-right']}`}
    >
      +{current.amount} Trace
    </div>
  )
}
