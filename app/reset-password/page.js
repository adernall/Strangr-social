// app/reset-password/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from './reset.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUpdate() {
    setError('')
    if (password !== confirm) return setError('Passwords do not match.')
    if (password.length < 6) return setError('Minimum 6 characters.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)
    setMessage('Password updated! Redirecting…')
    setTimeout(() => router.push('/'), 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>New password</h1>
        <p className={styles.sub}>Choose a strong password</p>
        {message ? (
          <p className={styles.success}>{message}</p>
        ) : (
          <div className={styles.form}>
            <input className={styles.input} type="password" placeholder="New password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className={styles.input} type="password" placeholder="Confirm password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()} />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.btn} onClick={handleUpdate} disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}