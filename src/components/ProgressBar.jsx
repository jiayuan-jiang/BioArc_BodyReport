export default function ProgressBar({ steps, current }) {
  const fillPct = ((current - 1) / (steps.length - 1)) * 100

  return (
    <div className="progress-bar">
      <div className="progress-steps">
        <div className="progress-track">
          <div className="progress-track-fill" style={{ width: `${fillPct}%` }} />
        </div>
        {steps.map(s => {
          const done   = s.id < current
          const active = s.id === current
          return (
            <div key={s.id} className="progress-step">
              <div className={`progress-dot ${done ? 'done' : active ? 'active' : ''}`}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : s.id}
              </div>
              <span className={`progress-label ${done ? 'done' : active ? 'active' : ''}`}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
