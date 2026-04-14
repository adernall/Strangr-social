// lib/traceService.js
// All database interactions for the Trace system.
// Import this wherever you need to read or write trace data.

import { supabase } from './supabase'
import { calcSessionTrace, applyWeeklyDecay, calcShadowScore } from './traceEngine'
import { getRank } from '../data/ranks'

// ─── AWARD TRACE AFTER A SESSION ─────────────────────────────────────────────
// Call this when a chat session ends (anonymous or DM)
export async function awardSessionTrace({
  userId,
  partnerId = null,       // null for anonymous
  sessionType = 'anonymous', // 'anonymous' | 'dm' | 'group'
  activeMinutes,
  messageCount,
}) {
  try {
    // 1. Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('trace, shadow_score, quality_score, rank_name, last_active_at')
      .eq('id', userId)
      .single()

    if (!profile) return null

    // 2. Check return interactions with this partner
    let returnCount = 1
    let isNewContact = false

    if (partnerId) {
      const { data: existing } = await supabase
        .from('trace_network')
        .select('interaction_count')
        .eq('user_id', userId)
        .eq('contact_id', partnerId)
        .single()

      if (existing) {
        returnCount = existing.interaction_count + 1
        isNewContact = false
      } else {
        returnCount = 1
        isNewContact = true
      }
    } else {
      // Anonymous — each session is "new"
      isNewContact = true
    }

    // 3. Get today's new contact count
    const today = new Date().toISOString().split('T')[0]
    const { data: dailyLimit } = await supabase
      .from('trace_daily_limits')
      .select('new_contacts_today')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    const newContactsToday = dailyLimit?.new_contacts_today || 0

    // 4. Apply any pending decay first
    const decayResult = applyWeeklyDecay(profile.trace, profile.last_active_at)
    let currentTrace = decayResult.newTrace

    // Log decay if it happened
    if (decayResult.decayAmount > 0) {
      await supabase.from('trace_events').insert({
        user_id: userId,
        event_type: 'decay',
        amount: decayResult.decayAmount,
        multiplier: 1.0,
        final_amount: -decayResult.decayAmount,
        meta: { weeks_inactive: decayResult.weeksInactive },
      })
    }

    // 5. Calculate trace earned this session
    const result = calcSessionTrace({
      activeMinutes,
      messageCount,
      returnInteractionCount: returnCount,
      isNewContact,
      newContactsToday,
      qualityScore: profile.quality_score || 1.0,
    })

    const newTrace = currentTrace + result.finalTrace
    const newRankObj = getRank(newTrace)
    const rankChanged = newRankObj.name !== profile.rank_name

    // 6. Update profile
    await supabase
      .from('profiles')
      .update({
        trace: newTrace,
        rank_name: newRankObj.name,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // 7. Log the trace event
    await supabase.from('trace_events').insert({
      user_id: userId,
      event_type: sessionType,
      amount: result.rawScore,
      multiplier: result.qualityScore,
      final_amount: result.finalTrace,
      meta: {
        ...result.breakdown,
        time_component: result.time,
        convo_component: result.convo,
        network_component: result.network,
        return_mult: result.returnMult,
        partner_id: partnerId,
      },
    })

    // 8. Update network contact
    if (partnerId) {
      const { data: netExists } = await supabase
        .from('trace_network')
        .select('id, interaction_count')
        .eq('user_id', userId)
        .eq('contact_id', partnerId)
        .single()

      if (netExists) {
        await supabase
          .from('trace_network')
          .update({ interaction_count: netExists.interaction_count + 1 })
          .eq('id', netExists.id)
      } else {
        await supabase.from('trace_network').insert({
          user_id: userId,
          contact_id: partnerId,
        })
      }
    }

    // 9. Update daily limit if new contact
    if (isNewContact) {
      const { data: limitRow } = await supabase
        .from('trace_daily_limits')
        .select('id, new_contacts_today')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      if (limitRow) {
        await supabase
          .from('trace_daily_limits')
          .update({ new_contacts_today: limitRow.new_contacts_today + 1 })
          .eq('id', limitRow.id)
      } else {
        await supabase.from('trace_daily_limits').insert({
          user_id: userId,
          date: today,
          new_contacts_today: 1,
        })
      }
    }

    // 10. Log rank change if happened
    if (rankChanged) {
      await supabase.from('rank_history').insert({
        user_id: userId,
        from_rank: profile.rank_name,
        to_rank: newRankObj.name,
        trace_at_change: newTrace,
      })
    }

    return {
      traceEarned: result.finalTrace,
      newTrace,
      oldTrace: currentTrace,
      rankChanged,
      newRank: newRankObj.name,
      oldRank: profile.rank_name,
      breakdown: result,
    }
  } catch (err) {
    console.error('[traceService] awardSessionTrace error:', err)
    return null
  }
}

// ─── GET USER TRACE PROFILE ───────────────────────────────────────────────────
export async function getUserTraceProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('trace, rank_name, shadow_score, quality_score, last_active_at, username, avatar_url')
    .eq('id', userId)
    .single()
  return data
}

// ─── GET TRACE HISTORY ────────────────────────────────────────────────────────
export async function getTraceHistory(userId, limit = 20) {
  const { data } = await supabase
    .from('trace_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

// ─── GET RANK HISTORY ─────────────────────────────────────────────────────────
export async function getRankHistory(userId) {
  const { data } = await supabase
    .from('rank_history')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false })
  return data || []
}

// ─── UPDATE SHADOW/QUALITY SCORE ─────────────────────────────────────────────
export async function updateShadowScore(userId) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shadow_score')
      .eq('id', userId)
      .single()

    // Gather behavioral signals
    const { data: sessions } = await supabase
      .from('trace_sessions')
      .select('active_minutes, is_return, quality_flag')
      .eq('user_id', userId)
      .eq('processed', true)
      .limit(50)

    if (!sessions?.length) return

    const avgSessionMinutes = sessions.reduce((s, r) => s + (r.active_minutes || 0), 0) / sessions.length
    const returnCount = sessions.filter((s) => s.is_return).length
    const returnInteractionRatio = returnCount / sessions.length
    const flagCount = sessions.filter((s) => s.quality_flag === -1).length

    const { data: network } = await supabase
      .from('trace_network')
      .select('id')
      .eq('user_id', userId)

    const networkDiversity = network?.length || 0

    const newShadow = calcShadowScore({
      avgSessionMinutes,
      returnInteractionRatio,
      networkDiversity,
      flagCount,
      currentShadowScore: profile?.shadow_score || 1.0,
    })

    await supabase
      .from('profiles')
      .update({ shadow_score: newShadow, quality_score: newShadow })
      .eq('id', userId)

    return newShadow
  } catch (err) {
    console.error('[traceService] updateShadowScore error:', err)
  }
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
export async function getLeaderboard(limit = 50) {
  const { data } = await supabase
    .from('profiles')
    .select('username, avatar_url, trace, rank_name')
    .order('trace', { ascending: false })
    .limit(limit)
  return data || []
}
