'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './search.module.css'

export default function SearchPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [friendStatus, setFriendStatus] = useState(null)
  const [searching, setSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (query.trim()) doSearch()
    else setResults([])
  }, [query])

  useEffect(() => {
    if (selected && user) fetchFriendStatus(selected.id)
  }, [selected, user])

  async function doSearch() {
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, bio')
      .ilike('username', `%${query}%`)
      .limit(20)
    setResults(data || [])
    setSearching(false)
  }

  async function fetchFriendStatus(profileId) {
    if (!user || profileId === user.id) return setFriendStatus('self')

    const { data: friendRow } = await supabase.from('friends').select('id').eq('user_id', user.id).eq('friend_id', profileId).single()
    if (friendRow) return setFriendStatus('friends')

    const { data: sentReq } = await supabase.from('friend_requests').select('id').eq('sender_id', user.id).eq('receiver_id', profileId).eq('status', 'pending').single()
    if (sentReq) return setFriendStatus('pending_sent')

    const { data: recvReq } = await supabase.from('friend_requests').select('id').eq('sender_id', profileId).eq('receiver_id', user.id).eq('status', 'pending').single()
    if (recvReq) return setFriendStatus('pending_received')

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

  return (
    <AppShell noPadding>
      <div className={styles.layout}>
        {/* LEFT — search + results */}
        <div className={styles.leftPanel}>
          <div className={styles.searchBox}>
            <button className={styles.backBtn} onClick={() => router.back()}>←</button>
            <input
              className={styles.searchInput}
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.resultsList}>
            {searching && <p className={styles.hint}>Searching...</p>}
            {!searching && query && results.length === 0 && <p className={styles.hint}>No users found.</p>}
            {results.map((u) => (
              <div
                key={u.id}
                className={`${styles.resultRow} ${selected?.id === u.id ? styles.activeResult : ''}`}
                onClick={() => setSelected(u)}
              >
                <div className={styles.resultAvatar}>
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className={styles.resultAvatarImg} /> : <span>{u.username[0].toUpperCase()}</span>}
                </div>
                <div className={styles.resultInfo}>
                  <p className={styles.resultUsername}>@{u.username}</p>
                  {u.bio && <p className={styles.resultBio}>{u.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — profile preview */}
        <div className={styles.rightPanel}>
          {!selected ? (
            <div className={styles.noSelection}>
              <p>Search for a user to view their profile</p>
            </div>
          ) : (
            <div className={styles.profilePreview}>
              <div className={styles.profileAvatar}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" className={styles.profileAvatarImg} />
                  : <span>{selected.username[0].toUpperCase()}</span>
                }
              </div>
              <h2 className={styles.profileUsername}>@{selected.username}</h2>
              {selected.bio && <p className={styles.profileBio}>{selected.bio}</p>}

              <div className={styles.profileActions}>
                {friendStatus === 'self' && (
                  <button className={styles.actionBtn} onClick={() => router.push('/dashboard')}>Edit profile</button>
                )}
                {friendStatus === null && (
                  <button className={styles.addBtn} onClick={sendFriendRequest} disabled={actionLoading}>
                    <AddFriendIcon /> {actionLoading ? 'Sending...' : 'Send request'}
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button className={styles.pendingBtn} disabled>Request sent</button>
                )}
                {friendStatus === 'pending_received' && (
                  <button className={styles.acceptBtn} onClick={acceptRequest} disabled={actionLoading}>
                    {actionLoading ? '...' : 'Accept request'}
                  </button>
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
          )}
        </div>
      </div>
    </AppShell>
  )
}

function AddFriendIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
}
