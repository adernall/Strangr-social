'use client'

import { useAdminGate } from '../../../../lib/useAdminGate'
import AdminShell from '../../../../components/admin/AdminShell'
import styles from './jobs.module.css'

export default function JobsPage() {
  const { admin, checking } = useAdminGate()
  if (checking) return null

  return (
    <AdminShell admin={admin} searchPlaceholder="Search jobs...">
      <div>
        <h1 className={styles.pageTitle}>Jobs</h1>
        <p className={styles.pageSub}>Background tasks, scheduled operations, and queue management.</p>

        <div className={styles.comingSoonCard}>
          <div className={styles.comingSoonIcon}>🚧</div>
          <h2 className={styles.comingSoonTitle}>Jobs System Coming Soon</h2>
          <p className={styles.comingSoonDesc}>
            This section will manage background jobs, scheduled tasks, and queue monitoring.
            The backend infrastructure is not yet ready.
          </p>
          <div className={styles.plannedFeatures}>
            <p className={styles.plannedLabel}>PLANNED FEATURES</p>
            <div className={styles.featureGrid}>
              {[
                'Scheduled decay jobs',
                'Mass notification sender',
                'Analytics snapshot cron',
                'Cleanup tasks',
                'Email queue',
                'Export jobs',
              ].map((f) => (
                <div key={f} className={styles.featureItem}>
                  <span className={styles.featureDot} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
