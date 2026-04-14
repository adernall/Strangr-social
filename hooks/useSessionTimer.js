// hooks/useSessionTimer.js
'use client'

import { useEffect, useRef, useState } from 'react'

const IDLE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes without activity = idle
const TICK_INTERVAL_MS = 10 * 1000    // check every 10 seconds

// Tracks how many ACTIVE minutes a user has spent in a session.
// Pauses when user is idle (no mouse/keyboard/scroll activity).
export function useSessionTimer() {
  const [activeMinutes, setActiveMinutes] = useState(0)
  const activeSecondsRef = useRef(0)
  const lastActivityRef = useRef(Date.now())
  const tickRef = useRef(null)

  useEffect(() => {
    // Record any activity
    const recordActivity = () => {
      lastActivityRef.current = Date.now()
    }

    window.addEventListener('mousemove', recordActivity, { passive: true })
    window.addEventListener('keydown', recordActivity, { passive: true })
    window.addEventListener('scroll', recordActivity, { passive: true })
    window.addEventListener('touchstart', recordActivity, { passive: true })

    // Tick every 10 seconds — only count if not idle
    tickRef.current = setInterval(() => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivityRef.current

      if (timeSinceActivity < IDLE_TIMEOUT_MS) {
        // User is active — count these 10 seconds
        activeSecondsRef.current += 10
        setActiveMinutes(activeSecondsRef.current / 60)
      }
    }, TICK_INTERVAL_MS)

    return () => {
      clearInterval(tickRef.current)
      window.removeEventListener('mousemove', recordActivity)
      window.removeEventListener('keydown', recordActivity)
      window.removeEventListener('scroll', recordActivity)
      window.removeEventListener('touchstart', recordActivity)
    }
  }, [])

  function resetTimer() {
    activeSecondsRef.current = 0
    setActiveMinutes(0)
  }

  return {
    activeMinutes,
    resetTimer,
  }
}
