// hooks/useTrace.js
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { getRank, getNextRank, getRankProgress, getTraceToNextRank } from '../data/ranks'
import { awardSessionTrace } from '../lib/traceService'

export function useTrace() {
  const { user } = useAuth()

  const [trace, setTrace] = useState(0)
  const [rank, setRank] = useState(null)
  const [nextRank, setNextRank] = useState(null)
  const [progress, setProgress] = useState(0)
  const [traceToNext, setTraceToNext] = useState(0)
  const [loading, setLoading] = useState(true)

  // Animation state
  const [traceGain, setTraceGain] = useState(null) // { amount, id } for floating animation
  const [rankUpEvent, setRankUpEvent] = useState(null) // { from, to } for rank up animation

  const prevTraceRef = useRef(0)
  const prevRankRef = useRef(null)

  // Load initial trace data
  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetchTrace()
    subscribeToTrace()
  }, [user])

  async function fetchTrace() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('trace, rank_name')
      .eq('id', user.id)
      .single()

    if (data) {
      updateLocalState(data.trace, data.rank_name)
      prevTraceRef.current = data.trace
      prevRankRef.current = data.rank_name
    }
    setLoading(false)
  }

  function subscribeToTrace() {
  const channel = supabase
    .channel(`trace-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        const newTrace = payload.new.trace
        const newRankName = payload.new.rank_name

        const gained = newTrace - prevTraceRef.current
        if (gained > 0.01) {
          triggerGainAnimation(gained)
        }

        if (prevRankRef.current && newRankName !== prevRankRef.current) {
          setRankUpEvent({ from: prevRankRef.current, to: newRankName })
          setTimeout(() => setRankUpEvent(null), 4000)
        }

        prevTraceRef.current = newTrace
        prevRankRef.current = newRankName
        updateLocalState(newTrace, newRankName)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}function subscribeToTrace() {
  const channel = supabase
    .channel(`trace-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        const newTrace = payload.new.trace
        const newRankName = payload.new.rank_name

        const gained = newTrace - prevTraceRef.current
        if (gained > 0.01) {
          triggerGainAnimation(gained)
        }

        if (prevRankRef.current && newRankName !== prevRankRef.current) {
          setRankUpEvent({ from: prevRankRef.current, to: newRankName })
          setTimeout(() => setRankUpEvent(null), 4000)
        }

        prevTraceRef.current = newTrace
        prevRankRef.current = newRankName
        updateLocalState(newTrace, newRankName)
      }
    )
    .subscribe()

  return () => channel.unsubscribe()
}

  function updateLocalState(traceValue, rankName) {
    const t = Number(traceValue) || 0
    const r = getRank(t)
    const nr = getNextRank(r.name)
    const p = getRankProgress(t)
    const tn = getTraceToNextRank(t)

    setTrace(t)
    setRank(r)
    setNextRank(nr)
    setProgress(p)
    setTraceToNext(tn)
  }

  function triggerGainAnimation(amount) {
    const id = Date.now()
    setTraceGain({ amount: parseFloat(amount.toFixed(2)), id })
    setTimeout(() => setTraceGain(null), 2500)
  }

  // Award trace from a completed session
  const awardTrace = useCallback(async (sessionData) => {
    if (!user) return null
    const result = await awardSessionTrace({
      userId: user.id,
      ...sessionData,
    })
    return result
  }, [user])

  return {
    trace,
    rank,
    nextRank,
    progress,
    traceToNext,
    loading,
    traceGain,      // for floating animation
    rankUpEvent,    // for rank up animation
    awardTrace,     // call this when session ends
    refetch: fetchTrace,
  }
}
