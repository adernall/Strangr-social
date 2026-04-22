'use client'

// ROOT CAUSE OF "Failed to load profile":
// The SELECT query includes columns like banner_url, trace, status that
// may not exist in the profiles table yet → Supabase returns an error
// → fetchErr is truthy → we show "Failed to load profile"
//
// FIX: Only select columns that definitely exist.
// Add the optional columns in a second safe query with try/catch.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import AppShell from '../../../components/AppShell'
import styles from './profile.module.css'

export default function ProfilePage() {
  const params   = useParams()
  const username = params?.username
  const { user } = useAuth()
  const router   = useRouter()

  const [profile, setProfile]     = useState(null)
  const [posts, setPosts]         = useState([])
  const [spacesOwned, setSpacesOwned]   = useState([])
  const [spacesJoined, setSpacesJoined] = useState([])
  const [friendStatus, setFriendStatus] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tab, setTab]             = useState('posts')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!username) return
    loadProfile()
  }, [username, user])

  async function loadProfile() {
    setLoading(true)
    setError(null)

    // SAFE query — only columns guaranteed to exist
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, created_at')
      .eq('username', username)
      .maybeSingle()

    if (fetchErr) {
      console.error('Profile fetch error:', fetchErr.message)
      setError(`Failed to load profile: ${fetchErr.message}`)
      setLoading(false)
      return
    }

    if (!data) {
      setError('User not found.')
      setLoading(false)
      return
    }

    // Try to get extra columns that may or may not exist
    let extraData = {}
    try {
      const { data: extra } = await supabase
        .from('profiles')
        .select('rank_name, trace, banner_url, status')
        .eq('id', data.id)
        .maybeSingle()
      if (extra) extraData = extra
    } catch (e) {
      // columns don't exist yet — no problem, we show defaults
    }

    setProfile({ ...data, ...extraData })

    // Load in parallel
    await Promise.all([
      loadPosts(data.id),
      loadSpacesOwned(data.id),
      loadSpacesJoined(data.id),
    ])

    if (user && user.id !== data.id) {
      await checkFriendStatus(data.id)
    }

    setLoading(false)
  }

  async function loadPosts(userId) {
    try {
      const { data } = await supabase
        .from('posts')
        .select(`
          id, content, image_url, likes_count, comments_count, created_at,
          space:space_id(id, name, slug, icon_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      setPosts(data || [])
    } catch (e) { setPosts([]) }
  }

  async function loadSpacesOwned(userId) {
    try {
      const { data } = await supabase
        .from('spaces')
        .select('id, name, slug, icon_url, member_count, post_count')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
      setSpacesOwned(data || [])
    } catch (e) { setSpacesOwned([]) }
  }

  async function loadSpacesJoined(userId) {
    try {
      const { data } = await supabase
        .from('space_members')
        .select('space:space_id(id, name, slug, icon_url, member_count, post_count, creator_id)')
        .eq('user_id', userId)
        .neq('role', 'owner')
      setSpacesJoined((data || []).map((d) => d.space).filter(Boolean))
    } catch (e) { setSpacesJoined([]) }
  }

  async function checkFriendStatus(profileId) {
    try {
      const [{ data: fr }, { data: sent }, { data: recv }] = await Promise.all([
        supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', profileId).maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id', user.id).eq('receiver_id', profileId).eq('status', 'pending').maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id', profileId).eq('receiver_id', user.id).eq('status', 'pending').maybeSingle(),
      ])
      if (fr) return setFriendStatus('friends')
      if (sent) return setFriendStatus('pending_sent')
      if (recv) return setFriendStatus('pending_received')
      setFriendStatus(null)
    } catch (e) { setFriendStatus(null) }
  }

  async function sendFriendRequest() {
    if (!user) return router.push('/?auth=login')
    setActionLoading(true)
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: profile.id })
    setFriendStatus('pending_sent')
    setActionLoading(false)
  }

  async function acceptRequest() {
    setActionLoading(true)
    try {
      const { data: req } = await supabase.from('friend_requests')
        .select('id').eq('sender_id', profile.id).eq('receiver_id', user.id).maybeSingle()
      if (req) {
        await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id)
        await supabase.from('friends').insert([
          { user_id: user.id, friend_id: profile.id },
          { user_id: profile.id, friend_id: user.id },
        ])
        setFriendStatus('friends')
      }
    } catch (e) {}
    setActionLoading(false)
  }

  async function sendMessage() {
    if (!user) return router.push('/?auth=login')
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${profile.id}),and(participant_1.eq.${profile.id},participant_2.eq.${user.id})`)
        .maybeSingle()
      if (!existing) {
        await supabase.from('conversations').insert({ participant_1: user.id, participant_2: profile.id })
      }
    } catch (e) {}
    router.push('/inbox')
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts)
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  function joinedDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // ── LOADING ──
  if (loading) return (
    <AppShell>
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading profile...</p>
      </div>
    </AppShell>
  )

  // ── ERROR ──
  if (error) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.goBackBtn} onClick={() => router.back()}>Go back</button>
      </div>
    </AppShell>
  )

  if (!profile) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>Profile not found.</p>
        <button className={styles.goBackBtn} onClick={() => router.push('/feed')}>Browse Feed</button>
      </div>
    </AppShell>
  )

  const isOwn = user?.id === profile.id
  const allSpaces = [...spacesOwned, ...spacesJoined]
  const traceVal = Number(profile.trace || 0)

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Banner */}
        <div
          className={styles.banner}
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        />

        {/* Header row */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarWrap}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} className={styles.avatar} />
                : <span className={styles.avatarFallback}>{(profile.username || '?')[0].toUpperCase()}</span>
              }
            </div>
            <div className={styles.nameBlock}>
              {/* Name + rank badge side by side */}
              <div className={styles.nameRow}>
                <h1 className={styles.displayName}>
                  {profile.display_name || profile.username}
                </h1>
                {profile.rank_name && (
                  <span className={styles.rankBadge}>{profile.rank_name}</span>
                )}
              </div>
              <p className={styles.usernameText}>@{profile.username}</p>
              {traceVal > 0 && (
                <p className={styles.traceText}>{traceVal.toFixed(0)} Trace</p>
              )}
              <p className={styles.joinedText}>Joined {joinedDate(profile.created_at)}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            {isOwn ? (
              <button className={styles.editBtn} onClick={() => router.push('/dashboard')}>
                Edit Profile
              </button>
            ) : user ? (
              <>
                {friendStatus === null && (
                  <button className={styles.addBtn} onClick={sendFriendRequest} disabled={actionLoading}>
                    + Add Friend
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button className={styles.pendingBtn} disabled>Request Sent</button>
                )}
                {friendStatus === 'pending_received' && (
                  <button className={styles.acceptBtn} onClick={acceptRequest} disabled={actionLoading}>
                    Accept Request
                  </button>
                )}
                {friendStatus === 'friends' && (
                  <span className={styles.friendsBadge}>✓ Friends</span>
                )}
                <button className={styles.msgBtn} onClick={sendMessage}>Message</button>
              </>
            ) : null}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.stat} onClick={() => setTab('posts')} style={{ cursor: 'pointer' }}>
            <span className={styles.statNum}>{posts.length}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.stat} onClick={() => setTab('spaces')} style={{ cursor: 'pointer' }}>
            <span className={styles.statNum}>{spacesOwned.length}</span>
            <span className={styles.statLabel}>Created</span>
          </div>
          <div className={styles.stat} onClick={() => setTab('spaces')} style={{ cursor: 'pointer' }}>
            <span className={styles.statNum}>{spacesJoined.length}</span>
            <span className={styles.statLabel}>Joined</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'posts' ? styles.activeTab : ''}`}
            onClick={() => setTab('posts')}
          >
            Posts
            <span className={styles.tabCount}>{posts.length}</span>
          </button>
          <button
            className={`${styles.tab} ${tab === 'spaces' ? styles.activeTab : ''}`}
            onClick={() => setTab('spaces')}
          >
            Spaces
            <span className={styles.tabCount}>{allSpaces.length}</span>
          </button>
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          <div className={styles.postsGrid}>
            {posts.length === 0 ? (
              <div className={styles.empty}>
                <p>No posts yet.</p>
              </div>
            ) : posts.map((post) => (
              <div
                key={post.id}
                className={styles.postCard}
                onClick={() => router.push(`/posts/${post.id}`)}
              >
                {/* Space link */}
                {post.space && (
                  <div
                    className={styles.postSpaceChip}
                    onClick={(e) => { e.stopPropagation(); router.push(`/spaces/${post.space.slug}`) }}
                  >
                    <div className={styles.postSpaceIcon}>
                      {post.space.icon_url
                        ? <img src={post.space.icon_url} alt="" className={styles.postSpaceIconImg} />
                        : <span>{post.space.name[0]}</span>
                      }
                    </div>
                    <span>{post.space.name}</span>
                  </div>
                )}

                {/* Image — natural ratio, no cropping */}
                {post.image_url && (
                  <img src={post.image_url} alt="" className={styles.postImage} />
                )}

                {/* Content */}
                <p className={styles.postContent}>
                  {post.content?.length > 200 ? post.content.slice(0, 200) + '…' : post.content}
                </p>

                {/* Footer */}
                <div className={styles.postFooter}>
                  <span className={styles.postStat}>❤ {post.likes_count || 0}</span>
                  <span className={styles.postStat}>💬 {post.comments_count || 0}</span>
                  <span className={styles.postTime}>{timeAgo(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spaces tab */}
        {tab === 'spaces' && (
          <div>
            {/* Spaces owned */}
            {spacesOwned.length > 0 && (
              <div className={styles.spacesSection}>
                <p className={styles.spacesSectionLabel}>CREATED SPACES</p>
                <div className={styles.spacesList}>
                  {spacesOwned.map((s) => (
                    <SpaceRow key={s.id} space={s} badge="Owner" router={router} />
                  ))}
                </div>
              </div>
            )}

            {/* Spaces joined */}
            {spacesJoined.length > 0 && (
              <div className={styles.spacesSection}>
                <p className={styles.spacesSectionLabel}>JOINED SPACES</p>
                <div className={styles.spacesList}>
                  {spacesJoined.map((s) => (
                    <SpaceRow key={s.id} space={s} badge="Member" router={router} />
                  ))}
                </div>
              </div>
            )}

            {allSpaces.length === 0 && (
              <div className={styles.empty}>
                <p>No spaces yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function SpaceRow({ space, badge, router }) {
  if (!space) return null
  return (
    <div
      className={styles.spaceRow}
      onClick={() => router.push(`/spaces/${space.slug}`)}
    >
      <div className={styles.spaceRowIcon}>
        {space.icon_url
          ? <img src={space.icon_url} alt="" className={styles.spaceRowIconImg} />
          : <span>{space.name[0].toUpperCase()}</span>
        }
      </div>
      <div className={styles.spaceRowInfo}>
        <p className={styles.spaceRowName}>{space.name}</p>
        <p className={styles.spaceRowMeta}>
          {(space.member_count || 0).toLocaleString()} members · {space.post_count || 0} posts
        </p>
      </div>
      <span className={`${styles.spaceBadge} ${badge === 'Owner' ? styles.ownerBadge : styles.memberBadge}`}>
        {badge}
      </span>
    </div>
  )
}
