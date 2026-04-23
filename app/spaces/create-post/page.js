'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { fetchUserSpaces } from '../../lib/feedEngine'
import AppShell from '../../components/AppShell'
import styles from './create.module.css'

export default function CreatePostPage() {
  const { user }  = useAuth()
  const router    = useRouter()
  const fileRef   = useRef()

  const [spaces, setSpaces]         = useState([])
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [content, setContent]       = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [tags, setTags]             = useState([])
  const [tagInput, setTagInput]     = useState('')
  const [error, setError]           = useState('')
  const [posting, setPosting]       = useState(false)
  const [postSettings, setPostSettings] = useState({ visible: true, comments: true })

  useEffect(() => {
    if (!user) { router.push('/'); return }
    fetchUserSpaces(user.id).then(setSpaces)
  }, [user])

  function handleImg(e) {
    const f = e.target.files[0]; if (!f) return
    setImageFile(f); setImagePreview(URL.createObjectURL(f))
  }

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      if (t && !tags.includes(t) && tags.length < 5) setTags(p => [...p, t])
      setTagInput('')
    }
  }

  async function handlePost() {
    setError('')
    if (!selectedSpace?.id) return setError('Select a space to post in.')
    if (!content.trim()) return setError('Add some content to your post.')
    setPosting(true)

    let image_url = ''
    if (imageFile) {
      const path = `posts/${user.id}/${Date.now()}.${imageFile.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(path, imageFile)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      image_url = data.publicUrl
    }

    const { data: post, error: e } = await supabase.from('posts').insert({
      space_id: selectedSpace.id,
      user_id: user.id,
      content: content.trim(),
      image_url,
      tags,
      feed_score: 10,
    }).select('id').single()

    setPosting(false)
    if (e) return setError(e.message)
    router.push(`/posts/${post.id}`)
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.layout}>
          {/* Left: content editor */}
          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <h1 className={styles.title}>New Post</h1>
              <p className={styles.sub}>Share your vision with the community.</p>
            </div>

            {/* Space selector */}
            <div className={styles.spaceSelector}>
              <label className={styles.fieldLabel}>POST TO SPACE</label>
              {spaces.length === 0 ? (
                <div className={styles.noSpaces}>
                  <p>Join a space first to post.</p>
                  <button className={styles.goSpaces} onClick={() => router.push('/spaces')}>Browse Spaces →</button>
                </div>
              ) : (
                <div className={styles.spaceList}>
                  {spaces.map((s) => (
                    <button
                      key={s.id}
                      className={`${styles.spaceOption} ${selectedSpace?.id === s.id ? styles.spaceOptionActive : ''}`}
                      onClick={() => setSelectedSpace(s)}
                    >
                      <div className={styles.spaceOptionIcon}>
                        {s.icon_url ? <img src={s.icon_url} alt="" className={styles.spaceOptionIconImg} /> : <span>{s.name[0]}</span>}
                      </div>
                      <span>{s.name}</span>
                      {selectedSpace?.id === s.id && <span className={styles.spaceOptionCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className={styles.fieldGroup}>
              <textarea
                className={styles.contentArea}
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                maxLength={2000}
              />
              <p className={styles.charCount}>{content.length} / 2000</p>
            </div>

            {/* Image upload */}
            {imagePreview ? (
              <div className={styles.imgPreviewWrap}>
                <img src={imagePreview} alt="" className={styles.imgPreview} />
                <button className={styles.removeImg} onClick={() => { setImageFile(null); setImagePreview(null) }}>✕ Remove</button>
              </div>
            ) : (
              <div className={styles.mediaZone} onClick={() => fileRef.current.click()}>
                <div className={styles.mediaIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <p className={styles.mediaTitle}>UPLOAD MEDIA</p>
                <p className={styles.mediaSub}>Drag and drop images here</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImg} />

            {/* Tags */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>TAGS</label>
              <div className={styles.tagInput}>
                {tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    #{t}
                    <button className={styles.tagX} onClick={() => setTags(p => p.filter(x => x !== t))}>✕</button>
                  </span>
                ))}
                {tags.length < 5 && (
                  <input
                    className={styles.tagInputField}
                    placeholder="add tag, press Enter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                  />
                )}
              </div>
            </div>

            {/* Preview */}
            {(content || selectedSpace) && (
              <div className={styles.previewSection}>
                <p className={styles.fieldLabel}>PREVIEW</p>
                <div className={styles.previewCard}>
                  <div className={styles.previewAuthor}>
                    <div className={styles.previewAvatar}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      <p className={styles.previewName}>{user?.email?.split('@')[0] || 'you'}</p>
                      <p className={styles.previewTime}>JUST NOW</p>
                    </div>
                  </div>
                  {imagePreview && <img src={imagePreview} alt="" className={styles.previewImg} />}
                  <p className={styles.previewContent}>{content || 'The content of your post will appear here...'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: settings + actions */}
          <div className={styles.sidebar}>
            <div className={styles.settingsCard}>
              <p className={styles.settingsTitle}>POST SETTINGS</p>

              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Visible to Everyone</span>
                <Toggle on={postSettings.visible} onChange={(v) => setPostSettings(s => ({ ...s, visible: v }))} />
              </div>

              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Allow Comments</span>
                <Toggle on={postSettings.comments} onChange={(v) => setPostSettings(s => ({ ...s, comments: v }))} />
              </div>

              <div className={styles.settingRow}>
                <span className={styles.settingLabel}>Space</span>
                <span className={styles.settingValue}>{selectedSpace?.name || '—'}</span>
              </div>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button className={styles.postBtn} onClick={handlePost} disabled={posting || !content.trim() || !selectedSpace}>
              {posting ? 'POSTING...' : 'POST TO STRANGR'}
            </button>

            <button className={styles.draftBtn} disabled>
              SAVE AS DRAFT
            </button>

            <div className={styles.tipCard}>
              <p className={styles.tipText}>
                <strong>PRO TIP:</strong> Keep posts focused and authentic. Quality content gets more engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className={styles.toggleKnob} />
    </button>
  )
}
