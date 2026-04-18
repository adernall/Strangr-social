// lib/useAdminGate.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'

export function useAdminGate() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    check()
  }, [])

  async function check() {
    setChecking(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      router.replace('/')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      router.replace('/')
      return
    }

    setAdmin(profile)
    setChecking(false)
  }

  return { admin, checking }
}
