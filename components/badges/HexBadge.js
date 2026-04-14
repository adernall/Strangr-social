// components/badges/HexBadge.js
// Base hexagon badge shape.
// All badge sizes use this component.
// You drop PNG icon files into:
//   components/badges/icons/small/  → 24x24px PNGs
//   components/badges/icons/medium/ → 48x48px PNGs
//   components/badges/icons/large/  → 96x96px PNGs
// File naming: newcomer.png, starter.png, mark.png, thread.png,
//              weave.png, anchor.png, vector.png, field.png, mass.png, inevitable.png

'use client'

import Image from 'next/image'
import styles from './HexBadge.module.css'

// size: 'small' | 'medium' | 'large'
// rank: rank object from data/ranks.js
// animated: show glow pulse animation
// showLevelUp: triggers pop animation
export default function HexBadge({
  rank,
  size = 'medium',
  animated = false,
  showLevelUp = false,
  onClick = null,
}) {
  if (!rank) return null

  const dimensions = {
    small:  { outer: 28, icon: 14 },
    medium: { outer: 52, icon: 26 },
    large:  { outer: 96, icon: 48 },
  }

  const dim = dimensions[size] || dimensions.medium
  const rankKey = rank.name.toLowerCase()

  // Try to load PNG icon — falls back to text symbol if image missing
  const iconSizes = { small: 'small', medium: 'medium', large: 'large' }
  const iconPath = `/badges/${iconSizes[size]}/${rankKey}.png`

  return (
    <div
      className={`
        ${styles.badge}
        ${styles[size]}
        ${animated ? styles.animated : ''}
        ${showLevelUp ? styles.levelUp : ''}
        ${onClick ? styles.clickable : ''}
      `}
      style={{
        '--rank-color': rank.color,
        '--rank-glow': rank.glowColor,
        '--rank-accent': rank.accentColor,
        width: dim.outer,
        height: dim.outer,
      }}
      onClick={onClick}
      title={rank.name}
    >
      {/* SVG hexagon shape */}
      <svg
        className={styles.hexSvg}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        width={dim.outer}
        height={dim.outer}
      >
        {/* Hex path: regular hexagon */}
        <polygon
          points="50,3 95,26 95,74 50,97 5,74 5,26"
          fill="var(--rank-color)"
          opacity="0.15"
        />
        <polygon
          points="50,3 95,26 95,74 50,97 5,74 5,26"
          fill="none"
          stroke="var(--rank-color)"
          strokeWidth="4"
        />
        {/* Inner hex ring for depth */}
        <polygon
          points="50,12 87,31 87,69 50,88 13,69 13,31"
          fill="none"
          stroke="var(--rank-accent)"
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>

      {/* Icon inside hex */}
      <div className={styles.iconWrap} style={{ width: dim.icon, height: dim.icon }}>
        <Image
          src={iconPath}
          alt={rank.name}
          width={dim.icon}
          height={dim.icon}
          className={styles.icon}
          onError={(e) => {
            // Fallback to text symbol if PNG missing
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'flex'
          }}
          unoptimized
        />
        {/* Text fallback */}
        <div
          className={styles.symbolFallback}
          style={{
            display: 'none',
            fontSize: dim.icon * 0.55,
            color: rank.color,
            width: dim.icon,
            height: dim.icon,
          }}
        >
          {rank.symbol}
        </div>
      </div>
    </div>
  )
}
