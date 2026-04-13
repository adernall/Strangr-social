// app/about/page.js
import AppShell from '../../components/AppShell'
import styles from './about.module.css'

export const metadata = {
  title: 'About — Strangr',
}

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <AppShell>...</AppShell>
      <main className={styles.main}>

        {/* Hero */}
        <section className={styles.hero}>
          <span className={styles.tag}>About Strangr</span>
          <h1 className={styles.headline}>Built for real conversations<br />with real strangers.</h1>
          <p className={styles.sub}>
            In a world of curated feeds and filtered identities, Strangr gives you something
            rare — an honest, unscripted conversation with someone you've never met.
          </p>
        </section>

        {/* Mission */}
        <section className={styles.section} id="mission">
          <div className={styles.sectionInner}>
            <div className={styles.sectionLabel}>Our Mission</div>
            <h2 className={styles.sectionTitle}>Bring back the magic of meeting someone new.</h2>
            <p className={styles.sectionText}>
              We believe the most interesting conversations happen between strangers.
              Strangr removes every barrier — no profiles to judge, no algorithms to game,
              no follower counts to compare. Just two people and a blank screen.
            </p>
            <p className={styles.sectionText}>
              As you build trust and connections, Strangr gives you the tools to hold onto
              them — optional accounts, messaging, and a community that grows at your pace.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className={styles.valuesSection}>
          <div className={styles.sectionLabel} style={{textAlign:'center', marginBottom:'2.5rem'}}>What we stand for</div>
          <div className={styles.valuesGrid}>
            {[
              { icon: '◎', title: 'Anonymity first', desc: 'You choose how much you share. Start anonymous, reveal yourself only when you want to.' },
              { icon: '⚡', title: 'Zero friction', desc: 'No signup required to chat. Open the app, click a button, meet someone. That\'s it.' },
              { icon: '🔒', title: 'Privacy by design', desc: 'Anonymous chats leave no trace. Your data is yours. We don\'t sell it, ever.' },
              { icon: '🌍', title: 'Open to everyone', desc: 'Strangr is free. Always. Great conversations shouldn\'t cost anything.' },
            ].map((v) => (
              <div key={v.title} className={styles.valueCard}>
                <span className={styles.valueIcon}>{v.icon}</span>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className={styles.section} id="team">
          <div className={styles.sectionInner}>
            <div className={styles.sectionLabel}>The Team</div>
            <h2 className={styles.sectionTitle}>Small team. Big vision.</h2>
            <p className={styles.sectionText}>
              Strangr is built by a small, passionate team that believes in the power of
              human connection. We're developers, designers, and conversation enthusiasts
              who got tired of social media feeling transactional.
            </p>
            <p className={styles.sectionText}>
              We're independent, self-funded, and obsessed with building something people
              actually love using.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className={styles.statsSection}>
          {[
            { num: '100%', label: 'Free to use' },
            { num: '0', label: 'Ads ever' },
            { num: '∞', label: 'Strangers waiting' },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </section>

      </main>
    </div>
  )
}