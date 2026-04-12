// app/inbox/[conversationId]/page.js
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import styles from './chat.module.css'

export default function ConversationPage() {
  const { conversationId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [otherProfile, setOtherProfile] = useState(null)
  const [myProfile, setMyProfile] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef()
  const fileRef = useRef()
  const channelRef = useRef()

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) init()
    return () => channelRef.current?.unsubscribe()
  }, [user, authLoading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function init() {
    await fetchProfiles()
    await fetchMessages()
    subscribeToMessages()
    setLoading(false)
  }

  async function fetchProfiles() {
    // Get conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .single()

    if (!conv) return router.push('/inbox')

    const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1

    const [{ data: other }, { data: me }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').eq('id', otherId).single(),
      supabase.from('profiles').select('id, username, avatar_url').eq('id', user.id).single(),
    ])

    setOtherProfile(other)
    setMyProfile(me)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, reply:reply_to(id, content, sender_id)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  function subscribeToMessages() {
    channelRef.current = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch with reply data
          const { data: fullMsg } = await supabase
            .from('messages')
            .select('*, reply:reply_to(id, content, sender_id)')
            .eq('id', payload.new.id)
            .single()

          if (fullMsg && fullMsg.sender_id !== user.id) {
            setMessages((prev) => [...prev, fullMsg])
          }
        }
      )
      .subscribe()
  }

  async function sendMessage(content = null, imageUrl = null) {
    const text = content || input.trim()
    if (!text && !imageUrl) return
    setInput('')
    setReplyTo(null)

    const newMsg = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: user.id,
      content: text || '',
      image_url: imageUrl || '',
      reply_to: replyTo?.id || null,
      reply: replyTo || null,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    setMessages((prev) => [...prev, newMsg])

    // Save to DB
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: text || '',
      image_url: imageUrl || '',
      reply_to: replyTo?.id || null,
    })

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message: imageUrl ? '📷 Image' : text,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `messages/${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file)
    if (error) { setUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await sendMessage(null, data.publicUrl)
    setUploading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === 'Escape' && replyTo) setReplyTo(null)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function shouldShowDate(messages, index) {
    if (index === 0) return true
    const prev = new Date(messages[index - 1].created_at).toDateString()
    const curr = new Date(messages[index].created_at).toDateString()
    return prev !== curr
  }

  const isMe = (msg) => msg.sender_id === user?.id

  if (authLoading || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}><div className={styles.spinner} /></div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/inbox')}>
          ←
        </button>
        {otherProfile && (
          <div
            className={styles.headerProfile}
            onClick={() => router.push(`/profile/${otherProfile.username}`)}
          >
            <div className={styles.headerAvatar}>
              {otherProfile.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className={styles.headerAvatarImg} />
              ) : (
                <span>{otherProfile.username[0].toUpperCase()}</span>
              )}
            </div>
            <span className={styles.headerName}>@{otherProfile.username}</span>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className={styles.chatArea}>
        {messages.length === 0 && (
          <div className={styles.emptyChat}>
            <p>Say hello to @{otherProfile?.username} 👋</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id}>
            {/* Date separator */}
            {shouldShowDate(messages, i) && (
              <div className={styles.dateSep}>
                <span>{formatDate(msg.created_at)}</span>
              </div>
            )}

            <div className={`${styles.msgRow} ${isMe(msg) ? styles.myRow : styles.theirRow}`}>
              {/* Avatar — only for other person */}
              {!isMe(msg) && (
                <div className={styles.msgAvatar}>
                  {otherProfile?.avatar_url ? (
                    <img src={otherProfile.avatar_url} alt="" className={styles.msgAvatarImg} />
                  ) : (
                    <span>{otherProfile?.username[0].toUpperCase()}</span>
                  )}
                </div>
              )}

              <div className={styles.bubbleWrap}>
                {/* Reply preview */}
                {msg.reply && (
                  <div className={`${styles.replyPreview} ${isMe(msg) ? styles.replyMe : styles.replyThem}`}>
                    <span className={styles.replyLabel}>
                      {msg.reply.sender_id === user.id ? 'You' : `@${otherProfile?.username}`}
                    </span>
                    <p className={styles.replyText}>{msg.reply.content || '📷 Image'}</p>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`${styles.bubble} ${isMe(msg) ? styles.myBubble : styles.theirBubble}`}
                  onDoubleClick={() => setReplyTo(msg)}
                >
                  {msg.image_url && (
                    <img src={msg.image_url} alt="" className={styles.msgImage} />
                  )}
                  {msg.content && <p className={styles.msgText}>{msg.content}</p>}
                </div>

                <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
              </div>

              {/* Reply button on hover */}
              <button
                className={styles.replyBtn}
                onClick={() => setReplyTo(msg)}
                title="Reply"
              >
                ↩
              </button>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Reply bar */}
      {replyTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyBarContent}>
            <span className={styles.replyBarLabel}>
              Replying to {replyTo.sender_id === user.id ? 'yourself' : `@${otherProfile?.username}`}
            </span>
            <p className={styles.replyBarText}>{replyTo.content || '📷 Image'}</p>
          </div>
          <button className={styles.replyBarClose} onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Input footer */}
      <footer className={styles.footer}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          className={styles.imgBtn}
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          title="Send image"
        >
          {uploading ? '…' : <ImageIcon />}
        </button>
        <input
          className={styles.input}
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          className={styles.sendBtn}
          onClick={() => sendMessage()}
          disabled={!input.trim()}
        >
          Send
        </button>
      </footer>
    </div>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
