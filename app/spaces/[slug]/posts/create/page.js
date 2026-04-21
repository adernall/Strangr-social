'use client'

// ROOT CAUSE FIXES:
// 1. useParams() used wrong param name — was 'spaceId', now 'slug'  
// 2. fetchSpace called with undefined variable
// 3. post insert used slug instead of space.id (UUID required)
// 4. No auth check before page loads

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../lib/AuthContext'
import { fetchSpace, getMemberRole } from '../../../../../lib/feedEngine'
import AppShell from '../../../../../components/AppShell'
import styles from './create-post.module.css'

export default function CreatePostPage() {
  const params  = useParams()
  const slug    = params?.slug       // ← correct param name
  const { user } = useAuth()
  const router   = useRouter()

  const [space, setSpace]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [content, setContent]   = useState('')
  const [tags, setTags]         = useState([])
  const [tagInput, setTagInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting]   = useState(false)
  const [postError, setPostError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (!user) { router.push('/?auth=login'); return }
    if (slug) loadSpace()
  }, [slug, user])

  async function loadSpace() {
    setLoading(true)
    setError(null)

    const spaceData = await fetchSpace(slug)  // fetchSpace handles slug lookup

    if (!spaceData) {
      setError('Space not found.')
      setLoading(false)
      return
    }

    // Check membership
    const role = await getMemberRole(spaceData.id, user.id)
    if (!role) {
      router.push(`/spaces/${slug}`)
      return
    }

    setSpace(spaceData)
    setLoading(false)
  }

  function handleImage(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      if (tag && !tags.includes(tag) && tags.length < 5) setTags((p) => [...p, tag])
      setTagInput('')
    }
  }

  async function handlePost() {
    setPostError('')

    // Validation
    if (!space?.id) return setPostError('Space not loaded. Please try again.')
    if (!content.trim()) return setPostError('Write something first.')
    if (content.length < 3) return setPostError('Post is too short.')

    setPosting(true)

    let image_url = ''
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `posts/${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, imageFile)
      if (!upErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        image_url = data.publicUrl
      }
    }

    // CRITICAL: use space.id (UUID), NOT slug
    const { data: post, error: insertErr } = await supabase
      .from('posts')
      .insert({
        space_id: space.id,       // ← UUID from loaded space object
        user_id: user.id,
        content: content.trim(),
        image_url,
        tags,
        feed_score: 10,           // new post boost
      })
      .select('id')
      .single()

    setPosting(false)

    if (insertErr) {
      setPostError(insertErr.message)
      return
    }

    router.push(`/posts/${post.id}`)
  }

  // ── LOADING ──
  if (loading) return (
    <AppShell>
      <div className={styles.center}><div className={styles.spinner} /></div>
    </AppShell>
  )

  // ── ERROR ──
  if (error || !space) return (
    <AppShell>
      <div className={styles.center}>
        <p className={styles.errorText}>{error || 'Space not found.'}</p>
        <button className={styles.backBtn} onClick={() => router.push('/feed')}>Browse Feed</button>
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.cardHeader}>
            <button className={styles.backBtn2} onClick={() => router.push(`/spaces/${slug}`)}>←</button>
            <div className={styles.spaceChip}>
              <div className={styles.spaceIconSmall}>
                {space.icon_url
                  ? <img src={space.icon_url} alt="" className={styles.spaceIconImg} />
                  : <span>{space.name[0].toUpperCase()}</span>
                }
              </div>
              <span>{space.name}</span>
            </div>
          </div>

          <h1 className={styles.title}>Create Post</h1>

          {/* Content textarea */}
          <textarea
            className={styles.contentArea}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            autoFocus
            maxLength={2000}
          />
          <p className={styles.charCount}>{content.length}/2000</p>

          {/* Image preview */}
          {imagePreview && (
            <div className={styles.imgPreviewWrap}>
              <img src={imagePreview} alt="" className={styles.imgPreview} />
              <button className={styles.removeImg} onClick={() => { setImageFile(null); setImagePreview(null) }}>✕</button>
            </div>
          )}

          {/* Tags */}
          <div className={styles.tagWrap}>
            {tags.map((t) => (
              <span key={t} className={styles.tagPill}>
                #{t}
                <button className={styles.tagX} onClick={() => setTags((p) => p.filter((x) => x !== t))}>✕</button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                className={styles.tagInput}
                placeholder="add tag, press Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            )}
          </div>

          {postError && <p className={styles.error}>{postError}</p>}

          {/* Footer */}
          <div className={styles.footer}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            <button className={styles.imgBtn} onClick={() => fileRef.current.click()} title="Add image">
              <ImgIcon />
            </button>
            <button
              className={styles.postBtn}
              onClick={handlePost}
              disabled={posting || !content.trim()}
            >
              {posting ? 'Posting...' : 'Post →'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function ImgIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
