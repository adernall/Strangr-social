'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { toggleLike, checkLiked, formatPostTime } from '../../lib/feedEngine'
import styles from './BentoPost.module.css'

export default function BentoPost({ post, size = 'medium' }) {
  const { user } = useAuth()
  const router   = useRouter()
  const [liked, setLiked]     = useState(false)
  const [count, setCount]     = useState(post.likes_count || 0)
  const [liking, setLiking]   = useState(false)

  useEffect(() => {
    if (user) checkLiked(post.id, user.id).then(setLiked)
  }, [post.id, user?.id])

  async function handleLike(e) {
    e.stopPropagation()
    if (!user) { router.push('/?auth=login'); return }
    if (liking) return
    setLiking(true)
    setLiked((v) => !v)
    setCount((c) => liked ? c - 1 : c + 1)
    await toggleLike(post.id, user.id)
    setLiking(false)
  }

  const maxChars = size === 'large' ? 320 : size === 'medium' ? 140 : 70
  const text = post.content?.length > maxChars
    ? post.content.slice(0, maxChars) + '…'
    : post.content

  return (
    <div className={`${styles.card} ${styles[size]}`} onClick={() => router.push(`/posts/${post.id}`)}>
      {post.image_url && (
        <div className={styles.imgWrap}>
          <img src={post.image_url} alt="" className={styles.img} />
        </div>
      )}

      <div className={styles.body}>
        <p className={styles.text}>{text}</p>

        {post.tags?.length > 0 && size !== 'small' && (
          <div className={styles.tags}>
            {post.tags.slice(0, 2).map((t) => (
              <span key={t} className={styles.tag}>#{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.author} onClick={(e) => { e.stopPropagation(); router.push(`/profile/${post.user?.username}`) }}>
          <div className={styles.authorAvatar}>
            {post.user?.avatar_url
              ? <img src={post.user.avatar_url} alt="" className={styles.authorAvatarImg} />
              : <span>{(post.user?.username || '?')[0].toUpperCase()}</span>
            }
          </div>
          {size !== 'small' && <span className={styles.authorName}>@{post.user?.username}</span>}
          <span className={styles.time}>{formatPostTime(post.created_at)}</span>
        </div>

        <div className={styles.actions}>
          <button className={`${styles.likeBtn} ${liked ? styles.liked : ''}`} onClick={handleLike}>
            <HeartIcon filled={liked} />
            <span>{count}</span>
          </button>
          <span className={styles.commentCount}>
            <CommentIcon />{post.comments_count || 0}
          </span>
        </div>
      </div>
    </div>
  )
}

function HeartIcon({ filled }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
}
function CommentIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}
