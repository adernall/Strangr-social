'use client'

import styles from './HexBadge.module.css'

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
  const iconPath = `/badges/${size}/${rankKey}.png`

  function handleImgError(e) {
    e.currentTarget.style.display = 'none'
    const fallback = e.currentTarget.parentNode.querySelector('[data-fallback]')
    if (fallback) fallback.style.display = 'flex'
  }

  return (
    <div
      className={[
        styles.badge,
        styles[size],
        animated ? styles.animated : '',
        showLevelUp ? styles.levelUp : '',
        onClick ? styles.clickable : '',
      ].join(' ')}
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
      <svg
        className={styles.hexSvg}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        width={dim.outer}
        height={dim.outer}
      >
        <polygon points="50,3 95,26 95,74 50,97 5,74 5,26" fill="var(--rank-color)" opacity="0.15" />
        <polygon points="50,3 95,26 95,74 50,97 5,74 5,26" fill="none" stroke="var(--rank-color)" strokeWidth="4" />
        <polygon points="50,12 87,31 87,69 50,88 13,69 13,31" fill="none" stroke="var(--rank-accent)" strokeWidth="1" opacity="0.4" />
      </svg>

      <div className={styles.iconWrap} style={{ width: dim.icon, height: dim.icon }}>
        {/* Plain img — no Next/Image to avoid 404 crashes */}
        <img
          src={iconPath}
          alt={rank.name}
          width={dim.icon}
          height={dim.icon}
          className={styles.icon}
          onError={handleImgError}
          style={{ display: 'block' }}
        />
        {/* Text symbol fallback shown if PNG missing */}
        <div
          data-fallback="true"
          className={styles.symbolFallback}
          style={{
            display: 'none',
            fontSize: Math.floor(dim.icon * 0.55),
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
