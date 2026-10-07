export const fmtTime = (ts) => new Date(ts * 1000).toLocaleTimeString([], { hour12: false })

export const fmtDateTime = (ts) =>
  new Date(ts * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour12: false, hour: '2-digit', minute: '2-digit' })

export const relDay = (ts) => {
  const d = new Date(ts * 1000)
  const now = new Date()
  const day = (x) => x.toDateString()
  if (day(d) === day(now)) return 'Today'
  const yest = new Date(now.getTime() - 864e5)
  if (day(d) === day(yest)) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const CAT_PILL = {
  commitment: 'pill-warn',
  conflict: 'pill-danger',
  decision: 'pill-accent',
  general: 'pill-neutral',
}

// soft pastel entity avatars, Attio-style
const TONES = [
  { bg: '#ede9fe', fg: '#5b21b6' },
  { bg: '#dbeafe', fg: '#1d4ed8' },
  { bg: '#dcfce7', fg: '#15803d' },
  { bg: '#fef3c7', fg: '#b45309' },
  { bg: '#ffe4e6', fg: '#be123c' },
  { bg: '#ccfbf1', fg: '#0f766e' },
]

export function Avatar({ name = '?', size = 22 }) {
  const s = String(name)
  const hash = [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
  const tone = TONES[hash % TONES.length]
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-[6px] font-semibold"
      style={{ width: size, height: size, background: tone.bg, color: tone.fg, fontSize: size * 0.45 }}
      title={s}
    >
      {s.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function CatPill({ category }) {
  return <span className={`pill ${CAT_PILL[category] || 'pill-neutral'}`}>{category}</span>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Card({ title, children, className = '', right }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="section-title">{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function EmptyState({ icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full border border-hairline bg-canvas text-faint">{icon}</div>
      <p className="mt-3 text-[13.5px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-[320px] text-[12.5px] leading-relaxed text-faint">{hint}</p>}
    </div>
  )
}
