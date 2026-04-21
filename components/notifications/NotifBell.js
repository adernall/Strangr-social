'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import styles from './NotifBell.module.css'

export default function NotifBell() {
  const { user } = useAuth()
  const router   = useRouter()
  const panelRef = useRef()

  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchNotifs()

    // Realtime subscription
    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifs((prev) => [payload.new, ...prev])
        setUnreadCount((c) => c + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(username, avatar_url)')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifs(data || [])
    setUnreadCount((data || []).length)
  }

  async function markRead(notif) {
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifs((prev) => prev.filter((n) => n.id !== notif.id))
    setUnreadCount((c) => Math.max(0, c - 1))

    // Navigate
    if (notif.type === 'like' || notif.type === 'comment') {
      if (notif.post_id) router.push(`/posts/${notif.post_id}`)
    } else if (notif.type === 'message') {
      router.push('/inbox')
    } else if (notif.type === 'friend_request') {
      router.push('/friends')
    }
    setOpen(false)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifs([])
    setUnreadCount(0)
  }

  function notifIcon(type) {
    if (type === 'like')    return '❤'
    if (type === 'comment') return '💬'
    if (type === 'message') return '✉'
    if (type === 'friend_request') return '👤'
    return '🔔'
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts)
    if (diff < 60000)    return 'now'
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  if (!user) return null

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bell} onClick={() => setOpen((v) => !v)} title="Notifications">
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notifications</span>
            {notifs.length > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>Mark all read</button>
            )}
          </div>

          {notifs.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔔</span>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className={styles.list}>
              {notifs.map((n) => (
                <div key={n.id} className={styles.notifRow} onClick={() => markRead(n)}>
                  <div className={styles.notifLeft}>
                    <div className={styles.actorAvatar}>
                      {n.actor?.avatar_url
                        ? <img src={n.actor.avatar_url} alt="" className={styles.actorAvatarImg} />
                        : <span>{(n.actor?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <span className={styles.typeIcon}>{notifIcon(n.type)}</span>
                  </div>
                  <div className={styles.notifBody}>
                    <p className={styles.notifText}>
                      <strong>@{n.actor?.username}</strong> {n.message}
                    </p>
                    <p className={styles.notifTime}>{formatTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}
