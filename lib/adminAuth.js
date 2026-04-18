// lib/adminAuth.js
// Server-side admin verification.
// Import this in any admin API route or server component.

import { supabase } from './supabase'

export async function verifyAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { ok: false, reason: 'not_authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { ok: false, reason: 'not_admin' }
  }

  return { ok: true, admin: profile }
}

// Log every admin action
export async function logAction({ adminId, targetUserId, action, reason = '', meta = {} }) {
  await supabase.from('moderation_logs').insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    reason,
    meta,
  })
}

// Send a system message to a user
export async function sendSystemMessage({ adminId, recipientId, type, subject, content }) {
  await supabase.from('system_messages').insert({
    recipient_id: recipientId,
    sent_by: adminId,
    type,
    subject,
    content,
  })
}
