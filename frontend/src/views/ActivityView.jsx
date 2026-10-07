import { useEffect, useMemo, useState } from 'react'
import { Card, EmptyState, fmtTime, PageHeader } from '../components/ui.jsx'
import { ActivityIcon, ChevronRightIcon, MicIcon } from '../components/icons.jsx'

const STAGE_LABEL = {
  OMI_INGEST: 'Transcript received',
  EMBEDDING_384D: 'Memory extracted',
  QDRANT_UPSERT: 'Stored in Qdrant',
  QDRANT_RETRIEVAL: 'Qdrant searched',
  LYZR_MANAGER_AGENT: 'Manager routed',
  WORKER_AGENT_DISPATCH: 'Worker dispatched',
  ACTION_TAKEN: 'Decision taken',
  AMNESIA_PURGE: 'Amnesia purge',
  SYSTEM: 'System',
}

const CHAIN = [
  { label: 'Omi', stages: ['OMI_INGEST'] },
  { label: 'Transcript', stages: ['OMI_INGEST'] },
  { label: 'Memory Extraction', stages: ['EMBEDDING_384D'] },
  { label: 'Qdrant Retrieval', stages: ['QDRANT_UPSERT', 'QDRANT_RETRIEVAL'] },
  { label: 'Lyzr Manager', stages: ['LYZR_MANAGER_AGENT'] },
  { label: 'Worker Agents', stages: ['WORKER_AGENT_DISPATCH'] },
  { label: 'Decision', stages: ['ACTION_TAKEN'] },
  { label: 'Notification', stages: ['ACTION_TAKEN', 'AMNESIA_PURGE'] },
]

const HIDE_KEYS = new Set(['id', 'message', 'stage', 'level'])

function Payload({ ev }) {
  const entries = Object.entries(ev).filter(([k]) => !HIDE_KEYS.has(k))
  if (!entries.length) return null
  return (
    <dl className="mt-4 space-y-2 text-[12.5px]">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 border-b border-hairline pb-2 last:border-0">
          <dt className="shrink-0 font-mono text-[11.5px] text-faint">{k}</dt>
          <dd className="break-all text-right text-ink">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function ActivityView({ events }) {
  const visible = useMemo(() => events.filter((e) => e.stage !== 'SYSTEM').slice().reverse(), [events])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!selectedId && visible.length) setSelectedId(visible[0].id)
  }, [visible, selectedId])

  const selected = visible.find((e) => e.id === selectedId) || null
  const seenStages = new Set(events.map((e) => e.stage))
  const runSiblings = selected?.run_id ? visible.filter((e) => e.run_id === selected.run_id) : []

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <PageHeader
        title="Activity"
        subtitle="Every step the agent stack takes, from microphone to memory — inspectable."
        actions={
          <span className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-[12px] text-muted">
            <span className="soft-pulse h-1.5 w-1.5 rounded-full bg-success" />
            Live processing
          </span>
        }
      />

      {/* pipeline chain */}
      <Card title="Live processing pipeline" className="mb-5">
        <div className="scroll-thin flex items-center gap-1 overflow-x-auto px-4 py-3.5">
          {CHAIN.map((step, i) => {
            const seen = step.stages.some((s) => seenStages.has(s))
            return (
              <div key={step.label} className="flex shrink-0 items-center gap-1">
                <span
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition ${
                    seen ? 'border-accent/30 bg-accent/8 text-accent' : 'border-hairline bg-canvas text-faint'
                  }`}
                  title={seen ? 'Stage observed in this session' : 'Stage not reached yet'}
                >
                  {step.label}
                </span>
                {i < CHAIN.length - 1 && <ChevronRightIcon size={13} className="text-hairline" />}
              </div>
            )
          })}
        </div>
      </Card>

      {/* list + detail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card title={`Events · ${visible.length}`} className="max-h-[560px] overflow-hidden">
          <div className="scroll-thin max-h-[500px] overflow-y-auto">
            {visible.length === 0 ? (
              <EmptyState icon={<ActivityIcon size={16} />} title="No activity yet" hint="Simulate a voice segment from Overview to watch the pipeline run." />
            ) : (
              <ul className="divide-y divide-hairline">
                {visible.map((ev) => (
                  <li key={ev.id}>
                    <button
                      onClick={() => setSelectedId(ev.id)}
                      className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition ${
                        selectedId === ev.id ? 'bg-accent/5' : 'hover:bg-canvas'
                      }`}
                    >
                      <span className="num mt-0.5 shrink-0 font-mono text-[11px] text-faint">{fmtTime(ev.ts)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{STAGE_LABEL[ev.stage] || ev.stage}</p>
                        <p className="truncate text-[11.5px] text-faint">{ev.message}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Event details" className="h-fit lg:sticky lg:top-20">
          {!selected ? (
            <EmptyState icon={<MicIcon size={16} />} title="Select an event" hint="Reasoning, payloads and retrieved memories appear here." />
          ) : (
            <div className="fade-in p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill pill-accent`}>{STAGE_LABEL[selected.stage] || selected.stage}</span>
                <span className="num font-mono text-[11.5px] text-faint">{fmtTime(selected.ts)}</span>
                {selected.run_id && (
                  <span className="rounded-md bg-sidebar px-1.5 py-0.5 font-mono text-[10.5px] text-muted" title="Correlation ID for this pipeline run">
                    run {selected.run_id}
                  </span>
                )}
                {selected.worker && <span className="pill pill-neutral">{selected.worker}</span>}
                {selected.mode && <span className="text-[11.5px] text-faint">mode: {selected.mode}</span>}
              </div>

              <p className="mt-3 text-[14px] leading-relaxed text-ink">{selected.message}</p>

              {selected.text && (
                <blockquote className="mt-4 border-l-2 border-hairline pl-3.5 text-[13.5px] italic leading-relaxed text-muted">
                  “{selected.text}”
                </blockquote>
              )}

              {selected.sources?.length > 0 && (
                <div className="mt-4">
                  <h3 className="section-title mb-2">Retrieved memories</h3>
                  <ul className="space-y-1.5">
                    {selected.sources.map((s, i) => (
                      <li key={i} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[12.5px]">
                        <span className="font-semibold text-ink">{s.entity}</span>
                        <span className="text-faint"> · {s.category} · score {s.score}</span>
                        <p className="mt-0.5 text-muted">{s.text}…</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Payload ev={selected} />

              {runSiblings.length > 1 && (
                <div className="mt-5">
                  <h3 className="section-title mb-2">Steps in this run</h3>
                  <ol className="space-y-1">
                    {runSiblings
                      .slice()
                      .reverse()
                      .map((ev) => (
                        <li key={ev.id}>
                          <button
                            onClick={() => setSelectedId(ev.id)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition ${
                              ev.id === selected.id ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas'
                            }`}
                          >
                            <span className="num font-mono text-[10.5px] text-faint">{fmtTime(ev.ts)}</span>
                            <span className="truncate">{STAGE_LABEL[ev.stage] || ev.stage}</span>
                          </button>
                        </li>
                      ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
