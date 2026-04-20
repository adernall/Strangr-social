'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import { fetchPost, fetchComments, toggleLike, checkLiked, formatPostTime } from '../../../lib/feedEngine'
import AppShell from '../../../components/AppShell'
import styles from './post.module.css'

export default function PostPage() {
  const { postId } = useParams()
  const { user }   = useAuth()
  const router     = useRouter()

  const [post, setPost]           = useState(null)
  const [comments, setComments]   = useState([])
  const [liked, setLiked]         = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting]     = useState(false)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadPost() }, [postId, user])

  async function loadPost() {
    setLoading(true)
    const [postData, commentsData] = await Promise.all([
      fetchPost(postId),
      fetchComments(postId),
    ])
    setPost(postData)
    setComments(commentsData)
    setLikeCount(postData?.likes_count || 0)
    if (user && postData) {
      const isLiked = await checkLiked(postData.id, user.id)
      setLiked(isLiked)
    }
    setLoading(false)
  }

  async function handleLike() {
    if (!user) { router.push('/?auth=login'); return }
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((c) => wasLiked ? c - 1 : c + 1)
    await toggleLike(post.id, user.id)
  }

  async function handleComment() {
    if (!user) { router.push('/?auth=login'); return }
    if (!commentText.trim()) return
    setPosting(true)

    const { data: comment } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, user_id: user.id, content: commentText.trim() })
      .select('id, content, created_at, user:user_id(id, username, avatar_url)')
      .single()

    if (comment) {
      setComments((prev) => [...prev, comment])
      setCommentText('')
    }
    setPosting(false)
  }

  async function handleDeleteComment(commentId) {
    await supabase.from('post_comments').delete().eq('id', commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
  }

  async function handleDeletePost() {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', post.id)
    router.push(`/spaces/${post.space?.slug || post.space_id}`)
  }

  if (loading) return (
    <AppShell>
      <div className={styles.loading}><div className={styles.spinner} /></div>
    </AppShell>
  )

  if (!post) return (
    <AppShell>
      <div className={styles.notFound}>Post not found.</div>
    </AppShell>
  )

  const isOwner = user?.id === post.user?.id

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.postCard}>
          {/* Space link */}
          <div
            className={styles.spaceLine}
            onClick={() => router.push(`/spaces/${post.space?.slug || post.space_id}`)}
          >
            <div className={styles.spaceIcon}>
              {post.space?.icon_url
                ? <img src={post.space.icon_url} alt="" className={styles.spaceIconImg} />
                : <span>{(post.space?.name || '?')[0].toUpperCase()}</span>
              }
            </div>
            <span className={styles.spaceName}>{post.space?.name}</span>
          </div>

          {/* Author */}
          <div
            className={styles.author}
            onClick={() => router.push(`/profile/${post.user?.username}`)}
          >
            <div className={styles.authorAvatar}>
              {post.user?.avatar_url
                ? <img src={post.user.avatar_url} alt="" className={styles.authorAvatarImg} />
                : <span>{(post.user?.username || '?')[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <p className={styles.authorName}>@{post.user?.username}</p>
              <p className={styles.postTime}>{formatPostTime(post.created_at)}</p>
            </div>
            {isOwner && (
              <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDeletePost() }}>
                Delete
              </button>
            )}
          </div>

          {/* Content */}
          <p className={styles.content}>{post.content}</p>

          {/* Image */}
          {post.image_url && (
            <img src={post.image_url} alt="" className={styles.postImage} />
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <span key={tag} className={styles.tag}>#{tag}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
              onClick={handleLike}
            >
              <HeartIcon filled={liked} />
              <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
            </button>
            <span className={styles.commentCount}>
              <CommentIcon /> {comments.length} comments
            </span>
          </div>
        </div>

        {/* Comments */}
        <div className={styles.commentsSection}>
          <h3 className={styles.commentsTitle}>Comments</h3>

          {/* Add comment */}
          {user && (
            <div className={styles.commentInput}>
              <div className={styles.commentAvatar}>
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} alt="" className={styles.commentAvatarImg} />
                  : <span>{(user.email || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div className={styles.commentInputRight}>
                <textarea
                  className={styles.commentTextarea}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() }
                  }}
                />
                <button
                  className={styles.commentSubmit}
                  onClick={handleComment}
                  disabled={posting || !commentText.trim()}
                >
                  {posting ? '...' : 'Comment'}
                </button>
              </div>
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className={styles.noComments}>No comments yet. Be the first!</p>
          ) : (
            <div className={styles.commentList}>
              {comments.map((c) => (
                <div key={c.id} className={styles.commentRow}>
                  <div
                    className={styles.commentAvatar}
                    onClick={() => router.push(`/profile/${c.user?.username}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {c.user?.avatar_url
                      ? <img src={c.user.avatar_url} alt="" className={styles.commentAvatarImg} />
                      : <span>{(c.user?.username || '?')[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <span
                        className={styles.commentAuthor}
                        onClick={() => router.push(`/profile/${c.user?.username}`)}
                      >
                        @{c.user?.username}
                      </span>
                      <span className={styles.commentTime}>{formatPostTime(c.created_at)}</span>
                      {user?.id === c.user?.id && (
                        <button
                          className={styles.deleteComment}
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className={styles.commentText}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function HeartIcon({ filled }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
}

function CommentIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
}
