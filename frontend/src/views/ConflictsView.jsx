import { AlertIcon } from '../components/icons.jsx'
import { Card, EmptyState, fmtDateTime, PageHeader, relDay } from '../components/ui.jsx'

export default function ConflictsView({ points }) {
  const conflicts = points.filter((p) => p.category === 'conflict')
  const commitments = points.filter((p) => p.category === 'commitment' && p.status === 'pending')

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <PageHeader title="Conflicts" subtitle="Overlapping commitments and disagreements detected in conversation." />

      {conflicts.length === 0 ? (
        <Card>
          <EmptyState icon={<AlertIcon size={16} />} title="No conflicts detected" hint="When two commitments compete for the same time, AegisMind flags them here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {conflicts.map((c) => {
            const related = commitments.filter((p) => p.entity === c.entity)
            return (
              <article key={c.point_id} className="card overflow-hidden">
                <div className="flex items-start gap-3 border-l-2 border-danger px-5 py-4">
                  <span className="mt-0.5 text-danger">
                    <AlertIcon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="pill pill-danger">{c.entity}</span>
                      <span className="text-[11.5px] text-faint">
                        {relDay(c.ts)} · {fmtDateTime(c.ts)}
                      </span>
                    </div>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{c.text}</p>
                    {related.length > 0 && (
                      <p className="mt-2.5 text-[12.5px] text-muted">
                        {related.length} open commitment(s) for <span className="font-medium text-ink">@{c.entity}</span> may overlap with this.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
