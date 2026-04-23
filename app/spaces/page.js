'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import AppShell from '../../components/AppShell'
import styles from './spaces.module.css'

const CATEGORIES = ['All Spaces', 'Art', 'Tech', 'Gaming', 'Music', 'Design', 'Science']

export default function SpacesPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [spaces, setSpaces]       = useState([])
  const [mySpaces, setMySpaces]   = useState([])
  const [recent, setRecent]       = useState([])
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('All Spaces')
  const [view, setView]           = useState('discover') // 'discover' | 'mine'
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadAll() }, [user])

  async function loadAll() {
    setLoading(true)
    const [{ data: allData }, { data: recentData }] = await Promise.all([
      supabase.from('spaces').select('id, name, slug, icon_url, banner_url, description, member_count, post_count, tags, is_private, created_at').order('member_count', { ascending: false }).limit(30),
      supabase.from('spaces').select('id, name, slug, icon_url, member_count, post_count').order('created_at', { ascending: false }).limit(6),
    ])
    setSpaces(allData || [])
    setRecent(recentData || [])

    if (user) {
      const { data: mem } = await supabase.from('space_members')
        .select('space:space_id(id, name, slug, icon_url, member_count, post_count)')
        .eq('user_id', user.id)
      setMySpaces((mem || []).map(m => m.space).filter(Boolean))
    }
    setLoading(false)
  }

  const filtered = spaces.filter((s) => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All Spaces' || s.tags?.some(t => t.toLowerCase() === category.toLowerCase())
    return matchSearch && matchCat
  })

  const shownSpaces = view === 'mine' ? mySpaces : filtered

  const featured = filtered[0]
  const rest     = filtered.slice(1, 4)

  return (
    <AppShell>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Discover Spaces</h1>
            <p className={styles.sub}>Curated environments for focused creative collaboration.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={`${styles.viewBtn} ${view === 'mine' ? styles.viewBtnActive : ''}`} onClick={() => setView('mine')}>MY SPACES</button>
            <button className={styles.createBtn} onClick={() => router.push('/spaces/create')}>CREATE NEW</button>
          </div>
        </div>

        {/* Search + categories */}
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className={styles.searchInput}
              placeholder="Search spaces..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setView('discover') }}
            />
          </div>
        </div>

        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.catBtn} ${category === cat && view === 'discover' ? styles.catActive : ''}`}
              onClick={() => { setCategory(cat); setView('discover') }}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* My spaces view */}
        {view === 'mine' && (
          <div className={styles.mySpacesGrid}>
            {mySpaces.length === 0 ? (
              <div className={styles.empty}>
                <p>You haven't joined any spaces yet.</p>
                <button className={styles.joinBtn} onClick={() => setView('discover')}>Discover Spaces</button>
              </div>
            ) : mySpaces.map((s) => (
              <SpaceCard key={s.id} space={s} router={router} />
            ))}
          </div>
        )}

        {/* Discover view */}
        {view === 'discover' && (
          <>
            {loading ? (
              <div className={styles.loading}>{[1,2,3,4].map(i=><div key={i} className={styles.skeleton}/>)}</div>
            ) : (
              <>
                {/* Hero bento grid */}
                {!search && filtered.length > 0 && (
                  <div className={styles.heroGrid}>
                    {featured && (
                      <div
                        className={styles.featuredCard}
                        style={featured.banner_url ? { backgroundImage: `url(${featured.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                        onClick={() => router.push(`/spaces/${featured.slug}`)}
                      >
                        <div className={styles.featuredOverlay}>
                          <span className={styles.featuredBadge}>FEATURED · {(featured.member_count||0).toLocaleString()} MEMBERS</span>
                          <h2 className={styles.featuredName}>{featured.name}</h2>
                          <p className={styles.featuredDesc}>{featured.description}</p>
                          <button className={styles.joinSpaceBtn}>JOIN SPACE</button>
                        </div>
                      </div>
                    )}
                    <div className={styles.sideCards}>
                      {rest.map((s) => <SideCard key={s.id} space={s} router={router} />)}
                    </div>
                  </div>
                )}

                {/* All spaces list */}
                <div className={styles.allSpacesList}>
                  <h3 className={styles.sectionTitle}>Recent Activity</h3>
                  {shownSpaces.slice(search ? 0 : 4).map((s) => (
                    <SpaceActivityRow key={s.id} space={s} router={router} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function SpaceCard({ space, router }) {
  return (
    <div className={styles.spaceCard} onClick={() => router.push(`/spaces/${space.slug}`)}>
      <div className={styles.spaceCardIcon}>
        {space.icon_url ? <img src={space.icon_url} alt="" className={styles.spaceCardIconImg} /> : <span>{space.name[0].toUpperCase()}</span>}
      </div>
      <div>
        <p className={styles.spaceCardName}>{space.name}</p>
        <p className={styles.spaceCardMeta}>{(space.member_count||0).toLocaleString()} members</p>
      </div>
    </div>
  )
}

function SideCard({ space, router }) {
  return (
    <div className={styles.sideCard} onClick={() => router.push(`/spaces/${space.slug}`)}>
      <div className={styles.sideCardTop}>
        <div className={styles.sideCardIcon}>
          {space.icon_url ? <img src={space.icon_url} alt="" className={styles.sideCardIconImg} /> : <span>{space.name[0].toUpperCase()}</span>}
        </div>
        <span className={styles.sideCardPublic}>{space.is_private ? 'PRIVATE' : 'PUBLIC'}</span>
      </div>
      <h3 className={styles.sideCardName}>{space.name}</h3>
      <p className={styles.sideCardDesc}>{space.description}</p>
      <div className={styles.sideCardFooter}>
        <span className={styles.sideCardMembers}>{(space.member_count||0).toLocaleString()} MEMBERS</span>
        <button className={styles.viewBtn2}>VIEW →</button>
      </div>
    </div>
  )
}

function SpaceActivityRow({ space, router }) {
  return (
    <div className={styles.activityRow} onClick={() => router.push(`/spaces/${space.slug}`)}>
      <div className={styles.activityIcon}>
        {space.icon_url ? <img src={space.icon_url} alt="" className={styles.activityIconImg} /> : <span>{space.name[0].toUpperCase()}</span>}
      </div>
      <div className={styles.activityInfo}>
        <p className={styles.activityName}>{space.name}</p>
        <p className={styles.activityMeta}>{(space.member_count||0).toLocaleString()} members · {space.post_count||0} posts</p>
      </div>
      <button className={styles.joinSmallBtn} onClick={(e) => { e.stopPropagation(); router.push(`/spaces/${space.slug}`) }}>JOIN</button>
    </div>
  )
}
