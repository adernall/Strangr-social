'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/AuthContext'
import { fetchFeedPosts, fetchUserSpaces } from '../../lib/feedEngine'
import AppShell from '../../components/AppShell'
import PostCard from '../../components/posts/PostCard'
import styles from './feed.module.css'

const ALL_TAGS = ['tech','art','gaming','music','science','sports','movies','food','travel','design','crypto','anime']

// Assign bento sizes in a repeating pattern
function getBentoSize(index) {
  const pattern = ['large', 'small', 'small', 'medium', 'medium', 'small', 'large', 'small', 'medium', 'small']
  return pattern[index % pattern.length]
}

export default function FeedPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [posts, setPosts]         = useState([])
  const [mySpaces, setMySpaces]   = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [page, setPage]           = useState(0)
  const [loading, setLoading]     = useState(true)
  const [hasMore, setHasMore]     = useState(true)

  useEffect(() => {
    loadFeed(0, activeTag, true)
    if (user) fetchUserSpaces(user.id).then(setMySpaces)
  }, [user, activeTag])

  async function loadFeed(pageNum = 0, tag = null, reset = false) {
    setLoading(true)
    const data = await fetchFeedPosts({ page: pageNum, limit: 18, tagFilter: tag })
    setPosts((prev) => reset ? data : [...prev, ...data])
    setHasMore(data.length === 18)
    setPage(pageNum)
    setLoading(false)
  }

  function handleTagFilter(tag) {
    setActiveTag(tag === activeTag ? null : tag)
  }

  function loadMore() {
    if (!loading && hasMore) loadFeed(page + 1, activeTag)
  }

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.topLeft}>
            <h1 className={styles.feedTitle}>Feed</h1>
            <p className={styles.feedSub}>Posts from across all spaces</p>
          </div>
          <div className={styles.topRight}>
            {user && (
              <button className={styles.createSpaceBtn} onClick={() => router.push('/spaces/create')}>
                + New Space
              </button>
            )}
          </div>
        </div>

        {/* My Spaces row */}
        {mySpaces.length > 0 && (
          <div className={styles.mySpacesRow}>
            <p className={styles.mySpacesLabel}>YOUR SPACES</p>
            <div className={styles.mySpacesScroll}>
              {mySpaces.map((space) => (
                <div
                  key={space.id}
                  className={styles.mySpaceChip}
                  onClick={() => router.push(`/spaces/${space.slug}`)}
                >
                  <div className={styles.mySpaceIcon}>
                    {space.icon_url
                      ? <img src={space.icon_url} alt="" className={styles.mySpaceIconImg} />
                      : <span>{space.name[0].toUpperCase()}</span>
                    }
                  </div>
                  <span>{space.name}</span>
                </div>
              ))}
              <div
                className={`${styles.mySpaceChip} ${styles.mySpaceAdd}`}
                onClick={() => router.push('/spaces/create')}
              >
                <span>+</span>
                <span>New</span>
              </div>
            </div>
          </div>
        )}

        {/* Tag filters */}
        <div className={styles.tagFilters}>
          <button
            className={`${styles.tagFilter} ${!activeTag ? styles.tagFilterActive : ''}`}
            onClick={() => handleTagFilter(null)}
          >
            All
          </button>
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              className={`${styles.tagFilter} ${activeTag === tag ? styles.tagFilterActive : ''}`}
              onClick={() => handleTagFilter(tag)}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Bento Grid */}
        {loading && posts.length === 0 ? (
          <div className={styles.loadingGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`${styles.skeleton} ${styles[getBentoSize(i)]}`} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p>No posts yet.</p>
            <p className={styles.emptySub}>Create a space and start posting!</p>
            {user && (
              <button className={styles.createSpaceBtn2} onClick={() => router.push('/spaces/create')}>
                Create a Space →
              </button>
            )}
          </div>
        ) : (
          <div className={styles.bentoGrid}>
            {posts.map((post, i) => (
              <div key={post.id} className={`${styles.bentoItem} ${styles[getBentoSize(i)]}`}>
                <PostCard post={post} size={getBentoSize(i)} />
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && posts.length > 0 && (
          <div className={styles.loadMoreWrap}>
            <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
