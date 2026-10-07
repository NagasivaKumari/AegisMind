import { useState } from 'react'
import { Avatar, CatPill, Card, EmptyState, PageHeader, relDay } from '../components/ui.jsx'
import { AlertIcon, MicIcon, SearchIcon, SendIcon, SparkIcon } from '../components/icons.jsx'

function Kpi({ value, label, hint }) {
  return (
    <div className="card card-hover px-5 py-4">
      <div className="num text-[30px] font-bold leading-none tracking-[-0.02em] text-ink">{value}</div>
      <div className="mt-2 text-[13.5px] font-medium text-ink">{label}</div>
      <div className="mt-0.5 text-[12px] text-faint">{hint}</div>
    </div>
  )
}

export default function Overview({ points, kpis, onAsk, onSimulate, notify, setView }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [asking, setAsking] = useState(false)
  const [speech, setSpeech] = useState('Rahul promised he will send the Q3 deck by Friday, but Priya wants to push the launch to next Tuesday.')
  const [simulating, setSimulating] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const conflicts = points.filter((p) => p.category === 'conflict')
  const commitments = points.filter((p) => p.category === 'commitment')
  const pending = commitments.filter((p) => p.status === 'pending')
  const recent = points.slice(0, 6)

  const ask = async () => {
    const q = question.trim()
    if (!q) return notify('Ask a question first')
    setAsking(true)
    try {
      setAnswer(await onAsk(q))
    } catch (e) {
      notify('Ask failed: ' + e.message)
    } finally {
      setAsking(false)
    }
  }

  const simulate = async () => {
    const text = speech.trim()
    if (!text) return notify('Type an utterance first')
    setSimulating(true)
    try {
      await onSimulate(text)
      setSpeech('')
    } catch (e) {
      notify('Ingest failed: ' + e.message)
    } finally {
      setSimulating(false)
    }
  }

  const conflict = conflicts[0]

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <PageHeader title={`${greeting}.`} subtitle="Here's what needs your attention." />

      {/* Ask bar — Attio-style command input */}
      <div className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
              <SparkIcon size={15} />
            </span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Ask AegisMind anything about your memories…"
              className="field h-11 pl-10 text-[14px] shadow-[0_1px_2px_rgba(31,31,28,0.04)]"
            />
          </div>
          <button onClick={ask} disabled={asking} className="btn btn-primary h-11 px-5">
            <SendIcon size={14} />
            {asking ? 'Thinking…' : 'Ask'}
          </button>
        </div>

        {asking && (
          <div className="mt-3 space-y-2 rounded-lg border border-hairline bg-surface p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-hairline" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-hairline" />
          </div>
        )}

        {answer && !asking && (
          <div className="fade-in mt-3 rounded-lg border border-hairline bg-surface p-4 shadow-[0_1px_2px_rgba(31,31,28,0.04)]">
            <div className="mb-2.5 flex items-center gap-2">
              <span className={`pill ${answer.mode === 'live' ? 'pill-accent' : 'pill-neutral'}`}>
                {answer.mode === 'live' ? 'Lyzr Manager' : 'Grounded fallback'}
              </span>
              <span className="text-[11.5px] text-faint">
                {answer.sources?.length || 0} memories · {answer.pending} open commitments
              </span>
            </div>
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{answer.answer}</p>
            {answer.action_items && answer.action_items !== 'none' && (
              <div className="mt-3 rounded-md bg-canvas px-3 py-2 text-[12.5px] text-muted">
                <span className="font-medium text-ink">Action items · </span>
                {answer.action_items}
              </div>
            )}
            {(answer.sources || []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-hairline pt-3">
                {answer.sources.map((s) => (
                  <span key={s.point_id} className="num rounded-md border border-hairline px-1.5 py-0.5 text-[10.5px] text-faint">
                    {s.entity} · {s.category} · {s.score}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi value={kpis.points} label="Memories" hint="indexed for this session" />
        <Kpi value={kpis.pending} label="Commitments" hint={`${commitments.length} total · ${kpis.pending} open`} />
        <Kpi value={conflicts.length} label="Conflicts" hint={conflicts.length ? 'needs a look' : 'nothing overlapping'} />
      </div>

      <div className="mt-8">
        <h2 className="section-title mb-3">Today</h2>
        {conflict ? (
          <div className="card overflow-hidden">
            <div className="flex items-start gap-3 border-b border-hairline px-5 py-4" style={{ background: '#fdf8f0' }}>
              <span className="mt-0.5 text-danger">
                <AlertIcon size={16} />
              </span>
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-ink">Conflict detected</p>
                <p className="mt-0.5 text-[13px] text-muted">{conflict.text}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-faint">
                  <span className="pill pill-danger">{conflict.entity}</span>
                  <span>{relDay(conflict.ts)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-[13px] text-muted">
                AegisMind thinks this overlaps with{' '}
                <span className="font-medium text-ink">{pending.length} open commitment(s)</span>.
              </p>
              <button onClick={() => setView('conflicts')} className="btn btn-quiet h-8 px-3 text-[12.5px]">
                Review conflict →
              </button>
            </div>
          </div>
        ) : (
          <div className="card px-5 py-4 text-[13px] text-muted">
            No conflicts detected. {pending.length ? `${pending.length} open commitment(s) are on track.` : 'Nothing is competing for your time.'}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Recent memory" right={<button onClick={() => setView('memory')} className="text-[12px] font-medium text-accent hover:underline">View all</button>}>
          {recent.length === 0 ? (
            <EmptyState icon={<MicIcon size={16} />} title="No memories yet" hint="Simulate a voice segment and AegisMind will index it." />
          ) : (
            <ul className="divide-y divide-hairline">
              {recent.map((p) => (
                <li key={p.point_id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={p.entity} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">@{p.entity}</span>
                      <CatPill category={p.category} />
                      <span className="text-[11.5px] text-faint">{relDay(p.ts)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-muted">{p.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Simulate ambient speech">
          <div className="p-4">
            <textarea
              rows={5}
              value={speech}
              onChange={(e) => setSpeech(e.target.value)}
              placeholder="Rahul promised he will send the Q3 deck by Friday…"
              className="field"
            />
            <button onClick={simulate} disabled={simulating} className="btn btn-quiet mt-2 w-full">
              <MicIcon size={14} />
              {simulating ? 'Streaming…' : 'Simulate voice segment'}
            </button>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
              Posts to <code className="rounded bg-canvas px-1">/omi/conversation</code> — the same contract a real Omi device uses. Watch it run under{' '}
              <button onClick={() => setView('activity')} className="font-medium text-accent underline-offset-2 hover:underline">
                Activity
              </button>
              .
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
