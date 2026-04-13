// app/profile/[username]/page.js
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import AppShell from '../../../components/AppShell'
import styles from './profile.module.css'

export default function ProfilePage() {
  const { username } = useParams()
  const { user } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState(null)
  // null | 'friends' | 'pending_sent' | 'pending_received'
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [username, user])

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    setProfile(data)
    setLoading(false)

    if (user && data) {
      fetchFriendStatus(data.id)
    }
  }

  async function fetchFriendStatus(profileId) {
    if (profileId === user.id) return

    // Check if already friends
    const { data: friendRow } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .eq('friend_id', profileId)
      .single()

    if (friendRow) return setFriendStatus('friends')

    // Check pending requests
    const { data: sentReq } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', profileId)
      .eq('status', 'pending')
      .single()

    if (sentReq) return setFriendStatus('pending_sent')

    const { data: recvReq } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', profileId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (recvReq) return setFriendStatus('pending_received')

    setFriendStatus(null)
  }

  async function sendFriendRequest() {
    if (!user) return router.push('/?auth=login')
    setActionLoading(true)
    await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: profile.id,
    })
    setActionLoading(false)
    setFriendStatus('pending_sent')
  }

  async function acceptRequest() {
    setActionLoading(true)
    // Get the request
    const { data: req } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('sender_id', profile.id)
      .eq('receiver_id', user.id)
      .single()

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id)

    // Add to friends (both directions)
    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: profile.id },
      { user_id: profile.id, friend_id: user.id },
    ])

    setActionLoading(false)
    setFriendStatus('friends')
  }

  async function removeFriend() {
    setActionLoading(true)
    await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${profile.id}),and(user_id.eq.${profile.id},friend_id.eq.${user.id})`)
    setActionLoading(false)
    setFriendStatus(null)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <AppShell>...</AppShell>
        <div className={styles.loading}><div className={styles.spinner} /></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <AppShell>...</AppShell>
        <div className={styles.notFound}>
          <p>User not found.</p>
          <button onClick={() => router.push('/')}>Go home</button>
        </div>
      </div>
    )
  }

  const isOwnProfile = user?.id === profile.id

  return (
    <div className={styles.page}>
      <AppShell>...</AppShell>
      <main className={styles.main}>
        <div className={styles.card}>

          {/* Avatar */}
          <div className={styles.avatarWrap}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <h1 className={styles.username}>@{profile.username}</h1>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}

          {/* Actions */}
          <div className={styles.actions}>
            {isOwnProfile ? (
              <button className={styles.editBtn} onClick={() => router.push('/dashboard')}>
                Edit profile
              </button>
            ) : (
              <>
                {/* Friend button */}
                {friendStatus === null && (
                  <button className={styles.addBtn} onClick={sendFriendRequest} disabled={actionLoading}>
                    {actionLoading ? 'Sending…' : '+ Add friend'}
                  </button>
                )}
                {friendStatus === 'pending_sent' && (
                  <button className={styles.pendingBtn} disabled>
                    Request sent
                  </button>
                )}
                {friendStatus === 'pending_received' && (
                  <button className={styles.acceptBtn} onClick={acceptRequest} disabled={actionLoading}>
                    {actionLoading ? '…' : 'Accept request'}
                  </button>
                )}
                {friendStatus === 'friends' && (
                  <button className={styles.friendsBtn} onClick={removeFriend} disabled={actionLoading}>
                    ✓ Friends
                  </button>
                )}

                {/* Message button */}
                <button
                  className={styles.msgBtn}
                  onClick={() => user ? router.push(`/inbox?user=${profile.username}`) : router.push('/?auth=login')}
                >
                  Message
                </button>
              </>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}