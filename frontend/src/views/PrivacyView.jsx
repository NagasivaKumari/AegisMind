import { useEffect, useState } from 'react'
import { Card, EmptyState, fmtDateTime, PageHeader } from '../components/ui.jsx'
import { ShieldIcon, TrashIcon } from '../components/icons.jsx'

export default function PrivacyView({ uid, accountId, omiUid, points, events, onForget, onForgetPoint, onLinkOmi, notify }) {
  const [entity, setEntity] = useState('')
  const [omiDraft, setOmiDraft] = useState(omiUid || '')
  const [busy, setBusy] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    setOmiDraft(omiUid || '')
  }, [omiUid])

  const wipes = events.filter((e) => e.stage === 'AMNESIA_PURGE' || (e.stage === 'ACTION_TAKEN' && e.removed !== undefined))

  const wipe = async () => {
    const value = entity.trim()
    if (!value) return notify('Enter an entity name')
    setBusy(true)
    try {
      const data = await onForget(value)
      if (data.removed) setEntity('')
    } catch (e) {
      notify('Wipe failed: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <PageHeader title="Privacy" subtitle="You decide what AegisMind remembers — and what it forgets." />

      <Card title="Link Omi uid" className="mb-4">
        <div className="p-4">
          <p className="text-[13px] leading-relaxed text-muted">
            Omi sends memories with its own <code className="rounded bg-canvas px-1">uid</code>. Paste it here so this account’s vault, Ask, and forget match the device. Account id is <span className="font-mono text-ink">{accountId}</span>.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={omiDraft}
              onChange={(e) => setOmiDraft(e.target.value)}
              placeholder="Omi uid from the webhook query string"
              className="field flex-1"
            />
            <button
              className="btn btn-primary"
              disabled={linking}
              onClick={async () => {
                setLinking(true)
                try {
                  await onLinkOmi(omiDraft.trim())
                } catch (e) {
                  notify('Link failed: ' + e.message)
                } finally {
                  setLinking(false)
                }
              }}
            >
              {linking ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-faint">Active memory scope: {uid}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="What is stored">
          <div className="p-4 text-[13px] leading-relaxed text-muted">
            <ul className="space-y-2.5">
              {[
                'Only text transcripts — never raw audio.',
                'Each memory is scoped to a session uid.',
                'Structured fields: entity, category, status, timestamp.',
                'A 384-dim embedding for semantic recall (BAAI/bge-small-en-v1.5).',
                'No third party sees your memory vault — Qdrant runs with your deployment.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3 border-t border-hairline pt-3 text-[12.5px]">
              <span className="text-faint">
                Stored for <span className="font-semibold text-ink">{uid}</span>:
              </span>
              <span className="num font-medium text-ink">{points.length} memories</span>
            </div>
          </div>
        </Card>

        <Card title="Selective amnesia" right={<span className="pill pill-danger">Destructive</span>}>
          <div className="p-4">
            <p className="text-[13px] leading-relaxed text-muted">
              Permanently remove every vector tied to an entity. The purge is immediate — there is no soft delete and no recovery.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && wipe()}
                placeholder="Entity name (e.g. Rahul)"
                className="field flex-1"
              />
              <button onClick={wipe} disabled={busy} className="btn btn-danger">
                <TrashIcon size={14} />
                {busy ? 'Purging…' : 'Wipe memory'}
              </button>
            </div>
            <p className="mt-2.5 rounded-md bg-canvas px-3 py-2 font-mono text-[11.5px] text-faint">{`delete(where: uid = "${uid}" AND entity = "${entity || '?'}")`}</p>
            {points.length > 0 && (
              <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-[12.5px]">
                {points.slice(0, 12).map((p) => (
                  <li key={p.point_id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-muted">{p.text}</span>
                    <button
                      className="btn btn-quiet px-2 py-1 text-[11px]"
                      onClick={() => onForgetPoint(p.point_id)}
                    >
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Card title={`Recent wipes · ${wipes.length}`}>
          {wipes.length === 0 ? (
            <EmptyState icon={<ShieldIcon size={16} />} title="No wipes yet" hint="Purges you perform will be recorded here for transparency." />
          ) : (
            <ul className="divide-y divide-hairline">
              {wipes.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                  <span className="pill pill-danger">{e.entity || '—'}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{e.message}</span>
                  <span className="num font-mono text-[11.5px] text-faint">{fmtDateTime(e.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
