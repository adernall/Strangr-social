// app/setup-profile/page.js
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import styles from './setup.module.css'

export default function SetupProfile() {
  const { user } = useAuth()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    setError('')
    if (!username.trim()) return setError('Username is required.')
    if (username.length < 3) return setError('Username must be at least 3 characters.')
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return setError('Username can only contain letters, numbers, and underscores.')

    setLoading(true)

    let avatar_url = ''

    // Upload avatar if selected
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filePath = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        setLoading(false)
        return setError('Avatar upload failed. Try again.')
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      avatar_url = data.publicUrl
    }

    // Save profile
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      avatar_url,
    })

    setLoading(false)

    if (insertError) {
      if (insertError.message.includes('unique')) {
        return setError('Username already taken. Try another.')
      }
      return setError(insertError.message)
    }

    router.push('/dashboard')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set up your profile</h1>
        <p className={styles.sub}>This is how others will see you on Strangr</p>

        {/* Avatar picker */}
        <div className={styles.avatarSection}>
          <div
            className={styles.avatarCircle}
            onClick={() => fileRef.current.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className={styles.avatarImg} />
            ) : (
              <span className={styles.avatarPlus}>+</span>
            )}
          </div>
          <p className={styles.avatarHint}>Upload photo (optional)</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        <div className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              placeholder="e.g. cool_user99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Bio <span className={styles.optional}>(optional)</span></label>
            <textarea
              className={styles.textarea}
              placeholder="Tell something about yourself…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.btn} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save profile →'}
          </button>
        </div>
      </div>
    </div>
  )
}