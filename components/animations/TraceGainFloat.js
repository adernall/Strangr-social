// components/animations/TraceGainFloat.js
'use client'

import { useEffect, useState } from 'react'
import styles from './TraceGainFloat.module.css'

// traceGain: { amount: number, id: number } | null
// position: 'center' | 'bottom-right'
export default function TraceGainFloat({ traceGain, position = 'bottom-right' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!traceGain) { setVisible(false); return }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(t)
  }, [traceGain?.id])

  if (!visible || !traceGain) return null

  return (
    <div className={`${styles.float} ${styles[position]}`} key={traceGain.id}>
      +{traceGain.amount} Trace
    </div>
  )
}
