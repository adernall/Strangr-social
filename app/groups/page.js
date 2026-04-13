'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './groups.module.css'

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) fetchGroups()
  }, [user, authLoading])

  async function fetchGroups() {
    setLoading(true)
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const ids = memberships.map((m) => m.group_id)

    const { data } = await supabase
      .from('groups')
      .select('*')
      .in('id', ids)
      .order('last_message_at', { ascending: false })

    setGroups(data || [])
    setLoading(false)
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
        <AppShell />
        <div className={styles.loading}><div className={styles.spinner} /></div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <AppShell />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Groups</h1>
          <button className={styles.createBtn} onClick={() => router.push('/groups/create')}>
            + New group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className={styles.empty}>
            <p>No groups yet.</p>
            <p className={styles.emptyHint}>Create a group with your friends.</p>
            <button className={styles.emptyBtn} onClick={() => router.push('/groups/create')}>
              Create a group
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {groups.map((g) => (
              <div
                key={g.id}
                className={styles.row}
                onClick={() => router.push(`/groups/${g.id}`)}
              >
                <div className={styles.avatar}>
                  {g.icon_url ? (
                    <img src={g.icon_url} alt="" className={styles.avatarImg} />
                  ) : (
                    <span>{g.name[0].toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.info}>
                  <p className={styles.name}>{g.name}</p>
                  <p className={styles.last}>{g.last_message || 'No messages yet'}</p>
                </div>
                <span className={styles.time}>{formatTime(g.last_message_at)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
