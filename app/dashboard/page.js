// app/dashboard/page.js
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import styles from './dashboard.module.css'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
    if (user) fetchProfile()
  }, [user, authLoading])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!data) {
      router.push('/setup-profile')
      return
    }

    setProfile(data)
    setUsername(data.username)
    setBio(data.bio || '')
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setError('')
    if (!username.trim()) return setError('Username cannot be empty.')
    if (username.length < 3) return setError('Username must be at least 3 characters.')
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return setError('Letters, numbers, and underscores only.')

    setSaving(true)

    let avatar_url = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `${user.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      avatar_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim().toLowerCase(), bio: bio.trim(), avatar_url })
      .eq('id', user.id)

    setSaving(false)

    if (updateError) {
      if (updateError.message.includes('unique'))
        return setError('Username already taken.')
      return setError(updateError.message)
    }

    setSaved(true)
    setEditing(false)
    setAvatarFile(null)
    setTimeout(() => setSaved(false), 3000)
    fetchProfile()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (authLoading || !profile) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    )
  }

  const avatarSrc = avatarPreview || profile.avatar_url || null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo} onClick={() => router.push('/')}>strangr</span>
        <button className={styles.logoutBtn} onClick={handleLogout}>Log out</button>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>

          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div
              className={styles.avatarCircle}
              onClick={() => editing && fileRef.current.click()}
              style={{ cursor: editing ? 'pointer' : 'default' }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarInitial}>
                  {profile.username?.[0]?.toUpperCase()}
                </span>
              )}
              {editing && <div className={styles.avatarOverlay}>Change</div>}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          {/* View mode */}
          {!editing && (
            <div className={styles.viewMode}>
              <h2 className={styles.usernameDisplay}>@{profile.username}</h2>
              <p className={styles.emailDisplay}>{user.email}</p>
              {profile.bio && <p className={styles.bioDisplay}>{profile.bio}</p>}
              {saved && <p className={styles.savedMsg}>Profile saved successfully.</p>}
              <button className={styles.editBtn} onClick={() => setEditing(true)}>
                Edit profile
              </button>
            </div>
          )}

          {/* Edit mode */}
          {editing && (
            <div className={styles.editMode}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Username</label>
                <input
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Bio</label>
                <textarea
                  className={styles.textarea}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell something about yourself…"
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <div className={styles.editActions}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => { setEditing(false); setError(''); setAvatarPreview(null); }}
                >
                  Cancel
                </button>
                <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}