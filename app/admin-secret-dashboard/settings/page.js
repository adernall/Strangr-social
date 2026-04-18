'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAdminGate } from '../../../../lib/useAdminGate'
import AdminShell from '../../../../components/admin/AdminShell'
import styles from './settings.module.css'

export default function SettingsPage() {
  const { admin, checking } = useAdminGate()
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [error, setError] = useState('')
  const [pwError, setPwError] = useState('')
  const [templates, setTemplates] = useState([])
  const fileRef = useRef()

  useEffect(() => {
    if (admin) {
      setUsername(admin.username || '')
      fetchProfile()
      fetchTemplates()
    }
  }, [admin])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, bio, avatar_url')
      .eq('id', admin.id)
      .single()
    if (data) {
      setUsername(data.username || '')
      setDisplayName(data.display_name || '')
      setBio(data.bio || '')
      setAvatarPreview(data.avatar_url || null)
    }
  }

  async function fetchTemplates() {
    // System message templates from moderation logs patterns
    setTemplates([
      { type: 'SYSTEM', name: 'Ban Notice', content: 'Your account has been permanently banned from Strangr for violating community guidelines.', status: 'Active', uses: '4.2k' },
      { type: 'MODERATOR', name: 'Cooldown Notice', content: 'Your account has been placed in temporary cooldown due to a policy violation.', status: 'Active', uses: '892' },
      { type: 'ANNOUNCEMENT', name: 'Welcome Message', content: 'Welcome to Strangr! Please review our community guidelines before chatting.', status: 'Draft', uses: '0' },
    ])
  }

  function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    setError('')
    setSaving(true)

    let avatar_url = avatarPreview

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${admin.id}/avatar.${ext}`
      await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      avatar_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim(), display_name: displayName.trim(), bio: bio.trim(), avatar_url })
      .eq('id', admin.id)

    setSaving(false)

    if (updateError) {
      setError(updateError.message.includes('unique') ? 'Username already taken.' : updateError.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleUpdatePassword() {
    setPwError('')
    if (!newPassword || newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.')
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) { setPwError(error.message); return }
    setCurrentPassword('')
    setNewPassword('')
    setPwSaved(true)
    setTimeout(() => setPwSaved(false), 3000)
  }

  async function handleLogoutAll() {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/')
  }

  if (checking) return null

  const templateTypeColor = { SYSTEM: { bg: '#dbeafe', color: '#2563eb' }, MODERATOR: { bg: '#fef3c7', color: '#d97706' }, ANNOUNCEMENT: { bg: '#dcfce7', color: '#16a34a' } }

  return (
    <AdminShell admin={admin} searchPlaceholder="Search settings...">
      <div>
        <h1 className={styles.pageTitle}>System Configuration</h1>
        <p className={styles.pageSub}>
          Refine your administrative footprint and manage the core operational logic of the Strangr platform.
        </p>

        <div className={styles.contentGrid}>
          {/* Left: Profile */}
          <div className={styles.profileCard}>
            <div className={styles.profileCardHeader}>
              <div>
                <h3 className={styles.cardTitle}>Profile Identity</h3>
                <p className={styles.cardSub}>Update your public profile and avatar across the admin panel.</p>
              </div>
              <button className={styles.saveBtn} onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
              </button>
            </div>

            <div className={styles.profileBody}>
              {/* Avatar */}
              <div className={styles.avatarSection}>
                <div className={styles.avatarCircle} onClick={() => fileRef.current.click()}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className={styles.avatarImg} />
                  ) : (
                    <span className={styles.avatarInitial}>{(username || 'A')[0].toUpperCase()}</span>
                  )}
                  <div className={styles.avatarCameraIcon}>📷</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
                  Upload New Avatar
                </button>
                <p className={styles.uploadHint}>JPG or PNG. Max 2MB.</p>
              </div>

              {/* Fields */}
              <div className={styles.fields}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>USERNAME</label>
                  <input
                    className={styles.fieldInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>DISPLAY NAME</label>
                  <input
                    className={styles.fieldInput}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>BIO / SIGNATURE</label>
                  <textarea
                    className={styles.fieldTextarea}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    placeholder="Admin bio..."
                  />
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
              </div>
            </div>
          </div>

          {/* Right: Security */}
          <div className={styles.securityCol}>
            <div className={styles.securityCard}>
              <h3 className={styles.cardTitle}>
                <span className={styles.securityIcon}>🛡</span> Security
              </h3>

              <div className={styles.twoFaRow}>
                <div>
                  <p className={styles.twoFaTitle}>Two-Factor Auth</p>
                  <p className={styles.twoFaSub}>Enhanced protection via authenticator app.</p>
                </div>
                <button className={styles.configureBtn}>CONFIGURE →</button>
              </div>

              <div className={styles.fieldGroup} style={{ marginTop: '1.25rem' }}>
                <label className={styles.fieldLabel}>CURRENT PASSWORD</label>
                <input
                  className={styles.fieldInput}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>NEW PASSWORD</label>
                <input
                  className={styles.fieldInput}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password..."
                />
              </div>

              {pwError && <p className={styles.errorMsg}>{pwError}</p>}
              {pwSaved && <p className={styles.successMsg}>Password updated successfully.</p>}

              <button className={styles.updateCredBtn} onClick={handleUpdatePassword} disabled={pwSaving}>
                {pwSaving ? 'Updating...' : 'Update Credentials'}
              </button>

              <div className={styles.privacyAlert}>
                <span className={styles.privacyIcon}>🔴</span>
                <div>
                  <p className={styles.privacyTitle}>Privacy Concern</p>
                  <p className={styles.privacySub}>Admin session is active. Keep your credentials secure.</p>
                </div>
              </div>

              <button className={styles.logoutAllBtn} onClick={handleLogoutAll}>
                Log Out from All Devices
              </button>
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className={styles.templatesCard}>
          <div className={styles.templatesHeader}>
            <div>
              <h3 className={styles.cardTitle}>Communication Strategy</h3>
              <p className={styles.cardSub}>Manage the tone and delivery of automated system notifications.</p>
            </div>
            <button className={styles.newTemplateBtn}>+ New Template</button>
          </div>

          <div className={styles.templateGrid}>
            {templates.map((t) => {
              const typeStyle = templateTypeColor[t.type] || { bg: '#f3f4f6', color: '#6b7280' }
              return (
                <div key={t.name} className={styles.templateCard}>
                  <div className={styles.templateCardHeader}>
                    <span className={styles.templateType} style={{ background: typeStyle.bg, color: typeStyle.color }}>
                      {t.type}
                    </span>
                    <button className={styles.templateEditBtn}>✎</button>
                  </div>
                  <h4 className={styles.templateName}>{t.name}</h4>
                  <p className={styles.templateContent}>{t.content.slice(0, 80)}...</p>
                  <div className={styles.templateFooter}>
                    <span className={`${styles.templateStatus} ${t.status === 'Active' ? styles.statusActive : styles.statusDraft}`}>
                      {t.status === 'Active' ? '✓' : '○'} {t.status}
                    </span>
                    <span className={styles.templateUses}>Used {t.uses} times</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Danger zone */}
        <div className={styles.dangerCard}>
          <p className={styles.dangerNote}>Administrative changes require audit logging.</p>
          <button className={styles.dangerBtn} onClick={handleLogoutAll}>Log Out from All Devices</button>
        </div>
      </div>
    </AdminShell>
  )
}
