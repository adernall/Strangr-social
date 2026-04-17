'use client'

import { createContext, useContext } from 'react'
import { useTrace } from '../hooks/useTrace'
import TraceGainFloat from './animations/TraceGainFloat'
import RankUpBanner from './animations/RankUpBanner'

const TraceContext = createContext({
  trace: 0,
  rank: null,
  nextRank: null,
  progress: 0,
  traceToNext: 0,
  loading: true,
  traceGain: null,
  rankUpEvent: null,
  awardTrace: async () => null,
  refetch: () => {},
})

export function TraceProvider({ children }) {
  const traceData = useTrace()

  return (
    <TraceContext.Provider value={traceData}>
      {children}
      <TraceGainFloat traceGain={traceData.traceGain} />
      <RankUpBanner rankUpEvent={traceData.rankUpEvent} />
    </TraceContext.Provider>
  )
}

// Safe hook — never throws, returns defaults if outside provider
export function useTraceContext() {
  return useContext(TraceContext)
}
