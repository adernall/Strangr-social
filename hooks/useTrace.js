'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getRank, getNextRank, getRankProgress, getTraceToNextRank } from '../data/ranks'
import { awardSessionTrace } from '../lib/traceService'

export function useTrace() {
  const { user } = useAuth()

  const [trace, setTrace]           = useState(0)
  const [rank, setRank]             = useState(null)
  const [nextRank, setNextRank]     = useState(null)
  const [progress, setProgress]     = useState(0)
  const [traceToNext, setTraceToNext] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [traceGain, setTraceGain]   = useState(null)
  const [rankUpEvent, setRankUpEvent] = useState(null)

  const prevTraceRef  = useRef(0)
  const prevRankRef   = useRef(null)
  const channelRef    = useRef(null)
  const mountedRef    = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function init() {
      setLoading(true)

      // Fetch current trace
      const { data } = await supabase
        .from('profiles')
        .select('trace, rank_name')
        .eq('id', user.id)
        .single()

      if (!cancelled && data) {
        const t = Number(data.trace) || 0
        prevTraceRef.current = t
        prevRankRef.current = data.rank_name
        updateLocalState(t, data.rank_name)
      }

      if (!cancelled) setLoading(false)

      // Subscribe AFTER fetch — build channel first, then subscribe once
      if (!cancelled) {
        // Clean up any old channel first
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }

        const ch = supabase.channel(`trace-user-${user.id}`)

        ch.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (!mountedRef.current) return
            const newTrace = Number(payload.new.trace) || 0
            const newRankName = payload.new.rank_name

            const gained = newTrace - prevTraceRef.current
            if (gained > 0.01) {
              const id = Date.now()
              setTraceGain({ amount: parseFloat(gained.toFixed(2)), id })
              setTimeout(() => { if (mountedRef.current) setTraceGain(null) }, 2500)
            }

            if (prevRankRef.current && newRankName !== prevRankRef.current) {
              setRankUpEvent({ from: prevRankRef.current, to: newRankName })
              setTimeout(() => { if (mountedRef.current) setRankUpEvent(null) }, 4000)
            }

            prevTraceRef.current = newTrace
            prevRankRef.current = newRankName
            updateLocalState(newTrace, newRankName)
          }
        )

        ch.subscribe()
        channelRef.current = ch
      }
    }

    init()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id])

  function updateLocalState(traceValue, rankName) {
    const t = Number(traceValue) || 0
    setTrace(t)
    setRank(getRank(t))
    setNextRank(getNextRank(getRank(t).name))
    setProgress(getRankProgress(t))
    setTraceToNext(getTraceToNextRank(t))
  }

  const awardTrace = useCallback(async (sessionData) => {
    if (!user) return null
    return awardSessionTrace({ userId: user.id, ...sessionData })
  }, [user?.id])

  return {
    trace, rank, nextRank, progress, traceToNext,
    loading, traceGain, rankUpEvent, awardTrace,
    refetch: () => {},
  }
}
