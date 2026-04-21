'use client'

import styles from './GuidelineModal.module.css'

export default function GuidelineModal({ name, content, imageUrl, onClose }) {
  if (!content) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{name || 'Community Guidelines'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {imageUrl && (
          <div className={styles.imageWrap}>
            <img src={imageUrl} alt="" className={styles.image} />
          </div>
        )}

        <div className={styles.body}>
          <p className={styles.content}>{content}</p>
        </div>
      </div>
    </div>
  )
}
