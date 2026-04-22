'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './settings.module.css'

export default function SettingsPage() {
  const { user } = useAuth()
  const router   = useRouter()
  const fileRef  = useRef()

  const [profile, setProfile]     = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio]             = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState('')
  const [showDelete, setShowDelete] = useState(false)

  useEffect(() => {
    if (!user) { router.push('/'); return }
    loadProfile()
  }, [user])

  async function loadProfile() {
    const { data } = await supabase.from('profiles')
      .select('id, username, display_name, bio, avatar_url, email:id')
      .eq('id', user.id).maybeSingle()
    if (!data) return router.push('/setup-profile')
    setProfile(data)
    setDisplayName(data.display_name || '')
    setBio(data.bio || '')
    setAvatarPreview(data.avatar_url || null)
  }

  function handleAvatar(e) {
    const f = e.target.files[0]; if (!f) return
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    setError(''); setSaving(true)
    let avatar_url = profile.avatar_url
    if (avatarFile) {
      const path = `${user.id}/avatar.${avatarFile.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = data.publicUrl
    }
    const { error: e } = await supabase.from('profiles').update({ display_name: displayName.trim(), bio: bio.trim(), avatar_url }).eq('id', user.id)
    setSaving(false)
    if (e) return setError(e.message)
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function handlePasswordChange() {
    if (!newPassword || newPassword.length < 6) return setError('Password must be at least 6 characters.')
    const { error: e } = await supabase.auth.updateUser({ password: newPassword })
    if (e) return setError(e.message)
    setNewPassword('')
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function handleDeleteAccount() {
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return (
    <AppShell>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh' }}>
        <div className={styles.spinner} />
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageSub}>Manage your account preferences and application experience.</p>
        </div>

        {/* Account card */}
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <div className={styles.cardTitleLeft}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className={styles.cardTitle}>Account</span>
            </div>
            <button className={styles.editProfileBtn} onClick={() => {}}>Edit Profile</button>
          </div>

          {/* Avatar + name section */}
          <div className={styles.profileEdit}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarCircle} onClick={() => fileRef.current.click()}>
                {avatarPreview ? <img src={avatarPreview} alt="" className={styles.avatarImg} /> : <span className={styles.avatarFallback}>{(profile.username || 'U')[0].toUpperCase()}</span>}
                <div className={styles.avatarOverlay}>Change</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatar} />
            </div>
            <div className={styles.profileFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>NAME</label>
                <input className={styles.fieldInput} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>BIO</label>
                <textarea className={styles.fieldTextarea} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell people about yourself..." />
                <p className={styles.charCount}>{bio.length} / 160</p>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className={styles.infoRow}>
            <div>
              <p className={styles.infoLabel}>Email Address</p>
              <p className={styles.infoValue}>{user.email}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <div className={styles.infoRow}>
            <div>
              <p className={styles.infoLabel}>Username</p>
              <p className={styles.infoValue}>@{profile.username}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <div className={styles.infoRow}>
            <div>
              <p className={styles.infoLabel}>Password</p>
              <p className={styles.infoValue}>Last changed recently</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button className={styles.saveChangesBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Changes Saved' : 'Save Changes'}
          </button>
        </div>

        {/* Privacy + Alerts row */}
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <div className={styles.cardTitleLeft} style={{ marginBottom: '1.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span className={styles.cardTitle}>Privacy</span>
            </div>
            <Toggle label="Private Profile" sub="Only approved followers can see your posts" />
            <Toggle label="Read Receipts" sub="Show when you've read messages" />
            <button className={styles.linkBtn}>Manage Blocked Users ↗</button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitleLeft} style={{ marginBottom: '1.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <span className={styles.cardTitle}>Alerts</span>
            </div>
            <Toggle label="Push Notifications" sub="Receive push notifications" defaultOn />
            <Toggle label="Email Digests" sub="Weekly activity summary" />
            <button className={styles.linkBtn}>Notification Sounds ♪</button>
          </div>
        </div>

        {/* Security */}
        <div className={styles.card}>
          <div className={styles.cardTitleLeft} style={{ marginBottom: '1.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span className={styles.cardTitle}>Security</span>
          </div>
          <div className={styles.fieldGroup} style={{ maxWidth: 400 }}>
            <label className={styles.fieldLabel}>NEW PASSWORD</label>
            <input className={styles.fieldInput} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password..." />
          </div>
          <button className={styles.outlineBtn} onClick={handlePasswordChange} style={{ marginTop: '1rem' }}>Update Password</button>
        </div>

        {/* Danger zone */}
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <div className={styles.dangerContent}>
            <div>
              <p className={styles.dangerTitle}>Danger Zone</p>
              <p className={styles.dangerSub}>Permanently delete your account and all associated data.</p>
            </div>
            {!showDelete ? (
              <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>Delete Account</button>
            ) : (
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button className={styles.cancelBtn} onClick={() => setShowDelete(false)}>Cancel</button>
                <button className={styles.deleteBtn} onClick={handleDeleteAccount}>Yes, delete</button>
              </div>
            )}
          </div>
        </div>

        <p className={styles.footer}>© 2025 Strangr Platform. All rights reserved.</p>
      </div>
    </AppShell>
  )
}

function Toggle({ label, sub, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className={styles.toggleRow}>
      <div>
        <p className={styles.toggleLabel}>{label}</p>
        {sub && <p className={styles.toggleSub}>{sub}</p>}
      </div>
      <button
        className={`${styles.toggleTrack} ${on ? styles.toggleOn : ''}`}
        onClick={() => setOn(!on)}
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  )
}
