'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabase'
import { useAuth } from '../../../../../lib/AuthContext'
import { fetchSpace, getMemberRole } from '../../../../../lib/feedEngine'
import AppShell from '../../../../../components/AppShell'
import styles from '../posts/create/create-post.module.css'

export default function CreatePostPage() {
  const { slug } = useParams()
  const { user }    = useAuth()
  const router      = useRouter()

  const [space, setSpace]       = useState(null)
  const [content, setContent]   = useState('')
  const [tags, setTags]         = useState([])
  const [tagInput, setTagInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!user) { router.push('/?auth=login'); return }
    loadSpace()
  }, [spaceId, user])

  async function loadSpace() {
    const data = await fetchSpace(spaceId)
    if (!data) return router.push('/')
    const role = await getMemberRole(data.id, user.id)
    if (!role) return router.push(`/spaces/${slug}`)
    setSpace(data)
  }

  function handleImage(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  function addTag(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
      if (tag && !tags.includes(tag) && tags.length < 5) {
        setTags((prev) => [...prev, tag])
      }
      setTagInput('')
    }
  }

  function removeTag(tag) { setTags((prev) => prev.filter((t) => t !== tag)) }

  async function handlePost() {
    setError('')
    if (!content.trim()) return setError('Post content is required.')
    if (content.length < 3) return setError('Post is too short.')
    setLoading(true)

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

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        space_id: space.id,
        user_id: user.id,
        content: content.trim(),
        image_url,
        tags,
        feed_score: 10, // new post boost
      })
      .select()
      .single()

    setLoading(false)
    if (postErr) return setError(postErr.message)
    router.push(`/posts/${post.id}`)
  }

  if (!space) return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className={styles.spinner} />
      </div>
    </AppShell>
  )

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <button className={styles.backBtn} onClick={() => router.push(`/spaces/${slug}`)}>←</button>
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

          {/* Content */}
          <div className={styles.field}>
            <textarea
              className={styles.contentTextarea}
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              autoFocus
            />
            <p className={styles.charCount}>{content.length}/2000</p>
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className={styles.imagePreviewWrap}>
              <img src={imagePreview} alt="" className={styles.imagePreview} />
              <button
                className={styles.removeImage}
                onClick={() => { setImageFile(null); setImagePreview(null) }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Tags */}
          <div className={styles.field}>
            <p className={styles.fieldLabel}>TAGS (press Enter to add, max 5)</p>
            <div className={styles.tagInputWrap}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tagPill}>
                  #{tag}
                  <button className={styles.tagRemove} onClick={() => removeTag(tag)}>✕</button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  className={styles.tagInput}
                  placeholder="add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              )}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {/* Footer */}
          <div className={styles.footer}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
            <button className={styles.imgBtn} onClick={() => fileRef.current.click()}>
              <ImageIcon /> Add Image
            </button>
            <button className={styles.postBtn} onClick={handlePost} disabled={loading || !content.trim()}>
              {loading ? 'Posting...' : 'Post →'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function ImageIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
