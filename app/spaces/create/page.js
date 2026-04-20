'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../lib/AuthContext'
import { toSlug } from '../../../lib/feedEngine'
import AppShell from '../../../components/AppShell'
import styles from './create.module.css'

const SUGGESTED_TAGS = ['tech', 'art', 'gaming', 'music', 'science', 'sports', 'movies', 'food', 'travel', 'design', 'crypto', 'anime']

export default function CreateSpacePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedTags, setSelectedTags] = useState([])
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) {
    router.push('/?auth=login')
    return null
  }

  const slug = toSlug(name)

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleIcon(e) {
    const file = e.target.files[0]
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  async function handleCreate() {
    setError('')
    if (!name.trim()) return setError('Space name is required.')
    if (name.length < 3) return setError('Name must be at least 3 characters.')
    if (slug.length < 3) return setError('Name produces an invalid URL slug.')

    setLoading(true)

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('spaces')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      setLoading(false)
      return setError('A space with this name already exists. Try a different name.')
    }

    let icon_url = ''

    if (iconFile) {
      const ext = iconFile.name.split('.').pop()
      const path = `spaces/${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, iconFile, { upsert: true })
      if (!uploadErr) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        icon_url = data.publicUrl
      }
    }

    // Create space
    const { data: space, error: spaceErr } = await supabase
      .from('spaces')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim(),
        icon_url,
        creator_id: user.id,
        tags: selectedTags,
        is_private: isPrivate,
      })
      .select()
      .single()

    if (spaceErr) {
      setLoading(false)
      return setError(spaceErr.message)
    }

    // Auto-join as owner
    await supabase.from('space_members').insert({
      space_id: space.id,
      user_id: user.id,
      role: 'owner',
    })

    router.push(`/spaces/${space.slug}`)
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create a Space</h1>
          <p className={styles.sub}>Spaces are communities where users share posts around a topic.</p>

          {/* Icon */}
          <div className={styles.iconSection}>
            <label className={styles.iconLabel} htmlFor="icon-upload">
              <div className={styles.iconCircle}>
                {iconPreview
                  ? <img src={iconPreview} alt="" className={styles.iconImg} />
                  : <span className={styles.iconPlus}>+</span>
                }
                <div className={styles.iconOverlay}>Change</div>
              </div>
            </label>
            <input id="icon-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIcon} />
            <p className={styles.iconHint}>Space icon (optional)</p>
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Space Name</label>
            <input
              className={styles.input}
              placeholder="e.g. Dev Talk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            {slug && <p className={styles.slugPreview}>strangr.com/spaces/<strong>{slug}</strong></p>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Description</label>
            <textarea
              className={styles.textarea}
              placeholder="What is this space about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Tags */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Tags
              {selectedTags.length > 0 && <span className={styles.tagCount}>{selectedTags.length} selected</span>}
            </label>
            <div className={styles.tagGrid}>
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tagChip} ${selectedTags.includes(tag) ? styles.tagSelected : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className={styles.privacyRow}>
            <div>
              <p className={styles.privacyTitle}>Private Space</p>
              <p className={styles.privacyDesc}>Members must request to join</p>
            </div>
            <button
              className={`${styles.toggle} ${isPrivate ? styles.toggleOn : ''}`}
              onClick={() => setIsPrivate(!isPrivate)}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.createBtn} onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Space →'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
