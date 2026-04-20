'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import { joinSpace, getMemberRole } from '../../../lib/feedEngine'
import AppShell from '../../../components/AppShell'
import styles from './join.module.css'

export default function JoinSpacePage() {
  const { token } = useParams()
  const { user }  = useAuth()
  const router    = useRouter()

  const [space, setSpace]   = useState(null)
  const [status, setStatus] = useState('loading') // loading | found | joined | error
  const [joining, setJoining] = useState(false)

  useEffect(() => { loadSpace() }, [token])

  async function loadSpace() {
    const { data } = await supabase
      .from('spaces')
      .select('id, name, slug, icon_url, description, member_count')
      .eq('invite_token', token)
      .single()

    if (!data) { setStatus('error'); return }
    setSpace(data)
    setStatus('found')
  }

  async function handleJoin() {
    if (!user) { router.push(`/?auth=login`); return }
    setJoining(true)
    const existing = await getMemberRole(space.id, user.id)
    if (existing) {
      router.push(`/spaces/${space.slug}`)
      return
    }
    await joinSpace(space.id, user.id)
    setStatus('joined')
    setTimeout(() => router.push(`/spaces/${space.slug}`), 1500)
  }

  if (status === 'loading') return (
    <AppShell>
      <div className={styles.center}><div className={styles.spinner} /></div>
    </AppShell>
  )

  if (status === 'error') return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>This invite link is invalid or has expired.</p>
        <button className={styles.homeBtn} onClick={() => router.push('/')}>Go Home</button>
      </div>
    </AppShell>
  )

  if (status === 'joined') return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.successText}>✓ Joined {space.name}! Redirecting...</p>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className={styles.center}>
        <div className={styles.card}>
          <p className={styles.inviteLabel}>YOU'VE BEEN INVITED TO JOIN</p>
          <div className={styles.spaceInfo}>
            <div className={styles.spaceIcon}>
              {space.icon_url
                ? <img src={space.icon_url} alt="" className={styles.spaceIconImg} />
                : <span>{space.name[0].toUpperCase()}</span>
              }
            </div>
            <h1 className={styles.spaceName}>{space.name}</h1>
            {space.description && <p className={styles.spaceDesc}>{space.description}</p>}
            <p className={styles.memberCount}>{space.member_count} members</p>
          </div>
          <button className={styles.joinBtn} onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining...' : 'Join Space →'}
          </button>
          <button className={styles.skipBtn} onClick={() => router.push(`/spaces/${space.slug}`)}>
            View without joining
          </button>
        </div>
      </div>
    </AppShell>
  )
}
