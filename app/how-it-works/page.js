// app/how-it-works/page.js
import AppShell from '@/components/AppShell'
import Navbar from '../../components/Navbar'
import styles from './hiw.module.css'

export const metadata = { title: 'How It Works — Strangr' }

const anonSteps = [
  { n: '01', title: 'Open Strangr', desc: 'No signup, no download, no hassle. Just open the website on any device.' },
  { n: '02', title: 'Click "Start chatting"', desc: 'You\'re instantly placed in a queue. Within seconds, you\'re matched with a stranger.' },
  { n: '03', title: 'Chat freely', desc: 'Talk about anything. No one knows who you are. No logs are saved after the session ends.' },
  { n: '04', title: 'Skip anytime', desc: 'Not feeling the vibe? Hit Skip and you\'re instantly matched with someone new.' },
]

const accountSteps = [
  { n: '01', title: 'Create a free account', desc: 'Sign up with just your email. Takes under 30 seconds.' },
  { n: '02', title: 'Set up your profile', desc: 'Choose a username, add a photo, write a bio. Fully optional.' },
  { n: '03', title: 'Add friends', desc: 'Found someone interesting in anonymous chat? Send them a friend request.' },
  { n: '04', title: 'Message & connect', desc: 'DM your friends, create group chats, and build your own circle.' },
]

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <AppShell />
      <main className={styles.main}>

        <section className={styles.hero}>
          <span className={styles.tag}>How it works</span>
          <h1 className={styles.headline}>Simple by design.<br />Powerful when you want it.</h1>
          <p className={styles.sub}>
            Strangr works in two modes — anonymous for instant chatting,
            or with an account for lasting connections.
          </p>
        </section>

        {/* Anonymous mode */}
        <section className={styles.modeSection}>
          <div className={styles.modeHeader}>
            <div className={styles.modeBadge} data-type="anon">Anonymous mode</div>
            <h2 className={styles.modeTitle}>Zero signup. Instant connection.</h2>
            <p className={styles.modeSub}>For when you just want to talk to someone right now.</p>
          </div>
          <div className={styles.steps}>
            {anonSteps.map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        {/* Account mode */}
        <section className={styles.modeSection}>
          <div className={styles.modeHeader}>
            <div className={styles.modeBadge} data-type="account">Account mode</div>
            <h2 className={styles.modeTitle}>Build real connections.</h2>
            <p className={styles.modeSub}>When a stranger becomes someone worth keeping.</p>
          </div>
          <div className={styles.steps}>
            {accountSteps.map((s) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <div>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        {/* Privacy note */}
        <section className={styles.privacyBox}>
          <h3 className={styles.privacyTitle}>🔒 Your privacy is not negotiable.</h3>
          <p className={styles.privacyText}>
            Anonymous chats are not stored after either user disconnects.
            We don't track IP addresses, we don't record conversations,
            and we never sell your data to third parties. Period.
          </p>
        </section>

      </main>
    </div>
  )
}