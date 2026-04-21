'use client'

// ROOT CAUSE FIXES:
// 1. useParams().slug was correct but fetchSpace was called with wrong var
// 2. No null guard after fetchSpace returned undefined
// 3. Role check happened before space loaded

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import {
  fetchSpace, fetchSpacePosts, fetchSpaceMembers,
  getMemberRole, joinSpace, leaveSpace, formatPostTime
} from '../../../lib/feedEngine'
import AppShell from '../../../components/AppShell'
import PostCard from '../../../components/posts/BentoPost'
import GuidelineModal from '../../../components/spaces/GuidelineModal'
import styles from './space.module.css'

// Deterministic bento sizes based on index
function getBentoSize(index) {
  const pattern = ['large', 'small', 'small', 'medium', 'medium', 'small', 'large', 'small', 'medium', 'small']
  return pattern[index % pattern.length]
}

export default function SpacePage() {
  const { slug }  = useParams()   // ← correct param name
  const { user }  = useAuth()
  const router    = useRouter()

  const [space, setSpace]           = useState(null)
  const [posts, setPosts]           = useState([])
  const [members, setMembers]       = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [myRole, setMyRole]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [joining, setJoining]       = useState(false)
  const [tab, setTab]               = useState('posts')
  const [showGuideline, setShowGuideline] = useState(false)

  useEffect(() => {
    if (slug) loadAll()
  }, [slug, user])

  useEffect(() => {
    if (!memberSearch.trim()) { setFilteredMembers(members); return }
    setFilteredMembers(members.filter((m) => m.user?.username?.toLowerCase().includes(memberSearch.toLowerCase())))
  }, [memberSearch, members])

  async function loadAll() {
    setLoading(true)
    setError(null)

    const spaceData = await fetchSpace(slug)

    if (!spaceData) {
      setError('Space not found.')
      setLoading(false)
      return
    }

    const [postsData, membersData] = await Promise.all([
      fetchSpacePosts(spaceData.id),
      fetchSpaceMembers(spaceData.id),
    ])

    setSpace(spaceData)
    setPosts(postsData || [])
    setMembers(membersData || [])
    setFilteredMembers(membersData || [])

    if (user) {
      const role = await getMemberRole(spaceData.id, user.id)
      setMyRole(role)
    }

    setLoading(false)
  }

  async function handleJoin() {
    if (!user) return router.push('/?auth=login')
    if (!space) return
    setJoining(true)
    if (space.is_private) {
      await supabase.from('space_requests').upsert({ space_id: space.id, user_id: user.id })
      alert('Join request sent.')
    } else {
      await joinSpace(space.id, user.id)
      setMyRole('member')
      setSpace((s) => ({ ...s, member_count: (s.member_count || 0) + 1 }))
    }
    setJoining(false)
  }

  async function handleLeave() {
    if (!user || !space) return
    await leaveSpace(space.id, user.id)
    setMyRole(null)
    setSpace((s) => ({ ...s, member_count: Math.max((s.member_count || 1) - 1, 0) }))
  }

  // Get trending tags from posts
  function getTrendingTags() {
    if (!space?.tags?.length) return []
    return space.tags.slice(0, 8)
  }

  // ── LOADING ──
  if (loading) return (
    <AppShell>
      <div className={styles.center}><div className={styles.spinner} /></div>
    </AppShell>
  )

  // ── ERROR ──
  if (error || !space) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>{error || 'Space not found.'}</p>
        <button className={styles.backBtn} onClick={() => router.push('/feed')}>Browse Feed</button>
      </div>
    </AppShell>
  )

  const isMember  = !!myRole
  const isManager = myRole === 'owner' || myRole === 'admin'
  const trendingTags = getTrendingTags()
  const hasGuideline = !!space.guideline_content

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Banner */}
        <div
          className={styles.banner}
          style={space.banner_url ? { backgroundImage: `url(${space.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        />

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.spaceIcon}>
              {space.icon_url
                ? <img src={space.icon_url} alt="" className={styles.spaceIconImg} />
                : <span>{space.name[0].toUpperCase()}</span>
              }
            </div>
            <div>
              <h1 className={styles.spaceName}>{space.name}</h1>
              <p className={styles.spaceMeta}>
                {(space.member_count || 0).toLocaleString()} members · {space.post_count || 0} posts
                {space.is_private && ' · 🔒 Private'}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {isManager && (
              <button className={styles.settingsBtn} onClick={() => router.push(`/spaces/${slug}/settings`)}>
                ⚙ Manage
              </button>
            )}
            {isMember ? (
              <button className={styles.leaveBtn} onClick={handleLeave}>Leave</button>
            ) : (
              <button className={styles.joinBtn} onClick={handleJoin} disabled={joining}>
                {joining ? '...' : space.is_private ? '🔒 Request to Join' : 'Join Space'}
              </button>
            )}
            {isMember && (
              <button className={styles.postBtn} onClick={() => router.push(`/spaces/${slug}/posts/create`)}>
                + Post
              </button>
            )}
          </div>
        </div>

        {/* Tags row */}
        {space.tags?.length > 0 && (
          <div className={styles.tagsRow}>
            {space.tags.map((tag) => <span key={tag} className={styles.tag}>#{tag}</span>)}
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          {['posts', 'members', 'about'].map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'posts' && <span className={styles.tabCount}>{posts.length}</span>}
              {t === 'members' && <span className={styles.tabCount}>{members.length}</span>}
            </button>
          ))}
        </div>

        {/* ── MAIN LAYOUT: 70/30 split ── */}
        <div className={styles.contentLayout}>
          {/* LEFT: posts / members / about */}
          <div className={styles.mainCol}>
            {tab === 'posts' && (
              posts.length === 0 ? (
                <div className={styles.empty}>
                  <p>No posts yet.</p>
                  {isMember && (
                    <button className={styles.firstPostBtn} onClick={() => router.push(`/spaces/${slug}/posts/create`)}>
                      Be the first to post →
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
              )
            )}

            {tab === 'members' && (
              <div className={styles.membersList}>
                {members.map((m) => (
                  <div
                    key={m.user?.id}
                    className={styles.memberRow}
                    onClick={() => router.push(`/profile/${m.user?.username}`)}
                  >
                    <div className={styles.memberAvatar}>
                      {m.user?.avatar_url
                        ? <img src={m.user.avatar_url} alt="" className={styles.memberAvatarImg} />
                        : <span>{(m.user?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.memberInfo}>
                      <p className={styles.memberName}>@{m.user?.username}</p>
                      <p className={styles.memberMeta}>Joined {formatPostTime(m.joined_at)}</p>
                    </div>
                    {m.role !== 'member' && (
                      <span className={`${styles.roleBadge} ${m.role === 'owner' ? styles.ownerBadge : styles.adminBadge}`}>
                        {m.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'about' && (
              <div className={styles.aboutSection}>
                {space.description && (
                  <div className={styles.aboutBlock}>
                    <p className={styles.aboutLabel}>DESCRIPTION</p>
                    <p className={styles.aboutText}>{space.description}</p>
                  </div>
                )}
                {space.about && (
                  <div className={styles.aboutBlock}>
                    <p className={styles.aboutLabel}>ABOUT</p>
                    <p className={styles.aboutText}>{space.about}</p>
                  </div>
                )}
                <div className={styles.aboutBlock}>
                  <p className={styles.aboutLabel}>CREATED BY</p>
                  <div className={styles.creatorRow} onClick={() => router.push(`/profile/${space.creator?.username}`)}>
                    <div className={styles.memberAvatar}>
                      {space.creator?.avatar_url
                        ? <img src={space.creator.avatar_url} alt="" className={styles.memberAvatarImg} />
                        : <span>{(space.creator?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <p className={styles.memberName}>@{space.creator?.username}</p>
                  </div>
                </div>
                {/* Mobile: tags + guideline in about section */}
                {space.tags?.length > 0 && (
                  <div className={`${styles.aboutBlock} ${styles.mobileOnly}`}>
                    <p className={styles.aboutLabel}>TAGS</p>
                    <div className={styles.tagsRow}>
                      {space.tags.map((tag) => <span key={tag} className={styles.tag}>#{tag}</span>)}
                    </div>
                  </div>
                )}
                {hasGuideline && (
                  <div className={`${styles.aboutBlock} ${styles.mobileOnly}`}>
                    <button className={styles.guidelineBtn} onClick={() => setShowGuideline(true)}>
                      <span>📋</span> {space.guideline_name || 'Community Guidelines'}
                    </button>
                  </div>
                )}
                {space.invite_token && isMember && (
                  <div className={styles.aboutBlock}>
                    <p className={styles.aboutLabel}>INVITE LINK</p>
                    <div className={styles.inviteRow}>
                      <code className={styles.inviteLink}>
                        {`https://strangr-social.onrender.com/spaces/join/${space.invite_token}`}
                      </code>
                      <button
                        className={styles.copyBtn}
                        onClick={() => navigator.clipboard.writeText(`https://strangr-social.onrender.com/spaces/join/${space.invite_token}`)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: sidebar panel (desktop only) */}
          <aside className={styles.sidePanel}>
            {/* Space info */}
            <div className={styles.sidePanelCard}>
              <p className={styles.sidePanelTitle}>{space.name}</p>
              <p className={styles.sidePanelSince}>Since {new Date(space.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              {space.description && (
                <p className={styles.sidePanelDesc}>{space.description}</p>
              )}
            </div>

            {/* Trending tags */}
            {trendingTags.length > 0 && (
              <div className={styles.sidePanelCard}>
                <p className={styles.sidePanelLabel}>TRENDING TAGS</p>
                <div className={styles.trendingTags}>
                  {trendingTags.map((tag) => (
                    <button key={tag} className={styles.trendingTag}>#{tag}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className={styles.sidePanelCard}>
              <p className={styles.sidePanelLabel}>MEMBERS ({members.length})</p>
              <input
                className={styles.memberSearchInput}
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <div className={styles.sideMembers}>
                {filteredMembers.slice(0, 8).map((m) => (
                  <div
                    key={m.user?.id}
                    className={styles.sideMemberRow}
                    onClick={() => router.push(`/profile/${m.user?.username}`)}
                  >
                    <div className={styles.sideMemberAvatar}>
                      {m.user?.avatar_url
                        ? <img src={m.user.avatar_url} alt="" className={styles.sideMemberAvatarImg} />
                        : <span>{(m.user?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.sideMemberInfo}>
                      <p className={styles.sideMemberName}>@{m.user?.username}</p>
                      {m.user?.rank_name && <p className={styles.sideMemberRank}>{m.user.rank_name}</p>}
                    </div>
                    {m.role !== 'member' && (
                      <span className={`${styles.sideRoleBadge} ${m.role === 'owner' ? styles.ownerBadge : styles.adminBadge}`}>
                        {m.role}
                      </span>
                    )}
                  </div>
                ))}
                {filteredMembers.length > 8 && (
                  <button className={styles.viewAllMembersBtn} onClick={() => setTab('members')}>
                    View all {filteredMembers.length} members →
                  </button>
                )}
              </div>
            </div>

            {/* Guidelines */}
            {hasGuideline && (
              <button className={styles.guidelineCard} onClick={() => setShowGuideline(true)}>
                <span className={styles.guidelineIcon}>📋</span>
                <div>
                  <p className={styles.guidelineName}>{space.guideline_name || 'Community Guidelines'}</p>
                  <p className={styles.guidelineHint}>Click to view</p>
                </div>
                <span className={styles.guidelineArrow}>→</span>
              </button>
            )}
          </aside>
        </div>
      </div>

      {/* Guideline modal */}
      {showGuideline && (
        <GuidelineModal
          name={space.guideline_name}
          content={space.guideline_content}
          imageUrl={space.guideline_image_url}
          onClose={() => setShowGuideline(false)}
        />
      )}
    </AppShell>
  )
}
