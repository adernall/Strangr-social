'use client'

import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import {
  fetchSpace, fetchSpacePosts, fetchSpaceMembers,
  getMemberRole, joinSpace, leaveSpace, formatPostTime
} from '../../../lib/feedEngine'
import AppShell from '../../../components/AppShell'
import PostCard from '../../../components/posts/PostCard'
import styles from './space.module.css'

export default function SpacePage() {
  const { spaceId } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [space, setSpace]       = useState(null)
  const [posts, setPosts]       = useState([])
  const [members, setMembers]   = useState([])
  const [myRole, setMyRole]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [joining, setJoining]   = useState(false)
  const [tab, setTab]           = useState('posts') // 'posts' | 'members' | 'about'

  useEffect(() => {
    loadAll()
  }, [spaceId, user])

  async function loadAll() {
    setLoading(true)
    const [spaceData, postsData, membersData] = await Promise.all([
      fetchSpace(spaceId),
      fetchSpacePosts(spaceId),
      fetchSpaceMembers(spaceId),
    ])
    setSpace(spaceData)
    setPosts(postsData)
    setMembers(membersData)
    if (user && spaceData) {
      const role = await getMemberRole(spaceData.id, user.id)
      setMyRole(role)
    }
    setLoading(false)
  }

  async function handleJoin() {
    if (!user) return router.push('/?auth=login')
    setJoining(true)
    if (space.is_private) {
      // Send join request
      await supabase.from('space_requests').upsert({ space_id: space.id, user_id: user.id })
      alert('Join request sent. Wait for approval.')
    } else {
      await joinSpace(space.id, user.id)
      setMyRole('member')
      setSpace((s) => ({ ...s, member_count: (s.member_count || 0) + 1 }))
    }
    setJoining(false)
  }

  async function handleLeave() {
    if (!user) return
    await leaveSpace(space.id, user.id)
    setMyRole(null)
    setSpace((s) => ({ ...s, member_count: Math.max((s.member_count || 1) - 1, 0) }))
  }

  if (loading) return (
    <AppShell>
      <div className={styles.loading}><div className={styles.spinner} /></div>
    </AppShell>
  )

  if (!space) return (
    <AppShell>
      <div className={styles.notFound}>
        <p>Space not found.</p>
        <button onClick={() => router.push('/')}>Go home</button>
      </div>
    </AppShell>
  )

  const isMember  = !!myRole
  const isManager = myRole === 'owner' || myRole === 'admin'

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Banner */}
        <div
          className={styles.banner}
          style={space.banner_url ? { backgroundImage: `url(${space.banner_url})` } : {}}
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
                {space.member_count.toLocaleString()} members · {space.post_count} posts
                {space.is_private && ' · 🔒 Private'}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            {isManager && (
              <button className={styles.settingsBtn} onClick={() => router.push(`/spaces/${spaceId}/settings`)}>
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
              <button
                className={styles.postBtn}
                onClick={() => router.push(`/spaces/${spaceId}/posts/create`)}
              >
                + Post
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {space.tags?.length > 0 && (
          <div className={styles.tags}>
            {space.tags.map((tag) => (
              <span key={tag} className={styles.tag}>#{tag}</span>
            ))}
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

        {/* Posts tab */}
        {tab === 'posts' && (
          <div className={styles.postsGrid}>
            {posts.length === 0 ? (
              <div className={styles.empty}>
                <p>No posts yet.</p>
                {isMember && (
                  <button className={styles.firstPostBtn} onClick={() => router.push(`/spaces/${spaceId}/posts/create`)}>
                    Be the first to post →
                  </button>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <PostCard key={post.id} post={post} size="medium" />
              ))
            )}
          </div>
        )}

        {/* Members tab */}
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
                  <p className={styles.memberJoined}>Joined {formatPostTime(m.joined_at)}</p>
                </div>
                {m.role !== 'member' && (
                  <span className={`${styles.roleBadge} ${m.role === 'owner' ? styles.ownerBadge : styles.adminBadge}`}>
                    {m.role}
                  </span>
                )}
                {isManager && m.user?.id !== user?.id && (
                  <MemberActions
                    member={m}
                    spaceId={space.id}
                    adminId={user?.id}
                    onRefresh={loadAll}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* About tab */}
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
              <div
                className={styles.creatorRow}
                onClick={() => router.push(`/profile/${space.creator?.username}`)}
              >
                <div className={styles.memberAvatar}>
                  {space.creator?.avatar_url
                    ? <img src={space.creator.avatar_url} alt="" className={styles.memberAvatarImg} />
                    : <span>{(space.creator?.username || '?')[0].toUpperCase()}</span>
                  }
                </div>
                <p className={styles.memberName}>@{space.creator?.username}</p>
              </div>
            </div>
            {space.invite_token && isMember && (
              <div className={styles.aboutBlock}>
                <p className={styles.aboutLabel}>INVITE LINK</p>
                <div className={styles.inviteRow}>
                  <code className={styles.inviteLink}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/spaces/join/${space.invite_token}` : ''}
                  </code>
                  <button
                    className={styles.copyBtn}
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/spaces/join/${space.invite_token}`)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function MemberActions({ member, spaceId, adminId, onRefresh }) {
  const [open, setOpen] = useState(false)

  async function makeAdmin() {
    await supabase.from('space_members')
      .update({ role: 'admin' })
      .eq('space_id', spaceId)
      .eq('user_id', member.user?.id)
    setOpen(false)
    onRefresh()
  }

  async function removeAdmin() {
    await supabase.from('space_members')
      .update({ role: 'member' })
      .eq('space_id', spaceId)
      .eq('user_id', member.user?.id)
    setOpen(false)
    onRefresh()
  }

  async function removeMember() {
    await supabase.from('space_members')
      .delete()
      .eq('space_id', spaceId)
      .eq('user_id', member.user?.id)
    setOpen(false)
    onRefresh()
  }

  return (
    <div className={styles.memberActionsWrap}>
      <button className={styles.memberActionDot} onClick={() => setOpen(!open)}>⋮</button>
      {open && (
        <div className={styles.memberDropdown}>
          {member.role === 'member' && (
            <button className={styles.memberDropItem} onClick={makeAdmin}>Make Admin</button>
          )}
          {member.role === 'admin' && (
            <button className={styles.memberDropItem} onClick={removeAdmin}>Remove Admin</button>
          )}
          <button className={styles.memberDropItemDanger} onClick={removeMember}>Remove from Space</button>
        </div>
      )}
    </div>
  )
}
