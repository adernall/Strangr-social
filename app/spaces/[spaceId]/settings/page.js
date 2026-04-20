'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../lib/AuthContext'
import { fetchSpace, getMemberRole, toSlug } from '../../../../lib/feedEngine'
import AppShell from '../../../../components/AppShell'
import styles from './settings.module.css'

const SUGGESTED_TAGS = ['tech','art','gaming','music','science','sports','movies','food','travel','design','crypto','anime']

export default function SpaceSettingsPage() {
  const { spaceId } = useParams()
  const { user }    = useAuth()
  const router      = useRouter()

  const [space, setSpace]           = useState(null)
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [about, setAbout]           = useState('')
  const [tags, setTags]             = useState([])
  const [isPrivate, setIsPrivate]   = useState(false)
  const [iconFile, setIconFile]     = useState(null)
  const [iconPreview, setIconPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [requests, setRequests]     = useState([])
  const iconRef   = useRef()
  const bannerRef = useRef()

  useEffect(() => { loadSpace() }, [spaceId, user])

  async function loadSpace() {
    const data = await fetchSpace(spaceId)
    if (!data) return router.push('/')
    const role = user ? await getMemberRole(data.id, user.id) : null
    if (role !== 'owner' && role !== 'admin') return router.push(`/spaces/${spaceId}`)

    setSpace(data)
    setName(data.name)
    setDescription(data.description || '')
    setAbout(data.about || '')
    setTags(data.tags || [])
    setIsPrivate(data.is_private)
    setIconPreview(data.icon_url || null)
    setBannerPreview(data.banner_url || null)

    if (data.is_private) loadRequests(data.id)
  }

  async function loadRequests(id) {
    const { data } = await supabase
      .from('space_requests')
      .select('id, user_id, requested_at, user:user_id(username, avatar_url)')
      .eq('space_id', id)
      .eq('status', 'pending')
    setRequests(data || [])
  }

  async function handleSave() {
    setError(''); setSaving(true)

    let icon_url   = space.icon_url
    let banner_url = space.banner_url

    if (iconFile) {
      const path = `spaces/${user.id}/icon-${Date.now()}.${iconFile.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(path, iconFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      icon_url = data.publicUrl
    }

    if (bannerFile) {
      const path = `spaces/${user.id}/banner-${Date.now()}.${bannerFile.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(path, bannerFile, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      banner_url = data.publicUrl
    }

    const { error: err } = await supabase
      .from('spaces')
      .update({ name: name.trim(), description: description.trim(), about: about.trim(), tags, is_private: isPrivate, icon_url, banner_url })
      .eq('id', space.id)

    setSaving(false)
    if (err) return setError(err.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleApproveRequest(req) {
    await supabase.from('space_requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('space_members').insert({ space_id: space.id, user_id: req.user_id, role: 'member' })
    setRequests((r) => r.filter((x) => x.id !== req.id))
  }

  async function handleRejectRequest(req) {
    await supabase.from('space_requests').update({ status: 'rejected' }).eq('id', req.id)
    setRequests((r) => r.filter((x) => x.id !== req.id))
  }

  async function handleDeleteSpace() {
    await supabase.from('spaces').delete().eq('id', space.id)
    router.push('/')
  }

  function toggleTag(tag) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function handleIcon(e) {
    const file = e.target.files[0]; if (!file) return
    setIconFile(file); setIconPreview(URL.createObjectURL(file))
  }

  function handleBanner(e) {
    const file = e.target.files[0]; if (!file) return
    setBannerFile(file); setBannerPreview(URL.createObjectURL(file))
  }

  if (!space) return <AppShell><div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}><div className={styles.spinner}/></div></AppShell>

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => router.push(`/spaces/${spaceId}`)}>← Back to Space</button>
          <h1 className={styles.title}>Manage Space</h1>
        </div>

        <div className={styles.grid}>
          {/* Left: settings */}
          <div className={styles.mainCol}>

            {/* Banner */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>BANNER</p>
              <div
                className={styles.bannerPreview}
                style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : {}}
                onClick={() => bannerRef.current.click()}
              >
                {!bannerPreview && <span className={styles.bannerPlaceholder}>Click to upload banner</span>}
              </div>
              <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBanner} />
            </div>

            {/* Icon + name */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ICON & NAME</p>
              <div className={styles.iconNameRow}>
                <div className={styles.iconCircle} onClick={() => iconRef.current.click()}>
                  {iconPreview
                    ? <img src={iconPreview} alt="" className={styles.iconImg} />
                    : <span>{name[0]?.toUpperCase() || '?'}</span>
                  }
                </div>
                <input ref={iconRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIcon} />
                <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Space name" />
              </div>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>DESCRIPTION</p>
              <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description..." />
            </div>

            {/* About */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ABOUT SECTION</p>
              <textarea className={styles.textarea} value={about} onChange={(e) => setAbout(e.target.value)} rows={5} placeholder="Detailed about section shown on the About tab..." />
            </div>

            {/* Tags */}
            <div className={styles.section}>
              <p className={styles.sectionLabel}>TAGS</p>
              <div className={styles.tagGrid}>
                {SUGGESTED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className={`${styles.tagChip} ${tags.includes(tag) ? styles.tagSelected : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className={styles.section}>
              <div className={styles.privacyRow}>
                <div>
                  <p className={styles.privacyTitle}>Private Space</p>
                  <p className={styles.privacyDesc}>Members must request to join</p>
                </div>
                <button className={`${styles.toggle} ${isPrivate ? styles.toggleOn : ''}`} onClick={() => setIsPrivate(!isPrivate)}>
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>

          {/* Right: join requests + danger */}
          <div className={styles.sideCol}>
            {/* Join requests */}
            {isPrivate && (
              <div className={styles.sideCard}>
                <p className={styles.sideCardTitle}>Join Requests</p>
                {requests.length === 0
                  ? <p className={styles.noRequests}>No pending requests.</p>
                  : requests.map((req) => (
                    <div key={req.id} className={styles.requestRow}>
                      <div className={styles.reqAvatar}>
                        {req.user?.avatar_url
                          ? <img src={req.user.avatar_url} alt="" className={styles.reqAvatarImg} />
                          : <span>{(req.user?.username || '?')[0].toUpperCase()}</span>
                        }
                      </div>
                      <span className={styles.reqName}>@{req.user?.username}</span>
                      <div className={styles.reqActions}>
                        <button className={styles.approveBtn} onClick={() => handleApproveRequest(req)}>✓</button>
                        <button className={styles.rejectBtn} onClick={() => handleRejectRequest(req)}>✕</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Invite link */}
            <div className={styles.sideCard}>
              <p className={styles.sideCardTitle}>Invite Link</p>
              <p className={styles.inviteDesc}>Share this link to invite people directly.</p>
              <button
                className={styles.copyInviteBtn}
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/spaces/join/${space.invite_token}`)}
              >
                Copy Invite Link
              </button>
            </div>

            {/* Danger zone */}
            <div className={styles.dangerCard}>
              <p className={styles.dangerTitle}>Danger Zone</p>
              {!showDelete
                ? <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>Delete this Space</button>
                : (
                  <div className={styles.deleteConfirm}>
                    <p className={styles.deleteWarn}>This will permanently delete the space and all its posts. Cannot be undone.</p>
                    <button className={styles.deleteConfirmBtn} onClick={handleDeleteSpace}>Yes, delete</button>
                    <button className={styles.deleteCancelBtn} onClick={() => setShowDelete(false)}>Cancel</button>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
