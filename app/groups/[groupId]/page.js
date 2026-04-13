'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import styles from './groupchat.module.css'

export default function GroupChatPage() {
  const { groupId } = useParams()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({}) // id -> profile
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showInfo, setShowInfo] = useState(false)

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
    await fetchGroup()
    await fetchMessages()
    subscribeToMessages()
    setLoading(false)
  }

  async function fetchGroup() {
    const { data: g } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (!g) return router.push('/groups')
    setGroup(g)

    // Fetch members with profiles
    const { data: mems } = await supabase
      .from('group_members')
      .select('user_id, role, profiles(id, username, avatar_url)')
      .eq('group_id', groupId)

    setMembers(mems || [])

    // Build profiles map
    const map = {}
    mems?.forEach((m) => { if (m.profiles) map[m.profiles.id] = m.profiles })
    setProfiles(map)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('group_messages')
      .select('*, reply:reply_to(id, content, sender_id)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  function subscribeToMessages() {
    channelRef.current = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          if (payload.new.sender_id === user.id) return
          const { data: fullMsg } = await supabase
            .from('group_messages')
            .select('*, reply:reply_to(id, content, sender_id)')
            .eq('id', payload.new.id)
            .single()
          if (fullMsg) setMessages((prev) => [...prev, fullMsg])
        }
      )
      .subscribe()
  }

  async function sendMessage(imageUrl = null) {
    const text = input.trim()
    if (!text && !imageUrl) return
    setInput('')
    setReplyTo(null)

    const newMsg = {
      id: crypto.randomUUID(),
      group_id: groupId,
      sender_id: user.id,
      content: text || '',
      image_url: imageUrl || '',
      reply_to: replyTo?.id || null,
      reply: replyTo || null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, newMsg])

    await supabase.from('group_messages').insert({
      group_id: groupId,
      sender_id: user.id,
      content: text || '',
      image_url: imageUrl || '',
      reply_to: replyTo?.id || null,
    })

    await supabase
      .from('groups')
      .update({
        last_message: imageUrl ? `${profiles[user.id]?.username}: 📷` : `${profiles[user.id]?.username}: ${text}`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', groupId)
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `groups/messages/${user.id}/${Date.now()}.${ext}`
    await supabase.storage.from('avatars').upload(path, file)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await sendMessage(data.publicUrl)
    setUploading(false)
  }

  async function leaveGroup() {
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id)
    router.push('/groups')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape' && replyTo) setReplyTo(null)
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function shouldShowDate(msgs, i) {
    if (i === 0) return true
    return new Date(msgs[i - 1].created_at).toDateString() !== new Date(msgs[i].created_at).toDateString()
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const isMe = (msg) => msg.sender_id === user?.id
  const myRole = members.find((m) => m.user_id === user?.id)?.role

  if (authLoading || loading) {
    return <div className={styles.page}><div className={styles.loading}><div className={styles.spinner} /></div></div>
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/groups')}>←</button>
        <div className={styles.headerInfo} onClick={() => setShowInfo(!showInfo)}>
          <div className={styles.headerIcon}>
            {group?.icon_url ? (
              <img src={group.icon_url} alt="" className={styles.headerIconImg} />
            ) : (
              <span>{group?.name[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className={styles.headerName}>{group?.name}</p>
            <p className={styles.headerCount}>{members.length} members</p>
          </div>
        </div>
        <button className={styles.infoBtn} onClick={() => setShowInfo(!showInfo)} title="Group info">
          <InfoIcon />
        </button>
      </header>

      {/* Group info panel */}
      {showInfo && (
        <div className={styles.infoPanel}>
          <p className={styles.infoPanelTitle}>Members</p>
          <div className={styles.memberList}>
            {members.map((m) => {
              const p = m.profiles
              if (!p) return null
              return (
                <div
                  key={m.user_id}
                  className={styles.memberRow}
                  onClick={() => { setShowInfo(false); router.push(`/profile/${p.username}`) }}
                >
                  <div className={styles.memberAvatar}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className={styles.memberAvatarImg} />
                    ) : (
                      <span>{p.username[0].toUpperCase()}</span>
                    )}
                  </div>
                  <span className={styles.memberName}>@{p.username}</span>
                  {m.role === 'admin' && <span className={styles.adminBadge}>Admin</span>}
                </div>
              )
            })}
          </div>
          <button className={styles.leaveBtn} onClick={leaveGroup}>Leave group</button>
        </div>
      )}

      {/* Messages */}
      <main className={styles.chatArea}>
        {messages.length === 0 && (
          <div className={styles.emptyChat}>
            <p>Start the conversation in {group?.name}</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const sender = profiles[msg.sender_id]
          const me = isMe(msg)

          return (
            <div key={msg.id}>
              {shouldShowDate(messages, i) && (
                <div className={styles.dateSep}>
                  <span>{formatDate(msg.created_at)}</span>
                </div>
              )}

              <div className={`${styles.msgRow} ${me ? styles.myRow : styles.theirRow}`}>
                {!me && (
                  <div
                    className={styles.msgAvatar}
                    onClick={() => sender && router.push(`/profile/${sender.username}`)}
                    title={sender?.username}
                  >
                    {sender?.avatar_url ? (
                      <img src={sender.avatar_url} alt="" className={styles.msgAvatarImg} />
                    ) : (
                      <span>{sender?.username?.[0]?.toUpperCase() || '?'}</span>
                    )}
                  </div>
                )}

                <div className={styles.bubbleWrap}>
                  {!me && sender && (
                    <span className={styles.senderName}>@{sender.username}</span>
                  )}

                  {msg.reply && (
                    <div className={`${styles.replyPreview} ${me ? styles.replyMe : styles.replyThem}`}>
                      <span className={styles.replyLabel}>
                        {msg.reply.sender_id === user.id ? 'You' : `@${profiles[msg.reply.sender_id]?.username || '?'}`}
                      </span>
                      <p className={styles.replyText}>{msg.reply.content || '📷 Image'}</p>
                    </div>
                  )}

                  <div
                    className={`${styles.bubble} ${me ? styles.myBubble : styles.theirBubble}`}
                    onDoubleClick={() => setReplyTo(msg)}
                  >
                    {msg.image_url && <img src={msg.image_url} alt="" className={styles.msgImage} />}
                    {msg.content && <p className={styles.msgText}>{msg.content}</p>}
                  </div>

                  <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                </div>

                <button className={styles.replyBtn} onClick={() => setReplyTo(msg)} title="Reply">↩</button>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </main>

      {/* Reply bar */}
      {replyTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyBarContent}>
            <span className={styles.replyBarLabel}>
              Replying to {replyTo.sender_id === user.id ? 'yourself' : `@${profiles[replyTo.sender_id]?.username}`}
            </span>
            <p className={styles.replyBarText}>{replyTo.content || '📷 Image'}</p>
          </div>
          <button className={styles.replyBarClose} onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        <button className={styles.imgBtn} onClick={() => fileRef.current.click()} disabled={uploading} title="Send image">
          {uploading ? '…' : <ImageIcon />}
        </button>
        <input
          className={styles.input}
          placeholder="Message the group..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={!input.trim()}>
          Send
        </button>
      </footer>
    </div>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
