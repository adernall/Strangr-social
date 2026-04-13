'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './inbox.module.css'

function InboxInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [conversations, setConversations] = useState([])
  const [groups, setGroups] = useState([])
  const [activeConv, setActiveConv] = useState(null) // { type: 'dm'|'group', id }
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [otherProfile, setOtherProfile] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [groupProfiles, setGroupProfiles] = useState({})
  const [myProfile, setMyProfile] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [friends, setFriends] = useState([])
  const [groupName, setGroupName] = useState('')
  const [selectedFriends, setSelectedFriends] = useState([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const bottomRef = useRef()
  const channelRef = useRef()
  const fileRef = useRef()

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) {
      fetchAll()
      fetchMyProfile()
    }
  }, [user, authLoading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Handle ?user= or ?conv= from URL
    if (!user) return
    const targetUser = searchParams.get('user')
    const targetConv = searchParams.get('conv')
    if (targetUser) openOrCreateDM(targetUser)
    if (targetConv) openConversation({ type: 'dm', id: targetConv })
  }, [user, searchParams])

  async function fetchAll() {
    setLoadingConvs(true)
    await Promise.all([fetchDMs(), fetchGroups(), fetchFriends()])
    setLoadingConvs(false)
  }

  async function fetchMyProfile() {
    const { data } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', user.id).single()
    setMyProfile(data)
  }

  async function fetchDMs() {
    const { data } = await supabase
      .from('conversations')
      .select(`id, last_message, last_message_at, participant_1, participant_2,
        p1:profiles!conversations_participant_1_fkey(id, username, avatar_url),
        p2:profiles!conversations_participant_2_fkey(id, username, avatar_url)`)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
    setConversations(data || [])
  }

  async function fetchGroups() {
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    if (!memberships?.length) return setGroups([])
    const ids = memberships.map((m) => m.group_id)
    const { data } = await supabase.from('groups').select('*').in('id', ids).order('last_message_at', { ascending: false })
    setGroups(data || [])
  }

  async function fetchFriends() {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, profiles!friends_friend_id_fkey(id, username, avatar_url)')
      .eq('user_id', user.id)
    setFriends(data || [])
  }

  async function openOrCreateDM(username) {
    const { data: profile } = await supabase.from('profiles').select('id').eq('username', username).single()
    if (!profile) return
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${profile.id}),and(participant_1.eq.${profile.id},participant_2.eq.${user.id})`)
      .single()
    if (existing) {
      openConversation({ type: 'dm', id: existing.id })
    } else {
      const { data: newConv } = await supabase.from('conversations').insert({ participant_1: user.id, participant_2: profile.id }).select().single()
      await fetchDMs()
      openConversation({ type: 'dm', id: newConv.id })
    }
  }

  async function openConversation(conv) {
    channelRef.current?.unsubscribe()
    setActiveConv(conv)
    setMessages([])
    setReplyTo(null)
    setMobileShowChat(true)
    setLoadingMsgs(true)

    if (conv.type === 'dm') {
      await loadDMMessages(conv.id)
    } else {
      await loadGroupMessages(conv.id)
    }
    setLoadingMsgs(false)
  }

  async function loadDMMessages(convId) {
    // Get other profile
    const conv = conversations.find((c) => c.id === convId)
    if (conv) {
      const other = conv.participant_1 === user.id ? conv.p2 : conv.p1
      setOtherProfile(other)
      setActiveGroup(null)
    }

    const { data } = await supabase
      .from('messages')
      .select('*, reply:reply_to(id, content, sender_id)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    channelRef.current = supabase
      .channel(`inbox-dm-${convId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        async (payload) => {
          if (payload.new.sender_id === user.id) return
          const { data: full } = await supabase.from('messages').select('*, reply:reply_to(id, content, sender_id)').eq('id', payload.new.id).single()
          if (full) setMessages((prev) => [...prev, full])
        })
      .subscribe()
  }

  async function loadGroupMessages(groupId) {
    const group = groups.find((g) => g.id === groupId)
    setActiveGroup(group)
    setOtherProfile(null)

    // Fetch member profiles
    const { data: mems } = await supabase.from('group_members').select('user_id, profiles(id, username, avatar_url)').eq('group_id', groupId)
    const map = {}
    mems?.forEach((m) => { if (m.profiles) map[m.profiles.id] = m.profiles })
    setGroupProfiles(map)

    const { data } = await supabase
      .from('group_messages')
      .select('*, reply:reply_to(id, content, sender_id)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    channelRef.current = supabase
      .channel(`inbox-group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          if (payload.new.sender_id === user.id) return
          const { data: full } = await supabase.from('group_messages').select('*, reply:reply_to(id, content, sender_id)').eq('id', payload.new.id).single()
          if (full) setMessages((prev) => [...prev, full])
        })
      .subscribe()
  }

  async function sendMessage(imageUrl = null) {
    const text = input.trim()
    if (!text && !imageUrl) return
    if (!activeConv) return
    setInput('')
    setReplyTo(null)

    const tempMsg = {
      id: crypto.randomUUID(),
      sender_id: user.id,
      content: text || '',
      image_url: imageUrl || '',
      reply_to: replyTo?.id || null,
      reply: replyTo || null,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempMsg])

    if (activeConv.type === 'dm') {
      await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: user.id, content: text || '', image_url: imageUrl || '', reply_to: replyTo?.id || null })
      await supabase.from('conversations').update({ last_message: imageUrl ? '📷 Image' : text, last_message_at: new Date().toISOString() }).eq('id', activeConv.id)
      fetchDMs()
    } else {
      await supabase.from('group_messages').insert({ group_id: activeConv.id, sender_id: user.id, content: text || '', image_url: imageUrl || '', reply_to: replyTo?.id || null })
      await supabase.from('groups').update({ last_message: `${myProfile?.username}: ${imageUrl ? '📷' : text}`, last_message_at: new Date().toISOString() }).eq('id', activeConv.id)
      fetchGroups()
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const path = `messages/${user.id}/${Date.now()}.${file.name.split('.').pop()}`
    await supabase.storage.from('avatars').upload(path, file)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await sendMessage(data.publicUrl)
    setUploading(false)
  }

  async function createGroup() {
    if (!groupName.trim() || selectedFriends.length === 0) return
    setCreatingGroup(true)
    const { data: group } = await supabase.from('groups').insert({ name: groupName.trim(), created_by: user.id }).select().single()
    await supabase.from('group_members').insert([
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...selectedFriends.map((id) => ({ group_id: group.id, user_id: id, role: 'member' }))
    ])
    setCreatingGroup(false)
    setShowCreateGroup(false)
    setGroupName('')
    setSelectedFriends([])
    await fetchGroups()
    openConversation({ type: 'group', id: group.id })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === 'Escape' && replyTo) setReplyTo(null)
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts)
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return new Date(ts).toLocaleDateString()
  }

  function formatMsgTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function shouldShowDate(msgs, i) {
    if (i === 0) return true
    return new Date(msgs[i - 1].created_at).toDateString() !== new Date(msgs[i].created_at).toDateString()
  }

  const isMe = (msg) => msg.sender_id === user?.id

  const allItems = [
    ...conversations.map((c) => ({ ...c, _type: 'dm' })),
    ...groups.map((g) => ({ ...g, _type: 'group' }))
  ].sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))

  if (authLoading) return <AppShell><div className={styles.loading}><div className={styles.spinner} /></div></AppShell>

  return (
    <AppShell noPadding>
      <div className={styles.layout}>
        {/* LEFT PANEL */}
        <div className={`${styles.leftPanel} ${mobileShowChat ? styles.mobileHidden : ''}`}>
          <div className={styles.leftHeader}>
            <h2 className={styles.leftTitle}>Messages</h2>
            <button className={styles.newGroupBtn} onClick={() => setShowCreateGroup(true)} title="New group">
              <GroupIcon />
            </button>
          </div>

          {loadingConvs ? (
            <div className={styles.loading}><div className={styles.spinner} /></div>
          ) : allItems.length === 0 ? (
            <div className={styles.empty}>
              <p>No conversations yet.</p>
              <p className={styles.emptyHint}>Visit a profile to start a DM.</p>
            </div>
          ) : (
            <div className={styles.convList}>
              {allItems.map((item) => {
                const isDM = item._type === 'dm'
                const other = isDM ? (item.participant_1 === user.id ? item.p2 : item.p1) : null
                const name = isDM ? (other ? `@${other.username}` : 'Unknown') : item.name
                const avatar = isDM ? other?.avatar_url : item.icon_url
                const initials = isDM ? (other?.username?.[0]?.toUpperCase() || '?') : (item.name?.[0]?.toUpperCase() || 'G')
                const isActive = activeConv?.id === item.id

                return (
                  <div
                    key={item.id}
                    className={`${styles.convRow} ${isActive ? styles.activeConv : ''}`}
                    onClick={() => openConversation({ type: item._type, id: item.id })}
                  >
                    <div className={`${styles.convAvatar} ${!isDM ? styles.groupAvatar : ''}`}>
                      {avatar ? <img src={avatar} alt="" className={styles.convAvatarImg} /> : <span>{initials}</span>}
                    </div>
                    <div className={styles.convInfo}>
                      <div className={styles.convTopRow}>
                        <p className={styles.convName}>{name}</p>
                        <span className={styles.convTime}>{formatTime(item.last_message_at)}</span>
                      </div>
                      <p className={styles.convLast}>{item.last_message || 'No messages yet'}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className={`${styles.rightPanel} ${!mobileShowChat ? styles.mobileHidden : ''}`}>
          {!activeConv ? (
            <div className={styles.noChat}>
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <button className={styles.backMobile} onClick={() => setMobileShowChat(false)}>←</button>
                {otherProfile && (
                  <div className={styles.chatHeaderInfo} onClick={() => router.push(`/profile/${otherProfile.username}`)}>
                    <div className={styles.chatHeaderAvatar}>
                      {otherProfile.avatar_url ? <img src={otherProfile.avatar_url} alt="" className={styles.chatHeaderAvatarImg} /> : <span>{otherProfile.username[0].toUpperCase()}</span>}
                    </div>
                    <span className={styles.chatHeaderName}>@{otherProfile.username}</span>
                  </div>
                )}
                {activeGroup && (
                  <div className={styles.chatHeaderInfo}>
                    <div className={`${styles.chatHeaderAvatar} ${styles.groupHeaderAvatar}`}>
                      {activeGroup.icon_url ? <img src={activeGroup.icon_url} alt="" className={styles.chatHeaderAvatarImg} /> : <span>{activeGroup.name[0].toUpperCase()}</span>}
                    </div>
                    <div>
                      <span className={styles.chatHeaderName}>{activeGroup.name}</span>
                      <span className={styles.chatHeaderSub}>{Object.keys(groupProfiles).length} members</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className={styles.chatArea}>
                {loadingMsgs ? (
                  <div className={styles.loading}><div className={styles.spinner} /></div>
                ) : messages.length === 0 ? (
                  <div className={styles.emptyChat}>
                    <p>{otherProfile ? `Say hi to @${otherProfile.username} 👋` : `Start the conversation in ${activeGroup?.name}`}</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const me = isMe(msg)
                    const sender = activeGroup ? groupProfiles[msg.sender_id] : null

                    return (
                      <div key={msg.id}>
                        {shouldShowDate(messages, i) && (
                          <div className={styles.dateSep}>
                            <span>{new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        <div className={`${styles.msgRow} ${me ? styles.myRow : styles.theirRow}`}>
                          {!me && (
                            <div className={styles.msgAvatar} onClick={() => sender && router.push(`/profile/${sender.username}`)}>
                              {(otherProfile?.avatar_url || sender?.avatar_url) ? (
                                <img src={otherProfile?.avatar_url || sender?.avatar_url} alt="" className={styles.msgAvatarImg} />
                              ) : (
                                <span>{(otherProfile?.username || sender?.username || '?')[0].toUpperCase()}</span>
                              )}
                            </div>
                          )}

                          <div className={styles.bubbleWrap}>
                            {!me && activeGroup && sender && (
                              <span className={styles.senderName}>@{sender.username}</span>
                            )}
                            {msg.reply && (
                              <div className={`${styles.replyPreview} ${me ? styles.replyMe : styles.replyThem}`}>
                                <span className={styles.replyLabel}>
                                  {msg.reply.sender_id === user.id ? 'You' : `@${otherProfile?.username || groupProfiles[msg.reply.sender_id]?.username || '?'}`}
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
                            <span className={styles.msgTime}>{formatMsgTime(msg.created_at)}</span>
                          </div>

                          <button className={styles.replyBtn} onClick={() => setReplyTo(msg)}>↩</button>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply bar */}
              {replyTo && (
                <div className={styles.replyBar}>
                  <div className={styles.replyBarContent}>
                    <span className={styles.replyBarLabel}>
                      Replying to {replyTo.sender_id === user.id ? 'yourself' : `@${otherProfile?.username || groupProfiles[replyTo.sender_id]?.username}`}
                    </span>
                    <p className={styles.replyBarText}>{replyTo.content || '📷 Image'}</p>
                  </div>
                  <button className={styles.replyBarClose} onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}

              {/* Input */}
              <div className={styles.chatFooter}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <button className={styles.imgBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
                  {uploading ? '…' : <ImgIcon />}
                </button>
                <input
                  className={styles.chatInput}
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={!input.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateGroup(false)}>
          <div className={styles.createGroupModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>New Group</h3>
            <input
              className={styles.modalInput}
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <p className={styles.modalLabel}>Add friends</p>
            <div className={styles.friendPicker}>
              {friends.length === 0 ? (
                <p className={styles.noFriends}>No friends yet.</p>
              ) : friends.map((f) => {
                const p = f.profiles
                const sel = selectedFriends.includes(p.id)
                return (
                  <div key={p.id} className={`${styles.friendPickRow} ${sel ? styles.friendPickSelected : ''}`} onClick={() => setSelectedFriends((prev) => sel ? prev.filter((x) => x !== p.id) : [...prev, p.id])}>
                    <div className={styles.friendPickAvatar}>
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className={styles.friendPickAvatarImg} /> : <span>{p.username[0].toUpperCase()}</span>}
                    </div>
                    <span className={styles.friendPickName}>@{p.username}</span>
                    {sel && <span className={styles.friendPickCheck}>✓</span>}
                  </div>
                )
              })}
            </div>
            <button className={styles.modalCreateBtn} onClick={createGroup} disabled={creatingGroup || !groupName.trim() || selectedFriends.length === 0}>
              {creatingGroup ? 'Creating...' : 'Create group'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default function InboxPage() {
  return <Suspense fallback={null}><InboxInner /></Suspense>
}

function GroupIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}

function ImgIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
