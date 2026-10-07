import { useMemo, useState } from 'react'
import { Avatar, CatPill, Card, EmptyState, fmtDateTime, PageHeader } from '../components/ui.jsx'
import { DbIcon, SearchIcon } from '../components/icons.jsx'

const CATEGORIES = ['all', 'commitment', 'conflict', 'decision', 'general']
const STATUSES = ['all', 'pending', 'resolved']
const COLS = 'grid grid-cols-[minmax(0,1fr)_110px_110px_88px_128px]'

export default function MemoryView({ points }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = useMemo(
    () =>
      points.filter(
        (p) =>
          (category === 'all' || p.category === category) &&
          (status === 'all' || p.status === status) &&
          (!query || (p.text + ' ' + p.entity).toLowerCase().includes(query.toLowerCase())),
      ),
    [points, query, category, status],
  )

  const record = filtered.find((p) => p.point_id === selected) || null

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <PageHeader
        title="Memory"
        subtitle={`${points.length} vectorized memories · semantic index over 384 dimensions`}
        actions={
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
              <SearchIcon size={14} />
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories…" className="field w-[260px] pl-9" />
          </div>
        }
      />

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-hairline bg-surface px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="section-title mr-0.5">Type</span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-2 py-1 text-[12.5px] font-medium capitalize transition ${
                category === c ? 'bg-ink text-white' : 'text-muted hover:bg-canvas'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-hairline" />
        <div className="flex items-center gap-1.5">
          <span className="section-title mr-0.5">Status</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-2 py-1 text-[12.5px] font-medium capitalize transition ${
                status === s ? 'bg-ink text-white' : 'text-muted hover:bg-canvas'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="num ml-auto text-[12px] text-faint">{filtered.length} shown</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={<DbIcon size={16} />} title="No memories match" hint="Adjust filters or simulate a voice segment from Overview." />
          ) : (
            <>
              <div className={`${COLS} hidden border-b border-hairline bg-canvas px-4 py-2 md:grid`}>
                {['Memory', 'Entity', 'Type', 'Status', 'Captured'].map((h) => (
                  <span key={h} className="section-title">
                    {h}
                  </span>
                ))}
              </div>
              <ul className="divide-y divide-hairline">
                {filtered.map((p) => (
                  <li key={p.point_id}>
                    <button
                      onClick={() => setSelected(p.point_id)}
                      className={`${COLS} w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        selected === p.point_id ? 'bg-accent/5' : 'hover:bg-canvas'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={p.entity} />
                        <span className="truncate text-[13px] text-ink">{p.text}</span>
                      </span>
                      <span className="truncate text-[12.5px] font-medium text-muted">@{p.entity}</span>
                      <span className="hidden md:block">
                        <CatPill category={p.category} />
                      </span>
                      <span className={`pill ${p.status === 'pending' ? 'pill-warn' : 'pill-success'}`}>{p.status}</span>
                      <span className="num hidden text-[11.5px] text-faint md:block">{fmtDateTime(p.ts)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title="Record" className="h-fit xl:sticky xl:top-20">
          {!record ? (
            <EmptyState icon={<SearchIcon size={16} />} title="Select a record" hint="Details, vector ID and metadata appear here." />
          ) : (
            <div className="p-4">
              <div className="flex items-center gap-2.5">
                <Avatar name={record.entity} size={28} />
                <div>
                  <div className="text-[14px] font-semibold text-ink">@{record.entity}</div>
                  <div className="text-[11.5px] text-faint">{record.uid}</div>
                </div>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{record.text}</p>
              <dl className="mt-4 space-y-2.5 text-[12.5px]">
                {[
                  ['Category', record.category],
                  ['Status', record.status],
                  ['Captured', fmtDateTime(record.ts)],
                  ['Dimensions', '384 · cosine'],
                  ['Model', 'bge-small-en-v1.5'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-hairline pb-2 last:border-0">
                    <dt className="text-faint">{k}</dt>
                    <dd className="num truncate font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 break-all rounded-md bg-canvas p-2 font-mono text-[10.5px] leading-relaxed text-faint">{record.point_id}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
