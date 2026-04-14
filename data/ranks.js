// data/ranks.js
// Single source of truth for all rank definitions.
// Color codes, thresholds, symbols — everything lives here.

export const RANKS = [
  {
    name: 'Newcomer',
    minTrace: 0,
    maxTrace: 49,
    color: '#6b7280',       // gray
    glowColor: 'rgba(107, 114, 128, 0.4)',
    accentColor: '#9ca3af',
    symbol: 'N',            // placeholder — you'll replace with PNG icons
    description: 'Just arrived. Your trace begins.',
    order: 0,
  },
  {
    name: 'Starter',
    minTrace: 50,
    maxTrace: 149,
    color: '#22c55e',       // green
    glowColor: 'rgba(34, 197, 94, 0.4)',
    accentColor: '#4ade80',
    symbol: 'S',
    description: 'You\'ve left your first mark.',
    order: 1,
  },
  {
    name: 'Mark',
    minTrace: 150,
    maxTrace: 399,
    color: '#3b82f6',       // blue
    glowColor: 'rgba(59, 130, 246, 0.4)',
    accentColor: '#60a5fa',
    symbol: 'M',
    description: 'Your presence is being noticed.',
    order: 2,
  },
  {
    name: 'Thread',
    minTrace: 400,
    maxTrace: 999,
    color: '#a855f7',       // purple
    glowColor: 'rgba(168, 85, 247, 0.4)',
    accentColor: '#c084fc',
    symbol: 'T',
    description: 'Connected. Woven into the fabric.',
    order: 3,
  },
  {
    name: 'Weave',
    minTrace: 1000,
    maxTrace: 2499,
    color: '#f59e0b',       // amber
    glowColor: 'rgba(245, 158, 11, 0.4)',
    accentColor: '#fcd34d',
    symbol: 'W',
    description: 'The pattern grows through you.',
    order: 4,
  },
  {
    name: 'Anchor',
    minTrace: 2500,
    maxTrace: 5999,
    color: '#ef4444',       // red
    glowColor: 'rgba(239, 68, 68, 0.4)',
    accentColor: '#f87171',
    symbol: 'A',
    description: 'Others orient around you.',
    order: 5,
  },
  {
    name: 'Vector',
    minTrace: 6000,
    maxTrace: 14999,
    color: '#06b6d4',       // cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
    accentColor: '#22d3ee',
    symbol: 'V',
    description: 'Directional force. Hard to ignore.',
    order: 6,
  },
  {
    name: 'Field',
    minTrace: 15000,
    maxTrace: 39999,
    color: '#f97316',       // orange
    glowColor: 'rgba(249, 115, 22, 0.4)',
    accentColor: '#fb923c',
    symbol: 'F',
    description: 'You shape the space around you.',
    order: 7,
  },
  {
    name: 'Mass',
    minTrace: 40000,
    maxTrace: 99999,
    color: '#ec4899',       // pink
    glowColor: 'rgba(236, 72, 153, 0.4)',
    accentColor: '#f472b6',
    symbol: 'Ms',
    description: 'Gravity. People are drawn to you.',
    order: 8,
  },
  {
    name: 'Inevitable',
    minTrace: 100000,
    maxTrace: Infinity,
    color: '#ffffff',       // white
    glowColor: 'rgba(255, 255, 255, 0.5)',
    accentColor: '#e0e0ff',
    symbol: 'I',
    description: 'You always were going to get here.',
    order: 9,
  },
]

// Quick lookup by name
export const RANK_MAP = Object.fromEntries(RANKS.map((r) => [r.name, r]))

// Get rank object from trace value
export function getRank(trace) {
  const t = Number(trace) || 0
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (t >= RANKS[i].minTrace) return RANKS[i]
  }
  return RANKS[0]
}

// Get next rank (null if at max)
export function getNextRank(currentRankName) {
  const current = RANK_MAP[currentRankName]
  if (!current) return null
  return RANKS[current.order + 1] || null
}

// Progress percentage to next rank (0–100)
export function getRankProgress(trace) {
  const t = Number(trace) || 0
  const current = getRank(t)
  const next = getNextRank(current.name)
  if (!next) return 100 // max rank

  const rangeStart = current.minTrace
  const rangeEnd = next.minTrace
  const progress = ((t - rangeStart) / (rangeEnd - rangeStart)) * 100
  return Math.min(Math.max(progress, 0), 100)
}

// How much trace needed to reach next rank
export function getTraceToNextRank(trace) {
  const t = Number(trace) || 0
  const current = getRank(t)
  const next = getNextRank(current.name)
  if (!next) return 0
  return Math.max(next.minTrace - t, 0)
}
