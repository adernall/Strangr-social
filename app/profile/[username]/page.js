'use client'

// ROOT CAUSE OF BUG:
// 1. useParams() was not imported or param name was wrong
// 2. .single() throws error when no row found instead of returning null
// 3. No loading/error/null UI states
// FIX: use maybeSingle(), add all states, correct param name

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import AppShell from '../../../components/AppShell'
import styles from './profile.module.css'

export default function ProfilePage() {
  const params   = useParams()
  const username = params?.username   // ← correct dynamic param
  const { user } = useAuth()
  const router   = useRouter()

  const [profile, setProfile]       = useState(null)
  const [posts, setPosts]           = useState([])
  const [friendStatus, setFriendStatus] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [tab, setTab]               = useState('posts')

  useEffect(() => {
    if (!username) return
    loadProfile()
  }, [username, user])

  async function loadProfile() {
    setLoading(true)
    setError(null)

    // maybeSingle() returns null (not error) when no row found
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, banner_url, rank_name, trace, created_at, status')
      .eq('username', username)
      .maybeSingle()

    if (fetchErr) {
      setError('Failed to load profile.')
      setLoading(false)
      return
    }

    if (!data) {
      setError('User not found.')
      setLoading(false)
      return
    }

    setProfile(data)

    // Load their posts
    const { data: postsData } = await supabase
      .from('posts')
      .select('id, content, image_url, likes_count, comments_count, created_at, space:space_id(name, slug, icon_url)')
      .eq('user_id', data.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setPosts(postsData || [])

    // Check friend status if logged in
    if (user && user.id !== data.id) {
      await checkFriendStatus(data.id)
    }

    setLoading(false)
  }

  async function checkFriendStatus(profileId) {
    const [{ data: fr }, { data: sent }, { data: recv }] = await Promise.all([
      supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', profileId).maybeSingle(),
      supabase.from('friend_requests').select('id').eq('sender_id', user.id).eq('receiver_id', profileId).eq('status', 'pending').maybeSingle(),
      supabase.from('friend_requests').select('id').eq('sender_id', profileId).eq('receiver_id', user.id).eq('status', 'pending').maybeSingle(),
    ])
    if (fr)   return setFriendStatus('friends')
    if (sent) return setFriendStatus('pending_sent')
    if (recv) return setFriendStatus('pending_received')
    setFriendStatus(null)
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
    setActionLoading(false)
  }

  async function sendMessage() {
    // Find or create conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${profile.id}),and(participant_1.eq.${profile.id},participant_2.eq.${user.id})`
      )
      .maybeSingle()

    if (existing) {
      router.push('/inbox')
    } else {
      await supabase.from('conversations').insert({
        participant_1: user.id,
        participant_2: profile.id,
      })
      router.push('/inbox')
    }
  }

  function formatDate(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts)
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  // ── LOADING ──
  if (loading) return (
    <AppShell>
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    </AppShell>
  )

  // ── ERROR ──
  if (error) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.backBtn} onClick={() => router.back()}>Go back</button>
      </div>
    </AppShell>
  )

  // ── NOT FOUND (should never reach here after error check, but safety net) ──
  if (!profile) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>Profile not found.</p>
        <button className={styles.backBtn} onClick={() => router.push('/feed')}>Browse Feed</button>
      </div>
    </AppShell>
  )

  const isOwnProfile = user?.id === profile.id

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Banner */}
        <div
          className={styles.banner}
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})` } : {}}
        />

        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.avatarWrap}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className={styles.avatar} />
                : <span className={styles.avatarFallback}>{(profile.username || '?')[0].toUpperCase()}</span>
              }
            </div>
            <div className={styles.nameBlock}>
              <h1 className={styles.displayName}>
                {profile.display_name || profile.username}
              </h1>
              <p className={styles.usernameText}>@{profile.username}</p>
              {profile.rank_name && (
                <span className={styles.rankBadge}>{profile.rank_name}</span>
              )}
            </div>
          </div>

          <div className={styles.headerRight}>
            {isOwnProfile ? (
              <button className={styles.editBtn} onClick={() => router.push('/dashboard')}>
                Edit Profile
              </button>
            ) : (
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
                {user && (
                  <button className={styles.msgBtn} onClick={sendMessage}>
                    Message
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className={styles.bio}>{profile.bio}</p>
        )}

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statNum}>{posts.length}</span>
            <span className={styles.statLabel}>Posts</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{Number(profile.trace || 0).toFixed(0)}</span>
            <span className={styles.statLabel}>Trace</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{formatDate(profile.created_at)}</span>
            <span className={styles.statLabel}>Joined</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'posts' ? styles.activeTab : ''}`} onClick={() => setTab('posts')}>
            Posts <span className={styles.tabCount}>{posts.length}</span>
          </button>
        </div>

        {/* Posts */}
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
              {post.space && (
                <div className={styles.postSpace} onClick={(e) => { e.stopPropagation(); router.push(`/spaces/${post.space.slug}`) }}>
                  <div className={styles.postSpaceIcon}>
                    {post.space.icon_url ? <img src={post.space.icon_url} alt="" className={styles.postSpaceIconImg} /> : <span>{post.space.name[0]}</span>}
                  </div>
                  <span>{post.space.name}</span>
                </div>
              )}
              <p className={styles.postContent}>
                {post.content?.length > 120 ? post.content.slice(0, 120) + '…' : post.content}
              </p>
              {post.image_url && (
                <img src={post.image_url} alt="" className={styles.postImg} />
              )}
              <div className={styles.postMeta}>
                <span>❤ {post.likes_count}</span>
                <span>💬 {post.comments_count}</span>
                <span>{formatTime(post.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
