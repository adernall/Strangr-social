'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import AppShell from '../../../components/AppShell'
import styles from './profile.module.css'

export default function ProfilePage() {
  const { username } = useParams()
  const { user }     = useAuth()
  const router       = useRouter()

  const [profile, setProfile]         = useState(null)
  const [posts, setPosts]             = useState([])
  const [spacesOwned, setSpacesOwned] = useState([])
  const [spacesJoined, setSpacesJoined] = useState([])
  const [friendStatus, setFriendStatus] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [tab, setTab]                 = useState('works') // works | archive | notes

  useEffect(() => { if (username) load() }, [username, user])

  async function load() {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url, created_at')
      .eq('username', username)
      .maybeSingle()
    if (e || !data) { setError('Profile not found.'); setLoading(false); return }

    let extra = {}
    try {
      const { data: ex } = await supabase.from('profiles')
        .select('rank_name, trace, banner_url').eq('id', data.id).maybeSingle()
      if (ex) extra = ex
    } catch (_) {}

    setProfile({ ...data, ...extra })

    await Promise.all([
      supabase.from('posts')
        .select('id, content, image_url, likes_count, comments_count, created_at, space:space_id(name, slug, icon_url)')
        .eq('user_id', data.id).order('created_at', { ascending: false }).limit(30)
        .then(({ data: d }) => setPosts(d || [])),
      supabase.from('spaces').select('id, name, slug, icon_url, member_count, post_count')
        .eq('creator_id', data.id)
        .then(({ data: d }) => setSpacesOwned(d || [])),
      supabase.from('space_members')
        .select('space:space_id(id, name, slug, icon_url, member_count, creator_id)')
        .eq('user_id', data.id).neq('role', 'owner')
        .then(({ data: d }) => setSpacesJoined((d || []).map(x => x.space).filter(Boolean))),
    ])

    if (user && user.id !== data.id) {
      const [{ data: fr }, { data: sent }, { data: recv }] = await Promise.all([
        supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', data.id).maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id', user.id).eq('receiver_id', data.id).eq('status', 'pending').maybeSingle(),
        supabase.from('friend_requests').select('id').eq('sender_id', data.id).eq('receiver_id', user.id).eq('status', 'pending').maybeSingle(),
      ])
      setFriendStatus(fr ? 'friends' : sent ? 'pending_sent' : recv ? 'pending_received' : null)
    } else if (user?.id === data.id) {
      setFriendStatus('self')
    }

    setLoading(false)
  }

  async function addFriend() {
    if (!user) return router.push('/?auth=login')
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: profile.id })
    setFriendStatus('pending_sent')
  }

  async function acceptFriend() {
    const { data: req } = await supabase.from('friend_requests')
      .select('id').eq('sender_id', profile.id).eq('receiver_id', user.id).maybeSingle()
    if (req) {
      await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id)
      await supabase.from('friends').insert([{ user_id: user.id, friend_id: profile.id }, { user_id: profile.id, friend_id: user.id }])
      setFriendStatus('friends')
    }
  }

  async function message() {
    if (!user) return router.push('/?auth=login')
    const { data: ex } = await supabase.from('conversations').select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${profile.id}),and(participant_1.eq.${profile.id},participant_2.eq.${user.id})`)
      .maybeSingle()
    if (!ex) await supabase.from('conversations').insert({ participant_1: user.id, participant_2: profile.id })
    router.push('/inbox')
  }

  function timeAgo(ts) {
    if (!ts) return ''
    const d = Date.now() - new Date(ts)
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`
    if (d < 86400000) return `${Math.floor(d/3600000)}h ago`
    return `${Math.floor(d/86400000)}d ago`
  }

  if (loading) return <AppShell><div className={styles.center}><div className={styles.spinner} /></div></AppShell>
  if (error || !profile) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>{error || 'Profile not found.'}</p>
        <button className={styles.goBack} onClick={() => router.back()}>Go back</button>
      </div>
    </AppShell>
  )

  const isOwn = friendStatus === 'self'
  const allSpaces = [...spacesOwned, ...spacesJoined]

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Profile header */}
        <div className={styles.profileSection}>
          {/* Avatar */}
          <div className={styles.avatarWrap}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="" className={styles.avatar} />
              : <span className={styles.avatarFallback}>{(profile.username || 'U')[0].toUpperCase()}</span>
            }
          </div>

          {/* Info + actions */}
          <div className={styles.profileInfo}>
            <div className={styles.profileTop}>
              <div className={styles.profileNames}>
                <h1 className={styles.displayName}>
                  {(profile.display_name || profile.username || '').toUpperCase().split('').map((c, i) => c === ' ' ? '_' : c).join('')}
                </h1>
                {profile.rank_name && <span className={styles.rankBadge}>{profile.rank_name}</span>}
              </div>
              <div className={styles.profileActions}>
                {isOwn ? (
                  <button className={styles.btnPrimary} onClick={() => router.push('/dashboard')}>Edit Profile</button>
                ) : (
                  <>
                    {friendStatus === null && <button className={styles.btnPrimary} onClick={addFriend}>FOLLOW</button>}
                    {friendStatus === 'pending_sent' && <button className={styles.btnOutline} disabled>REQUESTED</button>}
                    {friendStatus === 'pending_received' && <button className={styles.btnPrimary} onClick={acceptFriend}>ACCEPT</button>}
                    {friendStatus === 'friends' && <button className={styles.btnOutline} disabled>FOLLOWING</button>}
                    <button className={styles.btnIcon} onClick={message} title="Message">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.stat} onClick={() => setTab('works')}>
                <span className={styles.statNum}>{posts.length}</span>
                <span className={styles.statLabel}>POSTS</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat} onClick={() => setTab('spaces')}>
                <span className={styles.statNum}>{allSpaces.length}</span>
                <span className={styles.statLabel}>SPACES</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statNum}>{Number(profile.trace || 0).toFixed(0)}</span>
                <span className={styles.statLabel}>TRACE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {['works', 'spaces'].map((t) => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
          <div className={styles.tabRight}>
            <button className={styles.viewToggle} title="Grid"><GridIcon /></button>
            <button className={styles.viewToggle} title="List"><ListIcon /></button>
          </div>
        </div>

        {/* Works grid */}
        {tab === 'works' && (
          <div className={styles.worksGrid}>
            {posts.length === 0 ? (
              <div className={styles.empty}><p>No posts yet.</p></div>
            ) : posts.map((post, i) => (
              <div
                key={post.id}
                className={`${styles.workCard} ${i === 0 ? styles.workCardFeatured : ''}`}
                onClick={() => router.push(`/posts/${post.id}`)}
              >
                {post.image_url && (
                  <div className={styles.workImgWrap}>
                    <img src={post.image_url} alt="" className={styles.workImg} />
                  </div>
                )}
                {post.space && (
                  <p className={styles.workSeries} onClick={(e) => { e.stopPropagation(); router.push(`/spaces/${post.space.slug}`) }}>
                    {post.space.name.toUpperCase()}
                  </p>
                )}
                <p className={styles.workTitle}>
                  {(post.content || '').length > 60 ? post.content.slice(0, 60).toUpperCase() + '…' : (post.content || '').toUpperCase()}
                </p>
                <div className={styles.workFooter}>
                  <span>❤ {post.likes_count || 0}</span>
                  <span>💬 {post.comments_count || 0}</span>
                  <span className={styles.workTime}>{timeAgo(post.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spaces */}
        {tab === 'spaces' && (
          <div>
            {spacesOwned.length > 0 && (
              <div className={styles.spaceSection}>
                <p className={styles.spaceSectionLabel}>CREATED</p>
                {spacesOwned.map((s) => <SpaceRow key={s.id} space={s} router={router} badge="LEAD" />)}
              </div>
            )}
            {spacesJoined.length > 0 && (
              <div className={styles.spaceSection}>
                <p className={styles.spaceSectionLabel}>JOINED</p>
                {spacesJoined.map((s) => <SpaceRow key={s.id} space={s} router={router} badge="MEM" />)}
              </div>
            )}
            {allSpaces.length === 0 && <div className={styles.empty}><p>No spaces.</p></div>}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function SpaceRow({ space, router, badge }) {
  if (!space) return null
  return (
    <div className={styles.spaceRow} onClick={() => router.push(`/spaces/${space.slug}`)}>
      <div className={styles.spaceIcon}>
        {space.icon_url ? <img src={space.icon_url} alt="" className={styles.spaceIconImg} /> : <span>{space.name[0]}</span>}
      </div>
      <div className={styles.spaceInfo}>
        <p className={styles.spaceName}>{space.name}</p>
        <p className={styles.spaceMeta}>{(space.member_count||0).toLocaleString()} members · {space.post_count||0} posts</p>
      </div>
      <span className={styles.spaceBadge}>{badge}</span>
    </div>
  )
}

function GridIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> }
function ListIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> }
