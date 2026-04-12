// app/chat/page.js
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from './chat.module.css'

// Generate or retrieve a session ID for this anonymous user
function getSessionId() {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('strangr_session')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('strangr_session', id)
  }
  return id
}

export default function ChatPage() {
  const router = useRouter()
  const [status, setStatus] = useState('searching') // searching | chatting | ended
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [roomId, setRoomId] = useState(null)
  const sessionId = useRef(getSessionId())
  const bottomRef = useRef(null)
  const roomChannel = useRef(null)
  const msgChannel = useRef(null)

  useEffect(() => {
    startMatching()
    return () => cleanup()
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function startMatching() {
    const sid = sessionId.current

    // Look for a room that is waiting and wasn't created by us
    const { data: waitingRooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('status', 'waiting')
      .neq('participant_1', sid)
      .limit(1)

    if (waitingRooms && waitingRooms.length > 0) {
      // Join existing room as participant_2
      const room = waitingRooms[0]
      await supabase
        .from('chat_rooms')
        .update({ participant_2: sid, status: 'active' })
        .eq('id', room.id)

      setRoomId(room.id)
      setStatus('chatting')
      subscribeToMessages(room.id)
    } else {
      // Create a new waiting room
      const { data: newRoom } = await supabase
        .from('chat_rooms')
        .insert({ participant_1: sid, status: 'waiting' })
        .select()
        .single()

      setRoomId(newRoom.id)
      subscribeToRoomStatus(newRoom.id)
    }
  }

  function subscribeToRoomStatus(rid) {
    roomChannel.current = supabase
      .channel(`room-status-${rid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_rooms', filter: `id=eq.${rid}` },
        (payload) => {
          if (payload.new.status === 'active') {
            setStatus('chatting')
            subscribeToMessages(rid)
          }
          if (payload.new.status === 'ended') {
            setStatus('ended')
          }
        }
      )
      .subscribe()
  }

  function subscribeToMessages(rid) {
    msgChannel.current = supabase
      .channel(`messages-${rid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${rid}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !roomId) return
    setInput('')

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      sender_session: sessionId.current,
      content: text,
    })
  }

  async function handleSkip() {
    if (roomId) {
      await supabase
        .from('chat_rooms')
        .update({ status: 'ended' })
        .eq('id', roomId)
    }
    cleanup()
    setMessages([])
    setRoomId(null)
    setStatus('searching')
    startMatching()
  }

  function cleanup() {
    roomChannel.current?.unsubscribe()
    msgChannel.current?.unsubscribe()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isMe = (msg) => msg.sender_session === sessionId.current

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          ← Back
        </button>
        <span className={styles.logo}>strangr</span>
        <div className={styles.statusBadge} data-status={status}>
          {status === 'searching' && 'Finding stranger…'}
          {status === 'chatting' && 'Connected'}
          {status === 'ended' && 'Disconnected'}
        </div>
      </header>

      {/* Chat area */}
      <main className={styles.chatArea}>
        {status === 'searching' && (
          <div className={styles.searching}>
            <div className={styles.spinner} />
            <p>Looking for someone to chat with…</p>
          </div>
        )}

        {status === 'ended' && (
          <div className={styles.searching}>
            <p className={styles.endedText}>Stranger has disconnected.</p>
            <button className={styles.newChatBtn} onClick={handleSkip}>
              Find new stranger →
            </button>
          </div>
        )}

        {status === 'chatting' && messages.length === 0 && (
          <div className={styles.searching}>
            <p className={styles.connectedHint}>You're connected. Say hi 👋</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.bubble} ${isMe(msg) ? styles.mine : styles.theirs}`}
          >
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Input bar */}
      {(status === 'chatting' || status === 'ended') && (
        <footer className={styles.footer}>
          <button className={styles.skipBtn} onClick={handleSkip}>
            Skip
          </button>
          <input
            className={styles.input}
            placeholder={status === 'chatting' ? 'Type a message…' : ''}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={status !== 'chatting'}
            autoFocus
          />
          <button
            className={styles.sendBtn}
            onClick={sendMessage}
            disabled={status !== 'chatting' || !input.trim()}
          >
            Send
          </button>
        </footer>
      )}
    </div>
  )
}