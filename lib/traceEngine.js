// lib/traceEngine.js
// Core Trace calculation logic.
// All formulas live here — never duplicate these elsewhere.

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SESSION_CAP_MINUTES = 60      // sessions capped at 60 min for calc
const MAX_NEW_CONTACTS_PER_DAY = 7  // network spread limit
const REDUCED_NETWORK_RATE = 0.5    // trace per new contact after daily cap
const NETWORK_RATE = 3              // trace per new contact within cap
const DECAY_RATE = 0.08             // 8% weekly decay when inactive
const DECAY_GRACE_DAYS = 7          // no decay within 7 days of last activity
const MIN_QUALITY_SCORE = 0.5
const MAX_QUALITY_SCORE = 2.0
const DEFAULT_QUALITY_SCORE = 1.0

// ─── TIME TRACE ───────────────────────────────────────────────────────────────
// timeTrace = sqrt(activeMinutesSession), capped at 60 min
export function calcTimeTrace(activeMinutes) {
  const capped = Math.min(Math.max(activeMinutes, 0), SESSION_CAP_MINUTES)
  return Math.sqrt(capped)
}

// ─── CONVERSATION TRACE ───────────────────────────────────────────────────────
// Based on message count depth
export function calcConvoTrace(messageCount) {
  const n = Math.max(messageCount, 0)
  if (n < 5)  return 0.5
  if (n < 10) return 2
  if (n < 20) return 5
  return 10
}

// ─── RETURN INTERACTION MULTIPLIER ───────────────────────────────────────────
// How many times these two users have chatted before
export function getReturnMultiplier(interactionCount) {
  if (interactionCount <= 1) return 1.0
  if (interactionCount === 2) return 1.5
  if (interactionCount === 3) return 2.0
  if (interactionCount === 4) return 2.2
  return 2.5 // 5+
}

// ─── NETWORK TRACE ───────────────────────────────────────────────────────────
// Trace gained from meeting new users
// newContactsToday = how many new contacts already made today
export function calcNetworkTrace(isNewContact, newContactsToday) {
  if (!isNewContact) return 0
  if (newContactsToday < MAX_NEW_CONTACTS_PER_DAY) {
    return NETWORK_RATE
  }
  return REDUCED_NETWORK_RATE
}

// ─── FINAL TRACE FOR A SESSION ────────────────────────────────────────────────
// Combines all components and applies quality score multiplier
export function calcSessionTrace({
  activeMinutes,
  messageCount,
  returnInteractionCount,  // how many times chatted with this partner before
  isNewContact,
  newContactsToday,
  qualityScore = DEFAULT_QUALITY_SCORE,
}) {
  const clampedQuality = Math.min(
    Math.max(qualityScore, MIN_QUALITY_SCORE),
    MAX_QUALITY_SCORE
  )

  const time    = calcTimeTrace(activeMinutes)
  const convo   = calcConvoTrace(messageCount)
  const network = calcNetworkTrace(isNewContact, newContactsToday)
  const returnMult = getReturnMultiplier(returnInteractionCount)

  // Return multiplier applies to time + convo component
  const rawScore = (time + convo) * returnMult + network

  const finalTrace = rawScore * clampedQuality

  return {
    time,
    convo,
    network,
    returnMult,
    rawScore,
    qualityScore: clampedQuality,
    finalTrace: Math.max(parseFloat(finalTrace.toFixed(4)), 0),
    breakdown: {
      activeMinutes,
      messageCount,
      returnInteractionCount,
      isNewContact,
      newContactsToday,
    },
  }
}

// ─── WEEKLY DECAY ─────────────────────────────────────────────────────────────
// Returns the new trace after decay.
// Called server-side on a schedule or on user login after inactivity.
export function applyWeeklyDecay(currentTrace, lastActiveAt) {
  if (!lastActiveAt) return currentTrace

  const now = new Date()
  const last = new Date(lastActiveAt)
  const daysSinceActive = (now - last) / (1000 * 60 * 60 * 24)

  if (daysSinceActive < DECAY_GRACE_DAYS) {
    // Within grace period — no decay
    return { newTrace: currentTrace, decayAmount: 0, weeksInactive: 0 }
  }

  // Calculate full weeks of inactivity beyond grace period
  const weeksInactive = Math.floor((daysSinceActive - DECAY_GRACE_DAYS) / 7)

  if (weeksInactive <= 0) {
    return { newTrace: currentTrace, decayAmount: 0, weeksInactive: 0 }
  }

  // Compound decay: trace × (1 - 0.08)^weeks
  const decayFactor = Math.pow(1 - DECAY_RATE, weeksInactive)
  const newTrace = currentTrace * decayFactor
  const decayAmount = currentTrace - newTrace

  return {
    newTrace: Math.max(parseFloat(newTrace.toFixed(4)), 0),
    decayAmount: parseFloat(decayAmount.toFixed(4)),
    weeksInactive,
  }
}

// ─── SHADOW SCORE ─────────────────────────────────────────────────────────────
// Hidden multiplier. Calculated from behavior signals.
// score range: 0.5 → 2.0
// Signals that raise it: long sessions, return interactions, diverse network
// Signals that lower it: very short sessions (spam), never returning
export function calcShadowScore({
  avgSessionMinutes = 5,
  returnInteractionRatio = 0,  // 0.0–1.0 (what % of chats are returns)
  networkDiversity = 0,        // unique people met
  flagCount = 0,               // how many times flagged/reported
  currentShadowScore = DEFAULT_QUALITY_SCORE,
}) {
  let score = currentShadowScore

  // Adjust up for quality signals
  if (avgSessionMinutes > 10) score += 0.02
  if (avgSessionMinutes > 20) score += 0.03
  if (returnInteractionRatio > 0.2) score += 0.05
  if (returnInteractionRatio > 0.5) score += 0.05
  if (networkDiversity > 10) score += 0.02
  if (networkDiversity > 50) score += 0.03

  // Adjust down for bad signals
  if (avgSessionMinutes < 2) score -= 0.05    // spam sessions
  if (flagCount > 0) score -= flagCount * 0.1 // each flag hurts

  return Math.min(Math.max(parseFloat(score.toFixed(4)), MIN_QUALITY_SCORE), MAX_QUALITY_SCORE)
}

export { MAX_NEW_CONTACTS_PER_DAY, DECAY_GRACE_DAYS, DEFAULT_QUALITY_SCORE }
