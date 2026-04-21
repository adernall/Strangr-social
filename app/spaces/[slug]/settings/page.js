'use client'

// ROOT CAUSE FIXES:
// 1. useParams().slug was not destructured correctly
// 2. Role check happened before space loaded (race condition)
// 3. No null guard on space object
// 4. Missing guideline fields

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../lib/AuthContext'
import { fetchSpace, getMemberRole, toSlug } from '../../../../lib/feedEngine'
import AppShell from '../../../../components/AppShell'
import styles from './settings.module.css'

const SUGGESTED_TAGS = ['tech','art','gaming','music','science','sports','movies','food','travel','design','crypto','anime']

export default function SpaceSettingsPage() {
  const params  = useParams()
  const slug    = params?.slug      // ← correct param
  const { user } = useAuth()
  const router   = useRouter()

  const [space, setSpace]               = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [activeTab, setActiveTab]       = useState('general') // 'general' | 'guideline'

  // General fields
  const [name, setName]                 = useState('')
  const [description, setDescription]  = useState('')
  const [about, setAbout]               = useState('')
  const [tags, setTags]                 = useState([])
  const [isPrivate, setIsPrivate]       = useState(false)
  const [iconFile, setIconFile]         = useState(null)
  const [iconPreview, setIconPreview]   = useState(null)
  const [bannerFile, setBannerFile]     = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)

  // Guideline fields
  const [guidelineName, setGuidelineName]       = useState('')
  const [guidelineContent, setGuidelineContent] = useState('')
  const [guidelineImageFile, setGuidelineImageFile] = useState(null)
  const [guidelineImagePreview, setGuidelineImagePreview] = useState(null)

  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [requests, setRequests] = useState([])
  const [showDelete, setShowDelete] = useState(false)

  const iconRef     = useRef()
  const bannerRef   = useRef()
  const guidelineImgRef = useRef()

  useEffect(() => {
    if (slug) loadSpace()
  }, [slug, user])

  async function loadSpace() {
    setLoading(true)
    setError(null)

    if (!user) { router.push('/'); return }

    const data = await fetchSpace(slug)
    if (!data) { setError('Space not found.'); setLoading(false); return }

    const role = await getMemberRole(data.id, user.id)
    if (role !== 'owner' && role !== 'admin') {
      router.push(`/spaces/${slug}`)
      return
    }

    setSpace(data)
    setName(data.name || '')
    setDescription(data.description || '')
    setAbout(data.about || '')
    setTags(data.tags || [])
    setIsPrivate(data.is_private || false)
    setIconPreview(data.icon_url || null)
    setBannerPreview(data.banner_url || null)
    setGuidelineName(data.guideline_name || '')
    setGuidelineContent(data.guideline_content || '')
    setGuidelineImagePreview(data.guideline_image_url || null)

    if (data.is_private) loadRequests(data.id)
    setLoading(false)
  }

  async function loadRequests(spaceId) {
    const { data } = await supabase
      .from('space_requests')
      .select('id, user_id, requested_at, user:user_id(username, avatar_url)')
      .eq('space_id', spaceId)
      .eq('status', 'pending')
    setRequests(data || [])
  }

  async function uploadFile(file, path) {
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (upErr) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    setSaveError(''); setSaving(true)

    let icon_url   = space.icon_url
    let banner_url = space.banner_url
    let guideline_image_url = space.guideline_image_url || ''

    if (iconFile) {
      const url = await uploadFile(iconFile, `spaces/${user.id}/icon-${Date.now()}.${iconFile.name.split('.').pop()}`)
      if (url) icon_url = url
    }

    if (bannerFile) {
      const url = await uploadFile(bannerFile, `spaces/${user.id}/banner-${Date.now()}.${bannerFile.name.split('.').pop()}`)
      if (url) banner_url = url
    }

    if (guidelineImageFile) {
      const url = await uploadFile(guidelineImageFile, `spaces/${user.id}/guideline-${Date.now()}.${guidelineImageFile.name.split('.').pop()}`)
      if (url) guideline_image_url = url
    }

    const { error: updateErr } = await supabase.from('spaces').update({
      name: name.trim(),
      description: description.trim(),
      about: about.trim(),
      tags,
      is_private: isPrivate,
      icon_url,
      banner_url,
      guideline_name: guidelineName.trim(),
      guideline_content: guidelineContent.trim(),
      guideline_image_url,
    }).eq('id', space.id)

    setSaving(false)
    if (updateErr) return setSaveError(updateErr.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleApprove(req) {
    await supabase.from('space_requests').update({ status: 'approved' }).eq('id', req.id)
    await supabase.from('space_members').insert({ space_id: space.id, user_id: req.user_id, role: 'member' })
    setRequests((r) => r.filter((x) => x.id !== req.id))
  }

  async function handleReject(req) {
    await supabase.from('space_requests').update({ status: 'rejected' }).eq('id', req.id)
    setRequests((r) => r.filter((x) => x.id !== req.id))
  }

  async function handleDelete() {
    await supabase.from('spaces').delete().eq('id', space.id)
    router.push('/feed')
  }

  function toggleTag(tag) {
    setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])
  }

  function handleFile(e, setter, previewSetter) {
    const file = e.target.files[0]; if (!file) return
    setter(file); previewSetter(URL.createObjectURL(file))
  }

  // ── LOADING ──
  if (loading) return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className={styles.spinner} />
      </div>
    </AppShell>
  )

  // ── ERROR ──
  if (error || !space) return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <p style={{ color: 'rgba(240,240,245,0.4)', fontSize: '15px' }}>{error || 'Space not found.'}</p>
        <button className={styles.backBtn} onClick={() => router.push('/feed')}>Go back</button>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => router.push(`/spaces/${slug}`)}>← Back to Space</button>
          <div className={styles.saveBtns}>
            {saveError && <p className={styles.saveError}>{saveError}</p>}
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        </div>

        <h1 className={styles.title}>Manage Space</h1>

        {/* Tab navigation */}
        <div className={styles.settingsTabs}>
          {['general', 'guideline'].map((t) => (
            <button
              key={t}
              className={`${styles.settingsTab} ${activeTab === t ? styles.settingsTabActive : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t === 'general' ? '⚙ General' : '📋 Guideline'}
            </button>
          ))}
        </div>

        {/* ── GENERAL TAB ── */}
        {activeTab === 'general' && (
          <div className={styles.grid}>
            <div className={styles.mainCol}>
              {/* Banner */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>BANNER IMAGE</p>
                <div
                  className={styles.bannerPreview}
                  style={bannerPreview ? { backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  onClick={() => bannerRef.current.click()}
                >
                  {!bannerPreview && <span className={styles.bannerPlaceholder}>Click to upload banner (recommended 3:1 ratio)</span>}
                  <div className={styles.bannerOverlay}>Change Banner</div>
                </div>
                <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, setBannerFile, setBannerPreview)} />
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
                  <input ref={iconRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, setIconFile, setIconPreview)} />
                  <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Space name" />
                </div>
              </div>

              <div className={styles.section}>
                <p className={styles.sectionLabel}>DESCRIPTION</p>
                <textarea className={styles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Short description..." />
              </div>

              <div className={styles.section}>
                <p className={styles.sectionLabel}>ABOUT SECTION</p>
                <textarea className={styles.textarea} value={about} onChange={(e) => setAbout(e.target.value)} rows={5} placeholder="Detailed about section..." />
              </div>

              <div className={styles.section}>
                <p className={styles.sectionLabel}>TAGS</p>
                <div className={styles.tagGrid}>
                  {SUGGESTED_TAGS.map((tag) => (
                    <button key={tag} className={`${styles.tagChip} ${tags.includes(tag) ? styles.tagSelected : ''}`} onClick={() => toggleTag(tag)}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

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
            </div>

            {/* Side: requests + invite + danger */}
            <div className={styles.sideCol}>
              {isPrivate && (
                <div className={styles.sideCard}>
                  <p className={styles.sideCardTitle}>Join Requests</p>
                  {requests.length === 0
                    ? <p className={styles.noRequests}>No pending requests.</p>
                    : requests.map((req) => (
                      <div key={req.id} className={styles.requestRow}>
                        <div className={styles.reqAvatar}>
                          {req.user?.avatar_url ? <img src={req.user.avatar_url} alt="" className={styles.reqAvatarImg} /> : <span>{(req.user?.username || '?')[0].toUpperCase()}</span>}
                        </div>
                        <span className={styles.reqName}>@{req.user?.username}</span>
                        <div className={styles.reqActions}>
                          <button className={styles.approveBtn} onClick={() => handleApprove(req)}>✓</button>
                          <button className={styles.rejectBtn} onClick={() => handleReject(req)}>✕</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              <div className={styles.sideCard}>
                <p className={styles.sideCardTitle}>Invite Link</p>
                <button className={styles.copyInviteBtn} onClick={() => navigator.clipboard.writeText(`https://strangr-social.onrender.com/spaces/join/${space.invite_token}`)}>
                  Copy Invite Link
                </button>
              </div>

              <div className={styles.dangerCard}>
                <p className={styles.dangerTitle}>Danger Zone</p>
                {!showDelete ? (
                  <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>Delete this Space</button>
                ) : (
                  <div className={styles.deleteConfirm}>
                    <p className={styles.deleteWarn}>This permanently deletes the space and all posts. Cannot be undone.</p>
                    <button className={styles.deleteConfirmBtn} onClick={handleDelete}>Yes, delete</button>
                    <button className={styles.deleteCancelBtn} onClick={() => setShowDelete(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── GUIDELINE TAB ── */}
        {activeTab === 'guideline' && (
          <div className={styles.guidelineTab}>
            <div className={styles.guidelineSection}>
              <p className={styles.sectionLabel}>GUIDELINE NAME</p>
              <p className={styles.sectionHint}>This is what members see as the button label (e.g. "House Rules", "Code of Conduct")</p>
              <input
                className={styles.input}
                value={guidelineName}
                onChange={(e) => setGuidelineName(e.target.value)}
                placeholder="Community Guidelines"
                maxLength={60}
              />
            </div>

            <div className={styles.guidelineSection}>
              <p className={styles.sectionLabel}>OPTIONAL IMAGE</p>
              <p className={styles.sectionHint}>Shown at the top of the guidelines modal</p>
              {guidelineImagePreview && (
                <div className={styles.guidelineImgPreview}>
                  <img src={guidelineImagePreview} alt="" className={styles.guidelineImg} />
                  <button className={styles.removeImg} onClick={() => { setGuidelineImageFile(null); setGuidelineImagePreview(null) }}>✕ Remove</button>
                </div>
              )}
              <input ref={guidelineImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e, setGuidelineImageFile, setGuidelineImagePreview)} />
              <button className={styles.uploadGuidelineImg} onClick={() => guidelineImgRef.current.click()}>
                {guidelineImagePreview ? 'Change Image' : '+ Upload Image'}
              </button>
            </div>

            <div className={styles.guidelineSection}>
              <p className={styles.sectionLabel}>GUIDELINE CONTENT</p>
              <p className={styles.sectionHint}>Write the rules and guidelines for your space. Members will see this in a modal popup.</p>
              <textarea
                className={styles.guidelineTextarea}
                value={guidelineContent}
                onChange={(e) => setGuidelineContent(e.target.value)}
                rows={12}
                placeholder={`Write your space rules here...\n\nExample:\n1. Be respectful to all members\n2. No spam or self-promotion\n3. Stay on topic\n4. No hate speech`}
              />
              <p className={styles.charCount}>{guidelineContent.length} characters</p>
            </div>

            {!guidelineContent && (
              <p className={styles.guidelineHint}>
                💡 Leaving content empty will hide the guideline button from members.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
