'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { toggleLike, checkLiked, formatPostTime } from '../../lib/feedEngine'
import styles from './PostCard.module.css'

// size: 'small' | 'medium' | 'large'
export default function PostCard({ post, size = 'medium' }) {
  const { user } = useAuth()
  const router   = useRouter()

  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [liking, setLiking]       = useState(false)

  useEffect(() => {
    if (user) checkLiked(post.id, user.id).then(setLiked)
  }, [post.id, user?.id])

  async function handleLike(e) {
    e.stopPropagation()
    if (!user) { router.push('/?auth=login'); return }
    if (liking) return
    setLiking(true)
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => wasLiked ? c - 1 : c + 1)
    await toggleLike(post.id, user.id)
    setLiking(false)
  }

  function goToPost() { router.push(`/posts/${post.id}`) }

  function goToSpace(e) {
    e.stopPropagation()
    router.push(`/spaces/${post.space?.slug || post.space_id}`)
  }

  function goToUser(e) {
    e.stopPropagation()
    router.push(`/profile/${post.user?.username}`)
  }

  const isLarge  = size === 'large'
  const isSmall  = size === 'small'
  const maxChars = isLarge ? 400 : isSmall ? 80 : 180
  const truncated = post.content?.length > maxChars
  const displayContent = truncated ? post.content.slice(0, maxChars) + '…' : post.content

  return (
    <div className={`${styles.card} ${styles[size]}`} onClick={goToPost}>
      {/* Space badge */}
      <div className={styles.spaceBadge} onClick={goToSpace}>
        <div className={styles.spaceIcon}>
          {post.space?.icon_url
            ? <img src={post.space.icon_url} alt="" className={styles.spaceIconImg} />
            : <span>{(post.space?.name || '?')[0].toUpperCase()}</span>
          }
        </div>
        <span className={styles.spaceName}>{post.space?.name}</span>
      </div>

      {/* Image (large/medium only) */}
      {post.image_url && !isSmall && (
        <div className={styles.imageWrap}>
          <img src={post.image_url} alt="" className={styles.postImage} />
        </div>
      )}

      {/* Content */}
      <p className={styles.content}>{displayContent}</p>

      {/* Tags */}
      {post.tags?.length > 0 && !isSmall && (
        <div className={styles.tags}>
          {post.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.authorRow} onClick={goToUser}>
          <div className={styles.authorAvatar}>
            {post.user?.avatar_url
              ? <img src={post.user.avatar_url} alt="" className={styles.authorAvatarImg} />
              : <span>{(post.user?.username || '?')[0].toUpperCase()}</span>
            }
          </div>
          {!isSmall && <span className={styles.authorName}>@{post.user?.username}</span>}
          <span className={styles.postTime}>{formatPostTime(post.created_at)}</span>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
            onClick={handleLike}
          >
            <HeartIcon filled={liked} />
            <span>{likeCount}</span>
          </button>
          <button className={styles.commentBtn} onClick={goToPost}>
            <CommentIcon />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
