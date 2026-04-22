'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { toggleLike, checkLiked, formatPostTime } from '../../lib/feedEngine'
import styles from './PostCard.module.css'

// size: 'small' | 'medium' | 'large'
// In the bento feed, 'size' is set by the grid pattern
// but the actual card layout is driven by whether the post has an image
export default function PostCard({ post, size = 'medium' }) {
  const { user } = useAuth()
  const router   = useRouter()

  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(post?.likes_count || 0)
  const [liking, setLiking]       = useState(false)

  useEffect(() => {
    if (user && post?.id) checkLiked(post.id, user.id).then(setLiked)
  }, [post?.id, user?.id])

  if (!post) return null

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

  function goToPost()  { router.push(`/posts/${post.id}`) }
  function goToSpace(e) {
    e.stopPropagation()
    if (post.space?.slug) router.push(`/spaces/${post.space.slug}`)
  }
  function goToUser(e) {
    e.stopPropagation()
    if (post.user?.username) router.push(`/profile/${post.user.username}`)
  }

  const hasImage = !!post.image_url
  const isLarge  = size === 'large'
  const isSmall  = size === 'small'

  // Text truncation depends on size and whether there's an image
  const maxChars = hasImage
    ? (isLarge ? 200 : isSmall ? 50 : 100)
    : (isLarge ? 600 : isSmall ? 100 : 260)

  const displayContent = post.content?.length > maxChars
    ? post.content.slice(0, maxChars) + '…'
    : post.content

  return (
    <div
      className={[
        styles.card,
        styles[size],
        hasImage ? styles.hasImage : styles.textOnly,
      ].join(' ')}
      onClick={goToPost}
    >
      {/* Space badge */}
      {post.space && (
        <div className={styles.spaceBadge} onClick={goToSpace}>
          <div className={styles.spaceIcon}>
            {post.space.icon_url
              ? <img src={post.space.icon_url} alt="" className={styles.spaceIconImg} />
              : <span>{(post.space.name || '?')[0].toUpperCase()}</span>
            }
          </div>
          <span className={styles.spaceName}>{post.space.name}</span>
        </div>
      )}

      {/* Image — NATURAL RATIO, no forced cropping */}
      {hasImage && (
        <div className={styles.imageWrap}>
          <img
            src={post.image_url}
            alt=""
            className={styles.postImage}
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      {displayContent && (
        <p className={styles.content}>{displayContent}</p>
      )}

      {/* Tags */}
      {!isSmall && post.tags?.length > 0 && (
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

        <div className={styles.actionsRow}>
          <button
            className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
            onClick={handleLike}
            aria-label="Like"
          >
            <HeartIcon filled={liked} />
            <span>{likeCount}</span>
          </button>
          <button className={styles.commentBtn} onClick={goToPost} aria-label="Comments">
            <CommentIcon />
            <span>{post.comments_count || 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function HeartIcon({ filled }) {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
}
function CommentIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}
