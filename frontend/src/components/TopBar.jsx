const NAV_IDS = ['overview', 'memory', 'commitments', 'conflicts', 'activity', 'privacy']

function StatusDot({ label, detail, tone }) {
  const color = tone === 'ok' ? 'bg-success' : tone === 'warn' ? 'bg-warn' : tone === 'bad' ? 'bg-danger' : 'bg-faint'
  return (
    <span title={detail} className="flex items-center gap-1.5 text-[12px] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${color} ${tone === 'ok' ? 'soft-pulse' : ''}`} />
      {label}
    </span>
  )
}

export default function TopBar({ view, setView, status, kpis }) {
  const qOk = status?.qdrant.state === 'online'
  const labels = Object.fromEntries(NAV_IDS.map((id) => [id, id[0].toUpperCase() + id.slice(1)]))

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="text-faint">AegisMind</span>
          <span className="text-hairline">/</span>
          <span className="font-medium text-ink">{labels[view]}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            <StatusDot label="Omi" detail={status?.omi.last_ingest ? `Last ingest ${new Date(status.omi.last_ingest * 1000).toLocaleTimeString()}` : 'Listening for Omi webhooks'} tone="ok" />
            <StatusDot label="Qdrant" detail={status ? `${status.qdrant.mode} · ${status.qdrant.collection}` : 'Connecting…'} tone={status ? (qOk ? 'ok' : 'bad') : 'idle'} />
            <StatusDot label="Lyzr" detail={status?.lyzr.state === 'live' ? `Agent ${status.lyzr.agent_id}` : 'Grounded fallback mode'} tone={status ? (status.lyzr.state === 'live' ? 'ok' : 'warn') : 'idle'} />
          </div>
          <span className="num hidden rounded-md border border-hairline bg-surface px-2 py-1 text-[11.5px] font-medium text-muted lg:inline">
            {kpis.points} memories
          </span>
        </div>
      </div>

      {/* mobile nav */}
      <div className="scroll-thin flex gap-1 overflow-x-auto border-t border-hairline px-3 py-2 md:hidden">
        {NAV_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[12.5px] font-medium ${
              view === id ? 'bg-ink text-white' : 'text-muted hover:bg-sidebar'
            }`}
          >
            {labels[id]}
          </button>
        ))}
      </div>
    </header>
  )
}
