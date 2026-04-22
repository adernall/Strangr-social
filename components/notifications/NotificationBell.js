'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const { user }  = useAuth()
  const router    = useRouter()
  const wrapRef   = useRef()

  const [open, setOpen]               = useState(false)
  const [allNotifs, setAllNotifs]     = useState([])
  const [tab, setTab]                 = useState('unread')  // 'unread' | 'all'
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function fetchNotifications() {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('id, type, read, created_at, post_id, conversation_id, actor:actor_id(username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setAllNotifs(data || [])
    setUnreadCount((data || []).filter((n) => !n.read).length)
    setLoading(false)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setAllNotifs((p) => p.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function handleNotifClick(notif) {
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
      setAllNotifs((p) => p.map((n) => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount((c) => Math.max(c - 1, 0))
    }
    setOpen(false)

    if (notif.type === 'message' || notif.type === 'friend_request' || notif.type === 'friend_accept') {
      router.push('/inbox')
    } else if (notif.post_id) {
      router.push(`/posts/${notif.post_id}`)
    }
  }

  function getIcon(type) {
    if (type === 'like')           return '❤️'
    if (type === 'comment')        return '💬'
    if (type === 'message')        return '✉️'
    if (type === 'friend_request') return '👤'
    if (type === 'friend_accept')  return '✓'
    return '🔔'
  }

  function getText(notif) {
    const a = notif.actor?.username || 'Someone'
    if (notif.type === 'like')           return `@${a} liked your post`
    if (notif.type === 'comment')        return `@${a} commented on your post`
    if (notif.type === 'message')        return `@${a} sent you a message`
    if (notif.type === 'friend_request') return `@${a} sent you a friend request`
    if (notif.type === 'friend_accept')  return `@${a} accepted your request`
    return `@${a} interacted with you`
  }

  function timeAgo(ts) {
    const d = Date.now() - new Date(ts)
    if (d < 60000)    return 'now'
    if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`
    return `${Math.floor(d / 86400000)}d ago`
  }

  if (!user) return null

  const unread = allNotifs.filter((n) => !n.read)
  const past   = allNotifs.filter((n) => n.read)
  const shown  = tab === 'unread' ? unread : allNotifs

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
        onClick={() => setOpen(!open)}
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {/* Header */}
          <div className={styles.dropHeader}>
            <h3 className={styles.dropTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllBtn} onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className={styles.tabRow}>
            <button
              className={`${styles.tabBtn} ${tab === 'unread' ? styles.tabActive : ''}`}
              onClick={() => setTab('unread')}
            >
              Unread {unreadCount > 0 && <span className={styles.tabBadge}>{unreadCount}</span>}
            </button>
            <button
              className={`${styles.tabBtn} ${tab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setTab('all')}
            >
              All {allNotifs.length > 0 && <span className={styles.tabBadge}>{allNotifs.length}</span>}
            </button>
          </div>

          {/* List */}
          <div className={styles.list}>
            {loading && shown.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.spinner} />
              </div>
            )}

            {!loading && shown.length === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}>{tab === 'unread' ? '🔔' : '📭'}</span>
                <p>{tab === 'unread' ? "You're all caught up!" : 'No notifications yet.'}</p>
              </div>
            )}

            {shown.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.notifRow} ${!notif.read ? styles.unread : ''}`}
                onClick={() => handleNotifClick(notif)}
              >
                {/* Type icon */}
                <div className={styles.typeIcon}>{getIcon(notif.type)}</div>

                {/* Avatar */}
                <div className={styles.avatar}>
                  {notif.actor?.avatar_url
                    ? <img src={notif.actor.avatar_url} alt="" className={styles.avatarImg} />
                    : <span>{(notif.actor?.username || '?')[0].toUpperCase()}</span>
                  }
                </div>

                {/* Text */}
                <div className={styles.body}>
                  <p className={styles.notifText}>{getText(notif)}</p>
                  <p className={styles.notifTime}>{timeAgo(notif.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!notif.read && <div className={styles.dot} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  )
}
