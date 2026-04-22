'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import TopBar from '../../components/TopBar'
import Sidebar from '../../components/Sidebar'
import styles from './inbox.module.css'

export default function InboxPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [conversations, setConversations] = useState([])
  const [selected, setSelected]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [newMsg, setNewMsg]               = useState('')
  const [search, setSearch]               = useState('')
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const [myProfile, setMyProfile]         = useState(null)
  const bottomRef = useRef()
  const channelRef = useRef()

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadMyProfile()
    loadConversations()
  }, [user])

  useEffect(() => {
    if (selected) loadMessages(selected.id)
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behaviour: 'smooth' })
  }, [messages])

  async function loadMyProfile() {
    const { data } = await supabase.from('profiles')
      .select('id, username, avatar_url').eq('id', user.id).maybeSingle()
    setMyProfile(data)
  }

  async function loadConversations() {
    setLoading(true)
    const { data } = await supabase
      .from('conversations')
      .select(`id, last_message, last_message_at, participant_1, participant_2,
        p1:profiles!conversations_participant_1_fkey(id, username, avatar_url),
        p2:profiles!conversations_participant_2_fkey(id, username, avatar_url)`)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  async function loadMessages(convId) {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }

    const { data } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at, image_url')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Subscribe to new messages
    const ch = supabase.channel(`conv-${convId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === payload.new.id)
          return exists ? prev : [...prev, payload.new]
        })
      })
      .subscribe()
    channelRef.current = ch
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selected || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: selected.id,
      sender_id: user.id,
      content,
    }).select('id, content, sender_id, created_at').single()

    if (msg) {
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === msg.id)
        return exists ? prev : [...prev, msg]
      })
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      }).eq('id', selected.id)
      loadConversations()
    }
    setSending(false)
  }

  function getOther(conv) {
    if (!conv || !user) return null
    return conv.participant_1 === user.id ? conv.p2 : conv.p1
  }

  function formatTime(ts) {
    if (!ts) return ''
    const d = Date.now() - new Date(ts)
    if (d < 60000) return 'now'
    if (d < 3600000) return `${Math.floor(d / 60000)}m`
    if (d < 86400000) return `${Math.floor(d / 3600000)}h`
    return new Date(ts).toLocaleDateString()
  }

  const filtered = conversations.filter((c) => {
    const other = getOther(c)
    return !search || other?.username?.toLowerCase().includes(search.toLowerCase())
  })

  const otherUser = selected ? getOther(selected) : null

  return (
    <div className={styles.shell}>
      <TopBar />
      <Sidebar />

      <div className={styles.page}>
        {/* Messages list column */}
        <div className={styles.listCol}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>MESSAGES</h2>
            <div className={styles.searchBox}>
              <svg className={styles.searchIco} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className={styles.searchInput}
                placeholder="SEARCH DIRECTS"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.convList}>
            {loading && (
              <div className={styles.listLoading}><div className={styles.spinner} /></div>
            )}
            {!loading && filtered.length === 0 && (
              <div className={styles.listEmpty}>
                <p>No conversations yet.</p>
                <button className={styles.startBtn} onClick={() => router.push('/search')}>Find people →</button>
              </div>
            )}
            {filtered.map((conv) => {
              const other = getOther(conv)
              if (!other) return null
              const isActive = selected?.id === conv.id
              return (
                <div
                  key={conv.id}
                  className={`${styles.convRow} ${isActive ? styles.convActive : ''}`}
                  onClick={() => setSelected(conv)}
                >
                  <div className={styles.convAvatar}>
                    {other.avatar_url ? <img src={other.avatar_url} alt="" className={styles.convAvatarImg} /> : <span>{(other.username || '?')[0].toUpperCase()}</span>}
                    <div className={styles.onlineDot} />
                  </div>
                  <div className={styles.convInfo}>
                    <div className={styles.convTop}>
                      <span className={styles.convName}>@{other.username?.toUpperCase()}</span>
                      <span className={styles.convTime}>{formatTime(conv.last_message_at)}</span>
                    </div>
                    <p className={styles.convPreview}>{conv.last_message || 'Start a conversation...'}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chat column */}
        <div className={styles.chatCol}>
          {!selected ? (
            <div className={styles.chatEmpty}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                  <div className={styles.chatAvatar}>
                    {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className={styles.chatAvatarImg} /> : <span>{(otherUser?.username || '?')[0].toUpperCase()}</span>}
                    <div className={styles.chatOnlineDot} />
                  </div>
                  <div>
                    <p className={styles.chatHeaderName}>@{otherUser?.username?.toUpperCase()}</p>
                    <p className={styles.chatHeaderStatus}>ACTIVE NOW</p>
                  </div>
                </div>
                <div className={styles.chatHeaderRight}>
                  <button className={styles.chatHeaderBtn} onClick={() => router.push(`/profile/${otherUser?.username}`)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className={styles.chatMessages}>
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id
                  const prevMsg = messages[i - 1]
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className={styles.dateSep}>
                          <span>{new Date(msg.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                        </div>
                      )}
                      <div className={`${styles.msgRow} ${isMe ? styles.msgRowMe : ''}`}>
                        {!isMe && (
                          <div className={styles.msgAvatar}>
                            {otherUser?.avatar_url ? <img src={otherUser.avatar_url} alt="" className={styles.msgAvatarImg} /> : <span>{(otherUser?.username || '?')[0].toUpperCase()}</span>}
                          </div>
                        )}
                        <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : styles.bubbleThem}`}>
                          <p>{msg.content}</p>
                        </div>
                        {isMe && <p className={styles.msgTime}>{formatTime(msg.created_at)}</p>}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className={styles.chatInput}>
                <input
                  className={styles.msgInput}
                  placeholder="TYPE YOUR MESSAGE..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <button className={styles.sendBtn} onClick={sendMessage} disabled={sending || !newMsg.trim()}>
                  SEND
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
