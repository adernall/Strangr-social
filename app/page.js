'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { fetchFeedPosts, fetchUserSpaces } from '../lib/feedEngine'
import AppShell from '../components/AppShell'
import PostCard from '../components/posts/PostCard'
import styles from './page.module.css'

function getBentoSize(post, i) {
  if (post?.image_url) return i % 3 === 0 ? 'large' : 'medium'
  return (post?.content?.length || 0) > 200 ? 'medium' : 'small'
}

// ── ANON LANDING ────────────────────────────────────────────────────────────
function AnonLanding() {
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
    const a = searchParams.get('auth')
    if (a) setShowAuth(a)
  }, [searchParams])

  function reset() { setEmail(''); setPassword(''); setConfirm(''); setError(''); setMessage('') }
  function open(t) { reset(); setShowAuth(t) }

  async function handleLogin() {
    setError(''); setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) return setError(err.message)
    const { data: p } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle()
    router.push(p ? '/' : '/setup-profile')
  }

  async function handleSignup() {
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Min 6 characters.')
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) return setError(err.message)
    setMessage('Check your email to confirm your account.')
  }

  async function handleReset() {
    setError(''); setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://strangr-social.onrender.com/reset-password',
    })
    setLoading(false)
    if (err) return setError(err.message)
    setMessage('Reset link sent.')
  }

  return (
    <div className={styles.anonPage}>
      {/* Topbar */}
      <header className={styles.anonBar}>
        <div className={styles.anonLogo}>
          <img src="/logo/strangr-logo.png" alt="Strangr" className={styles.anonLogoImg} />
          <span className={styles.anonLogoText}>Strangr</span>
        </div>
        <nav className={styles.anonNav}>
          <button className={`${styles.anonNavLink} ${styles.anonNavActive}`}>Explore</button>
          <button className={styles.anonNavLink} onClick={() => open('login')}>Messages</button>
        </nav>
        <div className={styles.anonRight}>
          <div className={styles.anonSearch}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span>Search Strangr...</span>
          </div>
          <button className={styles.anonCreateBtn} onClick={() => router.push('/chat')}>Start Chatting</button>
          <button className={styles.anonIconBtn} onClick={() => {}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
          <button className={styles.anonAvatarBtn} onClick={() => open('login')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className={styles.anonContent}>
        <div className={styles.anonHero}>
          <h1 className={styles.anonHeadline}>
            Talk to a<br /><span className={styles.anonAccent}>stranger.</span>
          </h1>
          <p className={styles.anonSub}>Anonymous real-time chat. No account needed. Just connect.</p>
          <div className={styles.anonActions}>
            <button className={styles.anonPrimary} onClick={() => router.push('/chat')}>Start Chatting →</button>
            <button className={styles.anonSecondary} onClick={() => open('signup')}>Create Account</button>
          </div>
        </div>
      </div>

      {/* Auth modal */}
      {showAuth && (
        <div className={styles.overlay} onClick={() => { setShowAuth(null); router.replace('/') }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => { setShowAuth(null); router.replace('/') }}>✕</button>

            {showAuth === 'login' && (
              <>
                <h2 className={styles.modalTitle}>Welcome back</h2>
                <div className={styles.formGroup}>
                  <input className={styles.formInput} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className={styles.formInput} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                  {error && <p className={styles.formError}>{error}</p>}
                  <button className={styles.formSubmit} onClick={handleLogin} disabled={loading}>{loading ? '...' : 'Log in'}</button>
                  <button className={styles.formLink} onClick={() => open('reset')}>Forgot password?</button>
                </div>
                <p className={styles.formToggle}>No account? <span onClick={() => open('signup')}>Sign up</span></p>
              </>
            )}

            {showAuth === 'signup' && (
              <>
                <h2 className={styles.modalTitle}>Join Strangr</h2>
                {message ? <p className={styles.formSuccess}>{message}</p> : (
                  <div className={styles.formGroup}>
                    <input className={styles.formInput} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className={styles.formInput} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <input className={styles.formInput} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignup()} />
                    {error && <p className={styles.formError}>{error}</p>}
                    <button className={styles.formSubmit} onClick={handleSignup} disabled={loading}>{loading ? '...' : 'Create account'}</button>
                  </div>
                )}
                <p className={styles.formToggle}>Have an account? <span onClick={() => open('login')}>Log in</span></p>
              </>
            )}

            {showAuth === 'reset' && (
              <>
                <h2 className={styles.modalTitle}>Reset password</h2>
                {message ? <p className={styles.formSuccess}>{message}</p> : (
                  <div className={styles.formGroup}>
                    <input className={styles.formInput} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReset()} />
                    {error && <p className={styles.formError}>{error}</p>}
                    <button className={styles.formSubmit} onClick={handleReset} disabled={loading}>{loading ? '...' : 'Send reset link'}</button>
                  </div>
                )}
                <p className={styles.formToggle}>Back to <span onClick={() => open('login')}>log in</span></p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── LOGGED-IN FEED ──────────────────────────────────────────────────────────
function LoggedInFeed() {
  const { user } = useAuth()
  const router   = useRouter()
  const [posts, setPosts]       = useState([])
  const [mySpaces, setMySpaces] = useState([])
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)

  useEffect(() => {
    loadAll()
  }, [user])

  async function loadAll() {
    setLoading(true)
    const [postsData, spacesData] = await Promise.all([
      fetchFeedPosts({ page: 0, limit: 20 }),
      user ? fetchUserSpaces(user.id) : Promise.resolve([]),
    ])
    setPosts(postsData)
    setMySpaces(spacesData)
    setHasMore(postsData.length === 20)
    setLoading(false)
  }

  async function loadMore() {
    const next = page + 1
    const data = await fetchFeedPosts({ page: next, limit: 20 })
    setPosts((p) => [...p, ...data])
    setHasMore(data.length === 20)
    setPage(next)
  }

  return (
    <AppShell>
      <div className={styles.feedLayout}>
        {/* Main column */}
        <div className={styles.feedMain}>
          {/* Spaces row */}
          <section className={styles.spacesSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Your Spaces</h2>
              <button className={styles.viewAll} onClick={() => router.push('/spaces/create')}>View all</button>
            </div>
            <div className={styles.spacesGrid}>
              {mySpaces.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className={styles.spaceCard}
                  onClick={() => router.push(`/spaces/${s.slug}`)}
                >
                  <div className={styles.spaceCardIcon}>
                    {s.icon_url ? <img src={s.icon_url} alt="" className={styles.spaceCardIconImg} /> : <span>{s.name[0].toUpperCase()}</span>}
                  </div>
                  <span className={styles.spaceCardName}>{s.name}</span>
                </div>
              ))}
              <div className={`${styles.spaceCard} ${styles.spaceCardCreate}`} onClick={() => router.push('/spaces/create')}>
                <div className={styles.spaceCardIconDashed}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span className={styles.spaceCardName}>Create New</span>
              </div>
            </div>
          </section>

          {/* Feed */}
          <section className={styles.feedSection}>
            <h2 className={styles.sectionTitle}>Main Feed</h2>
            {loading ? (
              <div className={styles.feedLoading}>
                {[1,2,3].map((i) => <div key={i} className={styles.postSkeleton} />)}
              </div>
            ) : posts.length === 0 ? (
              <div className={styles.feedEmpty}>
                <p>No posts yet. Join some spaces to see content here.</p>
                <button className={styles.emptyBtn} onClick={() => router.push('/spaces/create')}>Browse Spaces</button>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} size="medium" />
                ))}
                {hasMore && (
                  <button className={styles.loadMore} onClick={loadMore}>Load more</button>
                )}
              </>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <aside className={styles.feedSidebar}>
          {/* Following */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Following</h3>
            <div className={styles.followingList}>
              {mySpaces.slice(0, 3).map((s) => (
                <div key={s.id} className={styles.followingRow} onClick={() => router.push(`/spaces/${s.slug}`)}>
                  <div className={styles.followingAvatar}>
                    {s.icon_url ? <img src={s.icon_url} alt="" className={styles.followingAvatarImg} /> : <span>{s.name[0]}</span>}
                  </div>
                  <div>
                    <p className={styles.followingName}>{s.name}</p>
                    <p className={styles.followingMeta}>{(s.member_count || 0).toLocaleString()} members</p>
                  </div>
                </div>
              ))}
              {mySpaces.length === 0 && (
                <p className={styles.emptyMeta}>Join spaces to follow activity</p>
              )}
            </div>
          </div>

          {/* Trending */}
          <div className={styles.sideCard}>
            <h3 className={styles.sideCardTitle}>Trending</h3>
            {['#art', '#design', '#gaming', '#tech', '#music'].map((tag) => (
              <div key={tag} className={styles.trendingItem}>
                <p className={styles.trendingTag}>{tag}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  )
}

// ── MAIN EXPORT ─────────────────────────────────────────────────────────────
function HomePage() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#000' }}>
      <div style={{ width:24,height:24,border:'2px solid #333',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
    </div>
  )
  return user ? <LoggedInFeed /> : <AnonLanding />
}

export default function Page() {
  return <Suspense fallback={null}><HomePage /></Suspense>
}
