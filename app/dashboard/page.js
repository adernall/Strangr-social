'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './dashboard.module.css'

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!authLoading && !user) router.push('/')
    if (user) fetchProfile()
  }, [user, authLoading])

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!data) return router.push('/setup-profile')
    setProfile(data)
    setUsername(data.username || '')
    setDisplayName(data.display_name || '')
    setBio(data.bio || '')
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setDirty(true)
  }

  async function handleSave() {
    setError('')
    if (!username.trim()) return setError('Username cannot be empty.')
    if (username.length < 3) return setError('Username must be at least 3 characters.')
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setError('Letters, numbers, underscores only.')
    setSaving(true)

    let avatar_url = profile.avatar_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim().toLowerCase(), bio: bio.trim(), avatar_url })
      .eq('id', user.id)

    setSaving(false)

    if (updateError) {
      if (updateError.message.includes('unique')) return setError('Username already taken.')
      return setError(updateError.message)
    }

    setDirty(false)
    setAvatarFile(null)
    fetchProfile()
  }

  function handleDiscard() {
    setUsername(profile.username || '')
    setDisplayName(profile.display_name || '')
    setBio(profile.bio || '')
    setAvatarFile(null)
    setAvatarPreview(null)
    setDirty(false)
    setError('')
  }

  async function handleDeleteAccount() {
    // Sign out and delete profile (cascade handles the rest)
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (authLoading || !profile) {
    return (
      <AppShell>
        <div className={styles.loading}><div className={styles.spinner} /></div>
      </AppShell>
    )
  }

  const avatarSrc = avatarPreview || profile.avatar_url || null

  return (
    <AppShell noPadding>
      <div className={styles.page}>
        {/* Top save/discard bar */}
        {dirty && (
          <div className={styles.saveBar}>
            <div className={styles.saveBarLeft} />
            <div className={styles.saveBarActions}>
              <button className={styles.discardBtn} onClick={handleDiscard}>DISCARD</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        )}

        <div className={styles.content}>
          {/* Left column */}
          <div className={styles.leftCol}>
            {/* Avatar */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarCircle} onClick={() => fileRef.current.click()}>
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <UserIcon />
                  </div>
                )}
                <div className={styles.avatarOverlay}>Change</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>

            {/* Username */}
            <div className={styles.nameRow}>
              <span className={styles.usernameText}>@{username}</span>
              <button className={styles.editIconBtn} onClick={() => {
                const newName = prompt('New username:', username)
                if (newName && newName !== username) { setUsername(newName); setDirty(true) }
              }}>
                <EditIcon />
              </button>
            </div>

            {/* Display name */}
            <div className={styles.nameRow}>
              <span className={styles.displayNameText}>{displayName || user.email}</span>
              <button className={styles.editIconBtn} onClick={() => {
                const newDisplay = prompt('Display name:', displayName)
                if (newDisplay !== null && newDisplay !== displayName) { setDisplayName(newDisplay); setDirty(true) }
              }}>
                <EditIcon />
              </button>
            </div>

            {/* About section */}
            <div className={styles.aboutSection}>
              <p className={styles.aboutLabel}>ABOUT</p>
              <textarea
                className={styles.aboutTextarea}
                placeholder="write something about yourself...."
                value={bio}
                onChange={(e) => { setBio(e.target.value); setDirty(true) }}
                rows={7}
              />
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            {/* Delete account */}
            {!showDeleteConfirm ? (
              <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                <TrashIcon /> Delete my account
              </button>
            ) : (
              <div className={styles.deleteConfirm}>
                <p className={styles.deleteConfirmText}>Are you sure? This cannot be undone.</p>
                <div className={styles.deleteConfirmBtns}>
                  <button className={styles.deleteCancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                  <button className={styles.deleteConfirmBtn} onClick={handleDeleteAccount}>Yes, delete</button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — reserved for future ranking system */}
          <div className={styles.rightCol}>
            <p className={styles.rightPlaceholder}>[leave this space for future. i will add a ranking system here.]</p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function UserIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'6px'}}>
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}
