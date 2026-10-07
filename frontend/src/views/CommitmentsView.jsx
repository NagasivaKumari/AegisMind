import { Avatar } from '../components/ui.jsx'
import { CheckCircleIcon } from '../components/icons.jsx'
import { Card, EmptyState, fmtDateTime, PageHeader, relDay } from '../components/ui.jsx'

function Row({ point, open }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3 transition hover:bg-canvas">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${open ? 'bg-warn' : 'bg-success'}`} />
      <Avatar name={point.entity} size={22} />
      <div className="min-w-0 flex-1">
        <p className={`text-[13.5px] leading-snug ${open ? 'text-ink' : 'text-muted line-through decoration-hairline'}`}>{point.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-faint">
          <span className="rounded-md bg-sidebar px-1.5 py-0.5 font-semibold text-muted">@{point.entity}</span>
          <span>{relDay(point.ts)}</span>
          <span className="num font-mono">{fmtDateTime(point.ts)}</span>
        </div>
      </div>
      <span className={`pill mt-0.5 ${open ? 'pill-warn' : 'pill-success'}`}>{open ? 'open' : 'kept'}</span>
    </li>
  )
}

export default function CommitmentsView({ points }) {
  const commitments = points.filter((p) => p.category === 'commitment')
  const open = commitments.filter((p) => p.status === 'pending')
  const done = commitments.filter((p) => p.status !== 'pending')

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
      <PageHeader
        title="Commitments"
        subtitle="Promises and deadlines AegisMind caught in ambient conversation."
      />

      <div className="space-y-5">
        <Card title={`Open · ${open.length}`}>
          {open.length === 0 ? (
            <EmptyState icon={<CheckCircleIcon size={16} />} title="Nothing open" hint="Commitments you make in conversation will appear here." />
          ) : (
            <ul className="divide-y divide-hairline">{open.map((p) => <Row key={p.point_id} point={p} open />)}</ul>
          )}
        </Card>

        {done.length > 0 && (
          <Card title={`Resolved · ${done.length}`}>
            <ul className="divide-y divide-hairline">{done.map((p) => <Row key={p.point_id} point={p} />)}</ul>
          </Card>
        )}
      </div>
    </div>
  )
}
