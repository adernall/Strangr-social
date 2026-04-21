'use client'

// This replaces the old homepage.
// Feed is now the default "/" route for logged-in users.
// Anonymous users still see the landing/chat page.

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { fetchFeedPosts, fetchUserSpaces } from '../lib/feedEngine'
import AppShell from '../components/AppShell'
import PostCard from '../components/posts/BentoPost'
import styles from './page.module.css'

const ParticlesBg = dynamic(() => import('../components/ParticlesBg'), { ssr: false })

const ALL_TAGS = ['tech','art','gaming','music','science','sports','movies','food','travel','design','crypto','anime']

function getBentoSize(index) {
  const pattern = ['large','small','small','medium','medium','small','large','small','medium','small']
  return pattern[index % pattern.length]
}

// ── ANONYMOUS LANDING ──────────────────────────────────────────────────────
function AnonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [showAuth, setShowAuth] = useState(null)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login') setShowAuth('login')
    if (auth === 'signup') setShowAuth('signup')
  }, [searchParams])

  function reset() { setEmail(''); setPassword(''); setConfirm(''); setError(''); setMessage('') }
  function open(type) { reset(); setShowAuth(type) }

  async function handleLogin() {
    setError(''); setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) return setError(err.message)
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
    setShowAuth(null)
    router.push(profile ? '/' : '/setup-profile')
  }

  async function handleSignup() {
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) return setError(err.message)
    setMessage('Check your email to confirm, then log in.')
  }

  async function handleReset() {
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://strangr-social.onrender.com/reset-password',
    })
    setLoading(false)
    if (err) return setError(err.message)
    setMessage('Reset link sent — check your email.')
  }

  return (
    <div className={styles.anonPage}>
      <ParticlesBg />
      <div className={styles.blob1} /><div className={styles.blob2} />

      <header className={styles.anonTopbar}>
        <span className={styles.anonLogo}>Strangr</span>
        <div className={styles.anonTopRight}>
          <button className={styles.anonSearchBtn} onClick={() => router.push('/search')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button className={styles.loginBtn} onClick={() => open('login')}>Login</button>
        </div>
      </header>

      <div className={styles.anonCenter}>
        <p className={styles.eyebrow}>ANONYMOUS · REAL-TIME · FREE</p>
        <h1 className={styles.headline}>Talk to a<br /><span className={styles.accent}>stranger.</span></h1>
        <p className={styles.sub}>No account needed. Click and connect with someone new, anywhere in the world.</p>
        <div className={styles.anonActions}>
          <button className={styles.primaryBtn} onClick={() => router.push('/chat')}>Start chatting →</button>
          <button className={styles.secondaryBtn} onClick={() => open('signup')}>Create account</button>
        </div>
      </div>

      {showAuth && (
        <div className={styles.overlay} onClick={() => { setShowAuth(null); router.replace('/') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => { setShowAuth(null); router.replace('/') }}>✕</button>

            {showAuth === 'login' && (
              <>
                <h2 className={styles.modalTitle}>Welcome back</h2>
                <div className={styles.form}>
                  <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                  {error && <p className={styles.errMsg}>{error}</p>}
                  <button className={styles.submitBtn} onClick={handleLogin} disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
                  <p className={styles.forgotLink} onClick={() => open('reset')}>Forgot password?</p>
                </div>
                <p className={styles.toggle}>No account? <span onClick={() => open('signup')}>Sign up</span></p>
              </>
            )}

            {showAuth === 'signup' && (
              <>
                <h2 className={styles.modalTitle}>Join Strangr</h2>
                {message ? <p className={styles.successMsg}>{message}</p> : (
                  <div className={styles.form}>
                    <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <input className={styles.input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignup()} />
                    {error && <p className={styles.errMsg}>{error}</p>}
                    <button className={styles.submitBtn} onClick={handleSignup} disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
                  </div>
                )}
                <p className={styles.toggle}>Have an account? <span onClick={() => open('login')}>Log in</span></p>
              </>
            )}

            {showAuth === 'reset' && (
              <>
                <h2 className={styles.modalTitle}>Reset password</h2>
                {message ? <p className={styles.successMsg}>{message}</p> : (
                  <div className={styles.form}>
                    <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReset()} />
                    {error && <p className={styles.errMsg}>{error}</p>}
                    <button className={styles.submitBtn} onClick={handleReset} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
                  </div>
                )}
                <p className={styles.toggle}>Back to <span onClick={() => open('login')}>Log in</span></p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── LOGGED-IN FEED ─────────────────────────────────────────────────────────
function FeedPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [posts, setPosts]       = useState([])
  const [mySpaces, setMySpaces] = useState([])
  const [activeTag, setActiveTag] = useState(null)
  const [page, setPage]         = useState(0)
  const [loading, setLoading]   = useState(true)
  const [hasMore, setHasMore]   = useState(true)

  useEffect(() => {
    loadFeed(0, activeTag, true)
    if (user) fetchUserSpaces(user.id).then(setMySpaces)
  }, [user, activeTag])

  async function loadFeed(pageNum = 0, tag = null, reset = false) {
    setLoading(true)
    const data = await fetchFeedPosts({ page: pageNum, limit: 18, tagFilter: tag })
    setPosts((prev) => reset ? data : [...prev, ...data])
    setHasMore(data.length === 18)
    setPage(pageNum)
    setLoading(false)
  }

  function handleTag(tag) { setActiveTag(tag === activeTag ? null : tag) }

  return (
    <AppShell>
      <div className={styles.feedPage}>
        {/* Header */}
        <div className={styles.feedTopBar}>
          <div>
            <h1 className={styles.feedTitle}>Feed</h1>
            <p className={styles.feedSub}>Posts from across all spaces</p>
          </div>
          <button className={styles.newSpaceBtn} onClick={() => router.push('/spaces/create')}>
            + New Space
          </button>
        </div>

        {/* My spaces row */}
        {mySpaces.length > 0 && (
          <div className={styles.mySpacesRow}>
            <p className={styles.mySpacesLabel}>YOUR SPACES</p>
            <div className={styles.mySpacesScroll}>
              {mySpaces.map((s) => (
                <div key={s.id} className={styles.mySpaceChip} onClick={() => router.push(`/spaces/${s.slug}`)}>
                  <div className={styles.mySpaceIcon}>
                    {s.icon_url ? <img src={s.icon_url} alt="" className={styles.mySpaceIconImg} /> : <span>{s.name[0].toUpperCase()}</span>}
                  </div>
                  <span>{s.name}</span>
                </div>
              ))}
              <div className={`${styles.mySpaceChip} ${styles.addSpaceChip}`} onClick={() => router.push('/spaces/create')}>
                <span className={styles.addSpacePlus}>+</span><span>New</span>
              </div>
            </div>
          </div>
        )}

        {/* Tag filters */}
        <div className={styles.tagFilters}>
          <button className={`${styles.tagFilter} ${!activeTag ? styles.tagFilterActive : ''}`} onClick={() => handleTag(null)}>All</button>
          {ALL_TAGS.map((tag) => (
            <button key={tag} className={`${styles.tagFilter} ${activeTag === tag ? styles.tagFilterActive : ''}`} onClick={() => handleTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>

        {/* Bento grid */}
        {loading && posts.length === 0 ? (
          <div className={styles.bentoGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`${styles.bentoItem} ${styles[getBentoSize(i)]} ${styles.skeleton}`} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            <p>No posts yet.</p>
            <p className={styles.emptySub}>Create a space and start posting!</p>
            <button className={styles.createSpaceBtn2} onClick={() => router.push('/spaces/create')}>Create a Space →</button>
          </div>
        ) : (
          <div className={styles.bentoGrid}>
            {posts.map((post, i) => (
              <div key={post.id} className={`${styles.bentoItem} ${styles[getBentoSize(i)]}`}>
                <PostCard post={post} size={getBentoSize(i)} />
              </div>
            ))}
          </div>
        )}

        {hasMore && posts.length > 0 && (
          <div className={styles.loadMoreWrap}>
            <button className={styles.loadMoreBtn} onClick={() => loadFeed(page + 1, activeTag)} disabled={loading}>
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}

// ── DEFAULT EXPORT: route based on auth ───────────────────────────────────
function HomePage() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#080810' }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(108,99,255,0.2)', borderTopColor: '#6c63ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return user ? <FeedPage /> : <AnonPage />
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  )
}
