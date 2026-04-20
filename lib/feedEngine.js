// lib/feedEngine.js
// Feed scoring, fetching, and space helpers.

import { supabase } from './supabase'

// ─── FEED SCORE (client-side for display sorting) ────────────────────────────
export function calcFeedScore(post) {
  const likes    = post.likes_count || 0
  const comments = post.comments_count || 0
  const hoursAgo = (Date.now() - new Date(post.created_at)) / 3600000

  const engagement  = likes * 1 + comments * 2
  const recency     = 1 / (hoursAgo + 1)
  const randomBoost = Math.random() * 0.1
  const newBoost    = hoursAgo < 0.5 ? 10 : 0

  let score = engagement * 0.6 + recency * 0.3 + randomBoost + newBoost

  // Penalise low-quality old posts
  if (likes < 2 && hoursAgo > 2) score *= 0.3

  return score
}

// ─── FETCH FEED POSTS ─────────────────────────────────────────────────────────
export async function fetchFeedPosts({ page = 0, limit = 20, tagFilter = null } = {}) {
  let query = supabase
    .from('posts')
    .select(`
      id, content, image_url, tags, likes_count, comments_count,
      feed_score, created_at,
      user:user_id (id, username, avatar_url),
      space:space_id (id, name, slug, icon_url)
    `)
    .order('feed_score', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (tagFilter) {
    query = query.contains('tags', [tagFilter])
  }

  const { data, error } = await query
  if (error) { console.error('fetchFeedPosts:', error); return [] }
  return data || []
}

// ─── FETCH SPACE POSTS ────────────────────────────────────────────────────────
export async function fetchSpacePosts(spaceId, { page = 0, limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, content, image_url, tags, likes_count, comments_count,
      feed_score, created_at,
      user:user_id (id, username, avatar_url),
      space:space_id (id, name, slug, icon_url)
    `)
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (error) { console.error('fetchSpacePosts:', error); return [] }
  return data || []
}

// ─── FETCH SINGLE POST ────────────────────────────────────────────────────────
export async function fetchPost(postId) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, content, image_url, tags, likes_count, comments_count,
      feed_score, created_at,
      user:user_id (id, username, avatar_url),
      space:space_id (id, name, slug, icon_url)
    `)
    .eq('id', postId)
    .single()

  if (error) return null
  return data
}

// ─── FETCH COMMENTS ───────────────────────────────────────────────────────────
export async function fetchComments(postId) {
  const { data } = await supabase
    .from('post_comments')
    .select('id, content, created_at, user:user_id(id, username, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  return data || []
}

// ─── LIKE / UNLIKE ────────────────────────────────────────────────────────────
export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabase.from('post_likes').delete().eq('id', existing.id)
    return false // unliked
  } else {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
    return true // liked
  }
}

export async function checkLiked(postId, userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()
  return !!data
}

// ─── SPACES ───────────────────────────────────────────────────────────────────
export async function fetchSpace(slugOrId) {
  const isUuid = /^[0-9a-f-]{36}$/.test(slugOrId)
  const field  = isUuid ? 'id' : 'slug'

  const { data } = await supabase
    .from('spaces')
    .select('*, creator:creator_id(id, username, avatar_url)')
    .eq(field, slugOrId)
    .single()
  return data
}

export async function fetchUserSpaces(userId) {
  const { data } = await supabase
    .from('space_members')
    .select('space:space_id(id, name, slug, icon_url, member_count, post_count)')
    .eq('user_id', userId)
  return (data || []).map((d) => d.space)
}

export async function fetchSpaceMembers(spaceId) {
  const { data } = await supabase
    .from('space_members')
    .select('role, joined_at, user:user_id(id, username, avatar_url)')
    .eq('space_id', spaceId)
    .order('joined_at', { ascending: true })
  return data || []
}

export async function getMemberRole(spaceId, userId) {
  if (!userId) return null
  const { data } = await supabase
    .from('space_members')
    .select('role')
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .single()
  return data?.role || null
}

export async function joinSpace(spaceId, userId) {
  const { error } = await supabase.from('space_members').insert({
    space_id: spaceId,
    user_id: userId,
    role: 'member',
  })
  return !error
}

export async function leaveSpace(spaceId, userId) {
  await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', userId)
}

// ─── SLUG HELPER ──────────────────────────────────────────────────────────────
export function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// ─── FORMAT TIME ──────────────────────────────────────────────────────────────
export function formatPostTime(ts) {
  const diff = Date.now() - new Date(ts)
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
  return new Date(ts).toLocaleDateString()
}
