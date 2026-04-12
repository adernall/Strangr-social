// app/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import styles from './page.module.css'

const ParticlesBg = dynamic(() => import('../components/ParticlesBg'), {
  ssr: false,
})

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  const [showAuth, setShowAuth] = useState(null) // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setEmail('')
    setPassword('')
    setConfirm('')
    setError('')
    setMessage('')
  }

  function openModal(type) {
    resetForm()
    setShowAuth(type)
  }

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    setShowAuth(null)
    resetForm()
  }

  async function handleSignup() {
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    setMessage('Check your email to confirm your account.')
  }

  async function handleReset() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) return setError(error.message)
    setMessage('Reset link sent — check your email.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <main className={styles.main}>
      <ParticlesBg />
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      {/* Nav */}
      <nav className={styles.nav}>
        <span className={styles.logo}>strangr</span>
        <div className={styles.navLinks}>
          {user ? (
            <>
              <span className={styles.userEmail}>{user.email}</span>
              <button className={styles.navBtn} onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <button className={styles.navBtn} onClick={() => openModal('login')}>
                Log in
              </button>
              <button className={styles.signupBtn} onClick={() => openModal('signup')}>
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <p className={styles.eyebrow}>anonymous · real-time · free</p>
        <h1 className={styles.headline}>
          Talk to a<br />
          <span className={styles.accent}>stranger.</span>
        </h1>
        <p className={styles.sub}>
          No account needed. Just click and connect<br />with someone new, anywhere in the world.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={() => router.push('/chat')}>
            Start chatting →
          </button>
          {!user && (
            <button className={styles.ghostBtn} onClick={() => openModal('signup')}>
              Create account
            </button>
          )}
        </div>
      </section>

      {/* Auth Modal */}
      {showAuth && (
        <div className={styles.overlay} onClick={() => setShowAuth(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setShowAuth(null)}>✕</button>

            {/* LOGIN */}
            {showAuth === 'login' && (
              <>
                <h2 className={styles.modalTitle}>Welcome back</h2>
                <p className={styles.modalSub}>Log in to your account</p>
                <div className={styles.form}>
                  <input className={styles.input} type="email" placeholder="Email"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                  <input className={styles.input} type="password" placeholder="Password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                  {error && <p className={styles.errorMsg}>{error}</p>}
                  <button className={styles.submitBtn} onClick={handleLogin} disabled={loading}>
                    {loading ? 'Logging in…' : 'Log in'}
                  </button>
                  <p className={styles.forgot} onClick={() => openModal('reset')}>
                    Forgot password?
                  </p>
                </div>
                <p className={styles.toggle}>
                  No account?{' '}
                  <span onClick={() => openModal('signup')}>Sign up</span>
                </p>
              </>
            )}

            {/* SIGNUP */}
            {showAuth === 'signup' && (
              <>
                <h2 className={styles.modalTitle}>Join Strangr</h2>
                <p className={styles.modalSub}>Create a free account</p>
                {message ? (
                  <p className={styles.successMsg}>{message}</p>
                ) : (
                  <div className={styles.form}>
                    <input className={styles.input} type="email" placeholder="Email"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                    <input className={styles.input} type="password" placeholder="Password"
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <input className={styles.input} type="password" placeholder="Confirm password"
                      value={confirm} onChange={(e) => setConfirm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSignup()} />
                    {error && <p className={styles.errorMsg}>{error}</p>}
                    <button className={styles.submitBtn} onClick={handleSignup} disabled={loading}>
                      {loading ? 'Creating account…' : 'Create account'}
                    </button>
                  </div>
                )}
                <p className={styles.toggle}>
                  Already have one?{' '}
                  <span onClick={() => openModal('login')}>Log in</span>
                </p>
              </>
            )}

            {/* RESET PASSWORD */}
            {showAuth === 'reset' && (
              <>
                <h2 className={styles.modalTitle}>Reset password</h2>
                <p className={styles.modalSub}>We'll send you a reset link</p>
                {message ? (
                  <p className={styles.successMsg}>{message}</p>
                ) : (
                  <div className={styles.form}>
                    <input className={styles.input} type="email" placeholder="Email"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReset()} />
                    {error && <p className={styles.errorMsg}>{error}</p>}
                    <button className={styles.submitBtn} onClick={handleReset} disabled={loading}>
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                  </div>
                )}
                <p className={styles.toggle}>
                  Back to{' '}
                  <span onClick={() => openModal('login')}>Log in</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}