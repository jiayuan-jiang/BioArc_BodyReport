import { useState } from 'react'
import { useOffline } from '../offline/OfflineContext'
import { removeFromQueue } from '../offline/queue'
import { useT } from '../i18n'

function relativeTime(iso, t) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return t('offline_time_now')
  if (mins < 60) return t('offline_time_min').replace('{n}', mins)
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return t('offline_time_hour').replace('{n}', hrs)
  return t('offline_time_day').replace('{n}', Math.round(hrs / 24))
}

export default function OfflineBadge() {
  const { t } = useT()
  const { online, queue, syncing, syncNow, refreshQueue } = useOffline()
  const [open, setOpen] = useState(false)

  const discard = async (id) => {
    if (!window.confirm(t('offline_discard_confirm'))) return
    await removeFromQueue(id)
    await refreshQueue()
  }

  return (
    <div className="offline-badge-wrapper">
      <button
        type="button"
        className={`offline-badge ${online ? 'online' : 'offline'}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="offline-dot" />
        {online ? t('offline_status_online') : t('offline_status_offline')}
        {queue.length > 0 && <span className="offline-badge-count">{queue.length}</span>}
      </button>

      {open && (
        <>
        <div className="offline-panel-backdrop" onClick={() => setOpen(false)} />
        <div className="offline-panel">
          <div className="offline-panel-header">
            <span>{t('offline_panel_title')}</span>
            <button
              type="button"
              className="btn-inline"
              onClick={syncNow}
              disabled={!online || syncing || queue.length === 0}
            >
              {syncing ? t('offline_syncing') : t('offline_sync_now')}
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="offline-panel-empty">{t('offline_panel_empty')}</div>
          ) : (
            <ul className="offline-panel-list">
              {queue.map(entry => (
                <li key={entry.id} className="offline-panel-item">
                  <div className="offline-panel-item-main">
                    <span className="offline-panel-item-title">
                      {entry.form.speciesDisplay || entry.form.speciesSci || t('offline_untitled_record')}
                    </span>
                    <span className="offline-panel-item-sub">
                      {entry.form.collectionDate} · {relativeTime(entry.createdAt, t)}
                    </span>
                    {entry.status === 'error' && (
                      <span className="offline-panel-item-error">{entry.lastError}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="offline-panel-discard"
                    aria-label="Discard"
                    onClick={() => discard(entry.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>
      )}
    </div>
  )
}
