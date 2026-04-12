// app/inbox/page.js
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import Navbar from '../../components/Navbar'
import styles from './inbox.module.css'

function InboxInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) {
      fetchConversations()
      handleDirectOpen()
    }
  }, [user, authLoading])

  // If coming from ?user=username (e.g. from profile page "Message" button)
  async function handleDirectOpen() {
    const targetUsername = searchParams.get('user')
    if (!targetUsername) return

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', targetUsername)
      .single()

    if (!targetProfile) return

    const convId = await getOrCreateConversation(targetProfile.id)
    router.replace(`/inbox/${convId}`)
  }

  async function getOrCreateConversation(otherId) {
    // Check if conversation exists (either direction)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_1.eq.${user.id},participant_2.eq.${otherId}),and(participant_1.eq.${otherId},participant_2.eq.${user.id})`
      )
      .single()

    if (existing) return existing.id

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ participant_1: user.id, participant_2: otherId })
      .select()
      .single()

    return newConv.id
  }

  async function fetchConversations() {
    setLoading(true)

    const { data } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message,
        last_message_at,
        participant_1,
        participant_2,
        p1:profiles!conversations_participant_1_fkey(id, username, avatar_url),
        p2:profiles!conversations_participant_2_fkey(id, username, avatar_url)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    setConversations(data || [])
    setLoading(false)
  }

  function getOtherProfile(conv) {
    return conv.participant_1 === user.id ? conv.p2 : conv.p1
  }

  function formatTime(ts) {
    const date = new Date(ts)
    const now = new Date()
    const diff = now - date
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return date.toLocaleDateString()
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
          <h1 className={styles.title}>Inbox</h1>
        </div>

        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>No messages yet.</p>
            <p className={styles.emptyHint}>Visit a user's profile and click "Message" to start a conversation.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {conversations.map((conv) => {
              const other = getOtherProfile(conv)
              if (!other) return null
              return (
                <div
                  key={conv.id}
                  className={styles.convRow}
                  onClick={() => router.push(`/inbox/${conv.id}`)}
                >
                  <div className={styles.avatar}>
                    {other.avatar_url ? (
                      <img src={other.avatar_url} alt="" className={styles.avatarImg} />
                    ) : (
                      <span>{other.username[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.convInfo}>
                    <p className={styles.convUsername}>@{other.username}</p>
                    <p className={styles.convLast}>
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                  <span className={styles.convTime}>{formatTime(conv.last_message_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxInner />
    </Suspense>
  )
}
