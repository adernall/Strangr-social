'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './search.module.css'

export default function SearchPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [query, setQuery]           = useState('')
  const [userResults, setUserResults] = useState([])
  const [spaceResults, setSpaceResults] = useState([])
  const [selected, setSelected]     = useState(null)
  const [selectedType, setSelectedType] = useState(null) // 'user' | 'space'
  const [friendStatus, setFriendStatus] = useState(null)
  const [searching, setSearching]   = useState(false)
  const [tab, setTab]               = useState('all') // 'all' | 'users' | 'spaces'
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (query.trim()) doSearch()
    else { setUserResults([]); setSpaceResults([]) }
  }, [query, tab])

  useEffect(() => {
    if (selected && selectedType === 'user' && user) {
      fetchFriendStatus(selected.id)
    }
  }, [selected])

  async function doSearch() {
    setSearching(true)
    const promises = []

    if (tab === 'all' || tab === 'users') {
      promises.push(
        supabase
          .from('profiles')
          .select('id, username, avatar_url, bio, rank_name, trace')
          .ilike('username', `%${query}%`)
          .neq('role', 'admin')
          .limit(15)
      )
    } else {
      promises.push(Promise.resolve({ data: [] }))
    }

    if (tab === 'all' || tab === 'spaces') {
      promises.push(
        supabase
          .from('spaces')
          .select('id, name, slug, icon_url, description, member_count, post_count, tags')
          .or(`name.ilike.%${query}%,description.ilike.%${query}%,slug.ilike.%${query}%`)
          .limit(15)
      )
    } else {
      promises.push(Promise.resolve({ data: [] }))
    }

    const [usersRes, spacesRes] = await Promise.all(promises)
    setUserResults(usersRes.data || [])
    setSpaceResults(spacesRes.data || [])
    setSearching(false)
  }

  async function fetchFriendStatus(profileId) {
    if (!user || profileId === user.id) return setFriendStatus('self')

    const { data: fr } = await supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', profileId).single()
    if (fr) return setFriendStatus('friends')

    const { data: sent } = await supabase.from('friend_requests').select('id').eq('sender_id', user.id).eq('receiver_id', profileId).eq('status', 'pending').single()
    if (sent) return setFriendStatus('pending_sent')

    const { data: recv } = await supabase.from('friend_requests').select('id').eq('sender_id', profileId).eq('receiver_id', user.id).eq('status', 'pending').single()
    if (recv) return setFriendStatus('pending_received')

    setFriendStatus(null)
  }

  async function sendFriendRequest() {
    if (!user) return router.push('/?auth=login')
    setActionLoading(true)
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: selected.id })
    setActionLoading(false)
    setFriendStatus('pending_sent')
  }

  async function acceptRequest() {
    setActionLoading(true)
    const { data: req } = await supabase.from('friend_requests').select('id').eq('sender_id', selected.id).eq('receiver_id', user.id).single()
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.id)
    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: selected.id },
      { user_id: selected.id, friend_id: user.id },
    ])
    setActionLoading(false)
    setFriendStatus('friends')
  }

  const totalResults = userResults.length + spaceResults.length

  function selectUser(u) { setSelected(u); setSelectedType('user'); setFriendStatus(null) }
  function selectSpace(s) { setSelected(s); setSelectedType('space') }

  return (
    <AppShell noPadding>
      <div className={styles.layout}>
        {/* LEFT — search + results */}
        <div className={styles.leftPanel}>
          <div className={styles.searchBox}>
            <button className={styles.backBtn} onClick={() => router.back()}>←</button>
            <input
              className={styles.searchInput}
              placeholder="Search users and spaces..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Tabs */}
          <div className={styles.tabRow}>
            {['all', 'users', 'spaces'].map((t) => (
              <button
                key={t}
                className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.resultsList}>
            {searching && <p className={styles.hint}>Searching...</p>}

            {!searching && query && totalResults === 0 && (
              <p className={styles.hint}>No results for "{query}"</p>
            )}

            {/* Users */}
            {userResults.length > 0 && (
              <>
                {(tab === 'all') && <p className={styles.sectionLabel}>USERS</p>}
                {userResults.map((u) => (
                  <div
                    key={u.id}
                    className={`${styles.resultRow} ${selected?.id === u.id && selectedType === 'user' ? styles.activeResult : ''}`}
                    onClick={() => selectUser(u)}
                  >
                    <div className={styles.resultAvatar}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className={styles.resultAvatarImg} /> : <span>{u.username[0].toUpperCase()}</span>}
                    </div>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>@{u.username}</p>
                      {u.bio && <p className={styles.resultSub}>{u.bio}</p>}
                    </div>
                    {u.rank_name && <span className={styles.rankTag}>{u.rank_name}</span>}
                  </div>
                ))}
              </>
            )}

            {/* Spaces */}
            {spaceResults.length > 0 && (
              <>
                {(tab === 'all') && <p className={styles.sectionLabel} style={{ marginTop: userResults.length > 0 ? '1rem' : 0 }}>SPACES</p>}
                {spaceResults.map((s) => (
                  <div
                    key={s.id}
                    className={`${styles.resultRow} ${selected?.id === s.id && selectedType === 'space' ? styles.activeResult : ''}`}
                    onClick={() => selectSpace(s)}
                  >
                    <div className={`${styles.resultAvatar} ${styles.spaceAvatar}`}>
                      {s.icon_url ? <img src={s.icon_url} alt="" className={styles.resultAvatarImg} /> : <span>{s.name[0].toUpperCase()}</span>}
                    </div>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>{s.name}</p>
                      <p className={styles.resultSub}>{(s.member_count || 0).toLocaleString()} members · {s.post_count || 0} posts</p>
                    </div>
                    <span className={styles.spaceTag}>Space</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* RIGHT — preview */}
        <div className={styles.rightPanel}>
          {!selected ? (
            <div className={styles.noSelection}>
              <p>Search for users or spaces</p>
            </div>
          ) : selectedType === 'user' ? (
            // User preview
            <div className={styles.profilePreview}>
              <div className={styles.profileAvatar}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className={styles.profileAvatarImg} />
                  : <span>{selected.username[0].toUpperCase()}</span>
                }
              </div>
              <h2 className={styles.profileUsername}>@{selected.username}</h2>
              {selected.rank_name && <p className={styles.profileRank}>{selected.rank_name}</p>}
              {selected.bio && <p className={styles.profileBio}>{selected.bio}</p>}

              <div className={styles.profileActions}>
                {friendStatus === 'self' && (
                  <button className={styles.actionBtn} onClick={() => router.push('/dashboard')}>Edit profile</button>
                )}
                {friendStatus === null && (
                  <button className={styles.addBtn} onClick={sendFriendRequest} disabled={actionLoading}>
                    + Send request
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button className={styles.pendingBtn} disabled>Request sent</button>
                )}
                {friendStatus === 'pending_received' && (
                  <button className={styles.acceptBtn} onClick={acceptRequest} disabled={actionLoading}>Accept request</button>
                )}
                {friendStatus === 'friends' && (
                  <button className={styles.friendsBtn}>✓ Friends</button>
                )}
                {friendStatus !== 'self' && (
                  <button className={styles.msgBtn} onClick={() => router.push(`/inbox?user=${selected.username}`)}>
                    Message
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Space preview
            <div className={styles.spacePreview}>
              <div className={styles.spacePreviewIcon}>
                {selected.icon_url
                  ? <img src={selected.icon_url} alt="" className={styles.spacePreviewIconImg} />
                  : <span>{selected.name[0].toUpperCase()}</span>
                }
              </div>
              <h2 className={styles.spacePreviewName}>{selected.name}</h2>
              <div className={styles.spacePreviewStats}>
                <span>{(selected.member_count || 0).toLocaleString()} members</span>
                <span>·</span>
                <span>{selected.post_count || 0} posts</span>
              </div>
              {selected.description && (
                <p className={styles.spacePreviewDesc}>{selected.description}</p>
              )}
              {selected.tags?.length > 0 && (
                <div className={styles.spacePreviewTags}>
                  {selected.tags.map((tag) => (
                    <span key={tag} className={styles.spacePreviewTag}>#{tag}</span>
                  ))}
                </div>
              )}
              <button
                className={styles.visitSpaceBtn}
                onClick={() => router.push(`/spaces/${selected.slug}`)}
              >
                Visit Space →
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
