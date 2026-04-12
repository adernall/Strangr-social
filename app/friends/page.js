// app/friends/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Navbar from '../../components/Navbar'
import styles from './friends.module.css'

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [tab, setTab] = useState('friends') // 'friends' | 'requests'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) fetchAll()
  }, [user, authLoading])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchFriends(), fetchRequests()])
    setLoading(false)
  }

  async function fetchFriends() {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, profiles!friends_friend_id_fkey(username, avatar_url, bio)')
      .eq('user_id', user.id)
    setFriends(data || [])
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, profiles!friend_requests_sender_id_fkey(username, avatar_url)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    setRequests(data || [])
  }

  async function acceptRequest(req) {
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)

    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: req.sender_id },
      { user_id: req.sender_id, friend_id: user.id },
    ])
    fetchAll()
  }

  async function rejectRequest(req) {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id)
    fetchAll()
  }

  async function removeFriend(friendId) {
    await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
    fetchAll()
  }

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <Navbar />
        <div className={styles.loading}><div className={styles.spinner} /></div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Friends</h1>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'friends' ? styles.activeTab : ''}`}
            onClick={() => setTab('friends')}
          >
            Friends {friends.length > 0 && <span className={styles.count}>{friends.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${tab === 'requests' ? styles.activeTab : ''}`}
            onClick={() => setTab('requests')}
          >
            Requests {requests.length > 0 && <span className={styles.countAlert}>{requests.length}</span>}
          </button>
        </div>

        {/* Friends list */}
        {tab === 'friends' && (
          <div className={styles.list}>
            {friends.length === 0 ? (
              <div className={styles.empty}>
                <p>No friends yet.</p>
                <p className={styles.emptyHint}>Search for users in the navbar to add them.</p>
              </div>
            ) : (
              friends.map((f) => (
                <div key={f.friend_id} className={styles.userRow}>
                  <div
                    className={styles.userInfo}
                    onClick={() => router.push(`/profile/${f.profiles.username}`)}
                  >
                    <div className={styles.avatar}>
                      {f.profiles.avatar_url ? (
                        <img src={f.profiles.avatar_url} alt="" className={styles.avatarImg} />
                      ) : (
                        <span>{f.profiles.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className={styles.username}>@{f.profiles.username}</p>
                      {f.profiles.bio && <p className={styles.bio}>{f.profiles.bio}</p>}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.msgBtn}
                      onClick={() => router.push(`/inbox?user=${f.profiles.username}`)}
                    >
                      Message
                    </button>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeFriend(f.friend_id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests list */}
        {tab === 'requests' && (
          <div className={styles.list}>
            {requests.length === 0 ? (
              <div className={styles.empty}>
                <p>No pending requests.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className={styles.userRow}>
                  <div
                    className={styles.userInfo}
                    onClick={() => router.push(`/profile/${req.profiles.username}`)}
                  >
                    <div className={styles.avatar}>
                      {req.profiles.avatar_url ? (
                        <img src={req.profiles.avatar_url} alt="" className={styles.avatarImg} />
                      ) : (
                        <span>{req.profiles.username[0].toUpperCase()}</span>
                      )}
                    </div>
                    <p className={styles.username}>@{req.profiles.username}</p>
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.acceptBtn} onClick={() => acceptRequest(req)}>
                      Accept
                    </button>
                    <button className={styles.rejectBtn} onClick={() => rejectRequest(req)}>
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}