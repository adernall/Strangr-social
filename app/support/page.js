// app/support/page.js
'use client'

import { useState } from 'react'
import styles from './support.module.css'
import AppShell from '@/components/AppShell'

const faqs = [
  { q: 'Do I need an account to chat?', a: 'No. Anonymous chat is completely free and requires no signup. Just click "Start chatting" and you\'re connected instantly.' },
  { q: 'Are anonymous chats saved?', a: 'No. Anonymous chat messages are not stored after either user disconnects or skips. There is no history.' },
  { q: 'How does matching work?', a: 'When you click "Start chatting", you\'re placed in a queue. The first available stranger who is also waiting gets matched with you instantly.' },
  { q: 'Can I get matched with the same person twice?', a: 'It\'s possible but unlikely. Matching is random from whoever is currently in the queue.' },
  { q: 'What can I do with an account?', a: 'With an account you can add friends, send direct messages, create group chats, and have a persistent profile.' },
  { q: 'How do I report someone?', a: 'If someone is being abusive or inappropriate, hit Skip to disconnect immediately. Report functionality is coming soon.' },
  { q: 'Is Strangr free forever?', a: 'Yes. The core features of Strangr are free and will always remain free.' },
  { q: 'How do I delete my account?', a: 'Go to your dashboard settings and select "Delete account". All your data will be permanently removed.' },
]

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)

  function handleContact(e) {
    e.preventDefault()
    // In a real app, you'd send this to an email service
    setSent(true)
  }

  return (
    <div className={styles.page}>
      <AppShell/>
      <main className={styles.main}>

        <section className={styles.hero}>
          <span className={styles.tag}>Support</span>
          <h1 className={styles.headline}>How can we help?</h1>
          <p className={styles.sub}>Find answers below or reach out directly. We respond within 24 hours.</p>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection} id="faq">
          <div className={styles.sectionLabel}>Frequently asked questions</div>
          <div className={styles.faqList}>
            {faqs.map((f, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  className={styles.faqQ}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span>{f.q}</span>
                  <span className={styles.faqIcon}>{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <p className={styles.faqA}>{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        {/* Contact */}
        <section className={styles.contactSection} id="contact">
          <div className={styles.sectionLabel}>Still need help?</div>
          <h2 className={styles.contactTitle}>Send us a message</h2>
          <p className={styles.contactSub}>We read every message and reply personally.</p>

          {sent ? (
            <div className={styles.sentBox}>
              <p>✓ Message sent. We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleContact}>
              <div className={styles.formRow}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Name</label>
                  <input className={styles.input} placeholder="Your name"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email</label>
                  <input className={styles.input} type="email" placeholder="your@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Message</label>
                <textarea className={styles.textarea} rows={5}
                  placeholder="Describe your issue or question…"
                  value={msg} onChange={(e) => setMsg(e.target.value)} required />
              </div>
              <button type="submit" className={styles.submitBtn}>Send message →</button>
            </form>
          )}
        </section>

      </main>
    </div>
  )
}