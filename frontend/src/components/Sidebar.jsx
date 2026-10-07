import { AlertIcon, CheckCircleIcon, DbIcon, HomeIcon, ActivityIcon, ShieldIcon, SignOutIcon } from './icons.jsx'
import { Avatar } from './ui.jsx'

const GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', label: 'Overview', icon: HomeIcon },
      { id: 'memory', label: 'Memory', icon: DbIcon },
      { id: 'commitments', label: 'Commitments', icon: CheckCircleIcon },
      { id: 'conflicts', label: 'Conflicts', icon: AlertIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'activity', label: 'Activity', icon: ActivityIcon },
      { id: 'privacy', label: 'Privacy', icon: ShieldIcon },
    ],
  },
]

export default function Sidebar({ view, setView, user, onLogout, counts }) {
  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-hairline bg-sidebar md:flex">
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-ink">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="#fff">
            <path d="M16 4l10 24h-6.4L16 15.8 12.4 28H6z" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-ink">AegisMind</div>
          <div className="text-[10.5px] text-faint">Chief of Staff</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 px-2.5">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="section-title px-2.5 pb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconCmp = item.icon
                const badge = counts[item.id]
                return (
                  <button key={item.id} onClick={() => setView(item.id)} className={`nav-item ${view === item.id ? 'active' : ''}`}>
                    <IconCmp size={15} className="shrink-0 opacity-70" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge > 0 && (
                      <span className="num rounded-full bg-hairline px-1.5 py-px text-[10.5px] font-semibold text-muted">{badge}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-hairline px-3 py-3">
        <Avatar name={user.name} size={26} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[12.5px] font-semibold text-ink">{user.name}</div>
          <div className="truncate text-[11px] text-faint" title={user.email}>
            {user.email}
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="rounded-md p-1.5 text-faint transition hover:bg-white hover:text-danger"
        >
          <SignOutIcon size={15} />
        </button>
      </div>
    </aside>
  )
}
