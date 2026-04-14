// components/TraceProvider.js
'use client'

import { createContext, useContext } from 'react'
import { useTrace } from '../hooks/useTrace'
import TraceGainFloat from './animations/TraceGainFloat'
import RankUpBanner from './animations/RankUpBanner'

const TraceContext = createContext(null)

export function TraceProvider({ children }) {
  const traceData = useTrace()

  return (
    <TraceContext.Provider value={traceData}>
      {children}
      {/* Global animations that can trigger from anywhere */}
      <TraceGainFloat traceGain={traceData.traceGain} />
      <RankUpBanner rankUpEvent={traceData.rankUpEvent} />
    </TraceContext.Provider>
  )
}

// Hook: use anywhere in the app
export function useTraceContext() {
  const ctx = useContext(TraceContext)
  if (!ctx) throw new Error('useTraceContext must be used inside TraceProvider')
  return ctx
}
