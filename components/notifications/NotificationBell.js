'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const { user }  = useAuth()
  const router    = useRouter()
  const ref       = useRef()

  const [open, setOpen]           = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    // Realtime subscription
    const channel = supabase
      .channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, read, created_at, post_id, conversation_id, actor:actor_id(username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnreadCount((data || []).filter((n) => !n.read).length)
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications((p) => p.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function handleClick(notif) {
    // Mark as read
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    setNotifications((p) => p.map((n) => n.id === notif.id ? { ...n, read: true } : n))
    setUnreadCount((c) => Math.max(c - 1, 0))
    setOpen(false)

    // Navigate
    if (notif.type === 'message' && notif.conversation_id) {
      router.push('/inbox')
    } else if ((notif.type === 'like' || notif.type === 'comment') && notif.post_id) {
      router.push(`/posts/${notif.post_id}`)
    } else if (notif.type === 'friend_request') {
      router.push('/friends')
    }
  }

  function getNotifIcon(type) {
    if (type === 'like') return '❤️'
    if (type === 'comment') return '💬'
    if (type === 'message') return '✉️'
    if (type === 'friend_request') return '👤'
    if (type === 'friend_accept') return '✓'
    return '🔔'
  }

  function getNotifText(notif) {
    const actor = notif.actor?.username || 'Someone'
    if (notif.type === 'like') return `@${actor} liked your post`
    if (notif.type === 'comment') return `@${actor} commented on your post`
    if (notif.type === 'message') return `@${actor} sent you a message`
    if (notif.type === 'friend_request') return `@${actor} sent you a friend request`
    if (notif.type === 'friend_accept') return `@${actor} accepted your request`
    return `@${actor} interacted with you`
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts)
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  if (!user) return null

  const unreadNotifs = notifications.filter((n) => !n.read)

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>
            <h3 className={styles.dropTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markReadBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notifList}>
            {unreadNotifs.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>🔔</span>
                <p>You're all caught up!</p>
              </div>
            ) : (
              unreadNotifs.map((notif) => (
                <div
                  key={notif.id}
                  className={`${styles.notifRow} ${!notif.read ? styles.unread : ''}`}
                  onClick={() => handleClick(notif)}
                >
                  <div className={styles.notifIcon}>{getNotifIcon(notif.type)}</div>
                  <div className={styles.notifBody}>
                    <div className={styles.notifAvatar}>
                      {notif.actor?.avatar_url
                        ? <img src={notif.actor.avatar_url} alt="" className={styles.notifAvatarImg} />
                        : <span>{(notif.actor?.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.notifText}>
                      <p className={styles.notifMsg}>{getNotifText(notif)}</p>
                      <p className={styles.notifTime}>{formatTime(notif.created_at)}</p>
                    </div>
                  </div>
                  {!notif.read && <div className={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
}
