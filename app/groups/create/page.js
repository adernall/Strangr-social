'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import AppShell from '../../../components/AppShell'
import styles from './create.module.css'

export default function CreateGroupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(null)
  const [friends, setFriends] = useState([])
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!authLoading && !user) router.push('/?auth=login')
    if (user) fetchFriends()
  }, [user, authLoading])

  async function fetchFriends() {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, profiles!friends_friend_id_fkey(id, username, avatar_url)')
      .eq('user_id', user.id)
    setFriends(data || [])
  }

  function toggleFriend(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleIcon(e) {
    const file = e.target.files[0]
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  async function handleCreate() {
    setError('')
    if (!name.trim()) return setError('Group name is required.')
    if (selected.length === 0) return setError('Add at least one friend.')
    setLoading(true)

    let icon_url = ''

    if (iconFile) {
      const ext = iconFile.name.split('.').pop()
      const path = `groups/${user.id}/${Date.now()}.${ext}`
      await supabase.storage.from('avatars').upload(path, iconFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      icon_url = data.publicUrl
    }

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), icon_url, created_by: user.id })
      .select()
      .single()

    if (groupError) {
      setLoading(false)
      return setError('Failed to create group.')
    }

    // Add creator as admin + selected friends as members
    const members = [
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...selected.map((id) => ({ group_id: group.id, user_id: id, role: 'member' })),
    ]

    await supabase.from('group_members').insert(members)

    setLoading(false)
    router.push(`/groups/${group.id}`)
  }

  return (
    <div className={styles.page}>
      <AppShell />
      <main className={styles.main}>
        <div className={styles.card}>
          <button className={styles.backBtn} onClick={() => router.push('/groups')}>← Back</button>
          <h1 className={styles.title}>Create a group</h1>
          <p className={styles.sub}>Groups are only available with your friends.</p>

          {/* Icon picker */}
          <div className={styles.iconSection}>
            <div className={styles.iconCircle} onClick={() => fileRef.current.click()}>
              {iconPreview ? (
                <img src={iconPreview} alt="" className={styles.iconImg} />
              ) : (
                <span className={styles.iconPlus}>+</span>
              )}
            </div>
            <p className={styles.iconHint}>Group icon (optional)</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIcon} />
          </div>

          {/* Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Group name</label>
            <input
              className={styles.input}
              placeholder="e.g. Weekend Squad"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Friend selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Add friends
              {selected.length > 0 && <span className={styles.selectedCount}>{selected.length} selected</span>}
            </label>

            {friends.length === 0 ? (
              <p className={styles.noFriends}>You have no friends yet. Add some first.</p>
            ) : (
              <div className={styles.friendList}>
                {friends.map((f) => {
                  const p = f.profiles
                  const isSelected = selected.includes(p.id)
                  return (
                    <div
                      key={p.id}
                      className={`${styles.friendRow} ${isSelected ? styles.selectedRow : ''}`}
                      onClick={() => toggleFriend(p.id)}
                    >
                      <div className={styles.friendAvatar}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className={styles.friendAvatarImg} />
                        ) : (
                          <span>{p.username[0].toUpperCase()}</span>
                        )}
                      </div>
                      <span className={styles.friendName}>@{p.username}</span>
                      <div className={`${styles.check} ${isSelected ? styles.checkSelected : ''}`}>
                        {isSelected && '✓'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.createBtn} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create group →'}
          </button>
        </div>
      </main>
    </div>
  )
}
