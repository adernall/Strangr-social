'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { fetchUserSpaces } from '../../lib/feedEngine'
import styles from './QuickPost.module.css'

export default function QuickPost({ onClose }) {
  const { user } = useAuth()
  const router   = useRouter()

  const [spaces, setSpaces]         = useState([])
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [content, setContent]       = useState('')
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [tags, setTags]             = useState([])
  const [tagInput, setTagInput]     = useState('')
  const [posting, setPosting]       = useState(false)
  const [error, setError]           = useState('')
  const [step, setStep]             = useState('pick') // 'pick' | 'write'
  const fileRef = useRef()

  useEffect(() => {
    if (!user) return
    fetchUserSpaces(user.id).then((data) => {
      setSpaces(data || [])
    })
  }, [user])

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
    setError('')
    if (!selectedSpace) return setError('Pick a space first.')
    if (!content.trim()) return setError('Write something.')
    setPosting(true)

    let image_url = ''
    if (imageFile) {
      const path = `posts/${user.id}/${Date.now()}.${imageFile.name.split('.').pop()}`
      await supabase.storage.from('avatars').upload(path, imageFile)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      image_url = data.publicUrl
    }

    const { data: post, error: postErr } = await supabase
      .from('posts')
      .insert({
        space_id: selectedSpace.id,
        user_id: user.id,
        content: content.trim(),
        image_url,
        tags,
        feed_score: 10,
      })
      .select()
      .single()

    setPosting(false)
    if (postErr) return setError(postErr.message)
    onClose()
    router.push(`/posts/${post.id}`)
  }

  if (!user) return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.loginPrompt}>Please log in to create a post.</p>
        <button className={styles.loginBtn} onClick={() => { onClose(); router.push('/?auth=login') }}>Log in</button>
      </div>
    </div>
  )

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          {step === 'write' && (
            <button className={styles.backStepBtn} onClick={() => setStep('pick')}>← Back</button>
          )}
          <h3 className={styles.modalTitle}>
            {step === 'pick' ? 'Choose a Space' : 'Create Post'}
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Step 1: pick space */}
        {step === 'pick' && (
          <div className={styles.spacePicker}>
            {spaces.length === 0 ? (
              <div className={styles.noSpaces}>
                <p>You haven't joined any spaces yet.</p>
                <button
                  className={styles.createSpaceBtn}
                  onClick={() => { onClose(); router.push('/spaces/create') }}
                >
                  Create a Space →
                </button>
                <button
                  className={styles.browseFeedBtn}
                  onClick={() => { onClose(); router.push('/feed') }}
                >
                  Browse Feed
                </button>
              </div>
            ) : (
              <div className={styles.spaceList}>
                {spaces.map((s) => (
                  <div
                    key={s.id}
                    className={`${styles.spaceRow} ${selectedSpace?.id === s.id ? styles.spaceRowSelected : ''}`}
                    onClick={() => { setSelectedSpace(s); setStep('write') }}
                  >
                    <div className={styles.spaceIcon}>
                      {s.icon_url
                        ? <img src={s.icon_url} alt="" className={styles.spaceIconImg} />
                        : <span>{s.name[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className={styles.spaceInfo}>
                      <p className={styles.spaceName}>{s.name}</p>
                      <p className={styles.spaceMeta}>{(s.member_count || 0).toLocaleString()} members</p>
                    </div>
                    <span className={styles.selectArrow}>→</span>
                  </div>
                ))}
                <button
                  className={styles.newSpaceRow}
                  onClick={() => { onClose(); router.push('/spaces/create') }}
                >
                  <span className={styles.newSpacePlus}>+</span>
                  <span>Create a new space</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: write post */}
        {step === 'write' && selectedSpace && (
          <div className={styles.writeStep}>
            {/* Space indicator */}
            <div className={styles.selectedSpaceChip}>
              <div className={styles.spaceIconSmall}>
                {selectedSpace.icon_url
                  ? <img src={selectedSpace.icon_url} alt="" className={styles.spaceIconImg} />
                  : <span>{selectedSpace.name[0].toUpperCase()}</span>
                }
              </div>
              <span>{selectedSpace.name}</span>
            </div>

            <textarea
              className={styles.contentArea}
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              autoFocus
              maxLength={2000}
            />

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
                  placeholder="add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.writeFooter}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              <button className={styles.imgBtn} onClick={() => fileRef.current.click()}>
                <ImgIcon />
              </button>
              <span className={styles.charCount}>{content.length}/2000</span>
              <button className={styles.postBtn} onClick={handlePost} disabled={posting || !content.trim()}>
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ImgIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
}
