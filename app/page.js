// app/page.js
// REPLACE your existing app/page.js with this.
// For logged-in users, the hero section is replaced with the Trace rank display.

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useTraceContext } from '../components/TraceProvider'
import TopBar from '../components/TopBar'
import AppShell from '../components/AppShell'
import RankCard from '../components/rank/RankCard'
import styles from './page.module.css'

const ParticlesBg = dynamic(() => import('../components/ParticlesBg'), { ssr: false })

function HomePageInner() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { rank, nextRank, trace, progress, traceToNext, rankUpEvent } = useTraceContext()

  const [showAuth, setShowAuth] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [recentMessages, setRecentMessages] = useState([])

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login') setShowAuth('login')
    if (auth === 'signup') setShowAuth('signup')
  }, [searchParams])

  useEffect(() => {
    if (user) fetchRecentMessages()
  }, [user])

  async function fetchRecentMessages() {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, last_message, last_message_at, participant_1, participant_2,
        p1:profiles!conversations_participant_1_fkey(id, username, avatar_url),
        p2:profiles!conversations_participant_2_fkey(id, username, avatar_url)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .limit(5)
    setRecentMessages(data || [])
  }

  function getOtherProfile(conv) {
    return conv.participant_1 === user.id ? conv.p2 : conv.p1
  }

  function formatTime(ts) {
    const diff = Date.now() - new Date(ts)
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString()
  }

  function resetForm() { setEmail(''); setPassword(''); setConfirm(''); setError(''); setMessage('') }
  function openModal(type) { resetForm(); setShowAuth(type) }

  async function handleLogin() {
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
    setShowAuth(null); resetForm()
    router.push(profile ? '/' : '/setup-profile')
  }

  async function handleSignup() {
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    setMessage('Check your email to confirm your account, then log in.')
  }

  async function handleReset() {
    setError(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) return setError(error.message)
    setMessage('Reset link sent — check your email.')
  }

  // ── ANONYMOUS STATE ──
  if (!user && !authLoading) {
    return (
      <div className={styles.anonPage}>
        <ParticlesBg />
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        <header className={styles.anonTopbar}>
          <span className={styles.anonLogo}>Strangr</span>
          <div className={styles.anonTopRight}>
            <button className={styles.anonIconBtn} onClick={() => router.push('/search')}><SearchIcon /></button>
            <button className={styles.anonIconBtn} onClick={() => openModal('login')}><ChevronDownIcon /></button>
          </div>
        </header>

        <div className={styles.anonCenter}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}>ANONYMOUS · REAL-TIME · FREE</p>
            <h1 className={styles.headline}>Talk to a<br /><span className={styles.accent}>stranger.</span></h1>
            <p className={styles.sub}>No account needed. Just click and connect<br />with someone new, anywhere in the world.</p>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={() => router.push('/chat')}>Start chatting →</button>
              <button className={styles.loginBtn} onClick={() => openModal('login')}>LOGIN</button>
            </div>
          </div>
        </div>

        {/* Auth modal */}
        {showAuth && (
          <div className={styles.overlay} onClick={() => { setShowAuth(null); router.replace('/') }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.close} onClick={() => { setShowAuth(null); router.replace('/') }}>✕</button>

              {showAuth === 'login' && (
                <>
                  <h2 className={styles.modalTitle}>Welcome back</h2>
                  <p className={styles.modalSub}>Log in to your account</p>
                  <div className={styles.form}>
                    <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                    {error && <p className={styles.errorMsg}>{error}</p>}
                    <button className={styles.submitBtn} onClick={handleLogin} disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
                    <p className={styles.forgot} onClick={() => openModal('reset')}>Forgot password?</p>
                  </div>
                  <p className={styles.toggle}>No account? <span onClick={() => openModal('signup')}>Sign up</span></p>
                </>
              )}

              {showAuth === 'signup' && (
                <>
                  <h2 className={styles.modalTitle}>Join Strangr</h2>
                  <p className={styles.modalSub}>Create a free account</p>
                  {message ? <p className={styles.successMsg}>{message}</p> : (
                    <div className={styles.form}>
                      <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      <input className={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <input className={styles.input} type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignup()} />
                      {error && <p className={styles.errorMsg}>{error}</p>}
                      <button className={styles.submitBtn} onClick={handleSignup} disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
                    </div>
                  )}
                  <p className={styles.toggle}>Already have one? <span onClick={() => openModal('login')}>Log in</span></p>
                </>
              )}

              {showAuth === 'reset' && (
                <>
                  <h2 className={styles.modalTitle}>Reset password</h2>
                  <p className={styles.modalSub}>We'll send you a reset link</p>
                  {message ? <p className={styles.successMsg}>{message}</p> : (
                    <div className={styles.form}>
                      <input className={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReset()} />
                      {error && <p className={styles.errorMsg}>{error}</p>}
                      <button className={styles.submitBtn} onClick={handleReset} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
                    </div>
                  )}
                  <p className={styles.toggle}>Back to <span onClick={() => openModal('login')}>Log in</span></p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── LOGGED IN STATE ──
  return (
    <AppShell noPadding>
      <div className={styles.loggedPage}>
        <ParticlesBg />
        <div className={styles.blob1} />
        <div className={styles.blob2} />

        {/* Left: Trace rank hero (replaces the old headline) */}
        <div className={styles.loggedLeft}>
          {rank ? (
            <RankCard
              rank={rank}
              nextRank={nextRank}
              trace={trace}
              progress={progress}
              traceToNext={traceToNext}
              size="hero"
              animated
              showLevelUp={!!rankUpEvent}
              onBadgeClick={() => router.push('/rank')}
            />
          ) : (
            <div className={styles.rankLoading} />
          )}

          {/* Start chatting button still available */}
          <div className={styles.loggedActions}>
            <button className={styles.primaryBtn} onClick={() => router.push('/chat')}>
              Start chatting →
            </button>
          </div>
        </div>

        {/* Right: recent messages */}
        <div className={styles.loggedRight}>
          {recentMessages.length > 0 && (
            <>
              <h2 className={styles.msgPanelTitle}>
                {recentMessages.length} message{recentMessages.length !== 1 ? 's' : ''} received
              </h2>
              <div className={styles.msgPanelDivider} />
              <div className={styles.msgList}>
                {recentMessages.map((conv) => {
                  const other = getOtherProfile(conv)
                  if (!other) return null
                  return (
                    <div key={conv.id} className={styles.msgCard} onClick={() => router.push(`/inbox/${conv.id}`)}>
                      <div className={styles.msgAvatar}>
                        {other.avatar_url ? <img src={other.avatar_url} alt="" className={styles.msgAvatarImg} /> : <span>{other.username[0].toUpperCase()}</span>}
                      </div>
                      <div className={styles.msgInfo}>
                        <p className={styles.msgUsername}>@{other.username}</p>
                        <p className={styles.msgPreview}>{conv.last_message || 'No messages yet'}</p>
                      </div>
                      <span className={styles.msgTime}>{formatTime(conv.last_message_at)}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default function HomePage() {
  return <Suspense fallback={null}><HomePageInner /></Suspense>
}

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

function ChevronDownIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
}
