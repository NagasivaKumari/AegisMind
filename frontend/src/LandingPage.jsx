import { Avatar, CatPill, Pill } from './components/ui.jsx'

function LogoMark({ size = 34, dark = false }) {
  return (
    <div
      className="grid place-items-center rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: dark ? '#fff' : '#1f1f1c',
        boxShadow: '0 2px 8px rgba(31,31,28,0.18)',
      }}
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 32 32" fill={dark ? '#1f1f1c' : '#fff'}>
        <path d="M16 4l10 24h-6.4L16 15.8 12.4 28H6z" />
      </svg>
    </div>
  )
}

export function Watch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
    </svg>
  )
}

export function Icon({ kind }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    commitments: <><path d="M4 6h16M4 12h16M4 18h10" /><path d="m16 16 2 2 4-4" /></>,
    conflict: <><path d="M9 3H4v5" /><path d="M21 21h-5" /><path d="m4 20 16-16" /></>,
    shield: <><path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6z" /></>,
    voice: <><path d="M5 10v4M9 6v12M13 4v16M17 8v8M21 10v4" /></>,
    memory: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 4v16" /></>,
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  }
  return <svg {...common}>{paths[kind]}</svg>
}

const NAV = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Stack', href: '#stack' },
  { label: 'Privacy', href: '#privacy' },
]

function Nav({ onGoAuth }) {
  const login = () => onGoAuth('login')
  const signup = () => onGoAuth('signup')
  return (
    <header className="sticky top-0 z-40 border-b border-hairline/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#/" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">AegisMind</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <button onClick={login} className="btn btn-quiet hidden sm:inline-flex">
            Log in
          </button>
          <button onClick={signup} className="btn btn-primary">
            Get started
          </button>
        </div>
      </div>
    </header>
  )
}

function HeroMock() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-t from-[#eef2ff] via-[#f7f7f5] to-transparent blur-none" aria-hidden />
      <div className="card relative overflow-hidden text-left shadow-[0_24px_70px_rgba(31,31,28,0.14)]">
        <div className="flex items-center gap-1.5 border-b border-hairline bg-canvas/70 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#e6e6e1]" />
          <span className="ml-3 hidden rounded-md border border-hairline bg-white px-3 py-1 text-[11px] font-medium text-faint sm:block">
            app.aegismind.ai/overview
          </span>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex gap-2">
            <div className="field h-10 flex-1 cursor-text text-[13px] text-faint">Ask your memory vault anything…</div>
            <button className="btn btn-primary h-10 text-[13px]">Ask</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Memories', '128', 'pill-neutral'],
              ['Commitments', '9 pending', 'pill-warn'],
              ['Conflicts', '2 open', 'pill-danger'],
            ].map(([label, value, tone]) => (
              <div key={label} className="card p-3">
                <p className="section-title">{label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="num text-[20px] font-bold tracking-[-0.02em] text-ink">{value}</span>
                </div>
                <Pill tone={tone}>{tone === 'pill-neutral' ? 'vault' : tone.replace('pill-', '')}</Pill>
              </div>
            ))}
          </div>
          <div className="card flex items-center gap-3 p-3">
            <Avatar name="Rahul" size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">Send Rahul the Q2 pipeline deck by Friday</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-faint">
                <span>commitment · Rahul</span>
              </div>
            </div>
            <CatPill category="commitment" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-[11.5px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success soft-pulse" />
            ACTION_TAKEN · [CommitmentTracker] tracking 'Rahul' as commitment
          </div>
        </div>
      </div>
    </div>
  )
}

function PipelineStrip() {
  const steps = ['Omi · ambient voice', 'fastembed · 384-dim', 'Qdrant · vector vault', 'Lyzr · Manager Agent', 'worker dispatch', 'ACTION_TAKEN']
  return (
    <section className="border-y border-hairline bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-5 py-5 md:justify-between">
        <p className="section-title shrink-0">One voice → a full agentic pipeline</p>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold ${i === steps.length - 1 ? 'border-ink bg-ink text-white' : 'border-hairline bg-surface text-muted'}`}>
                {s}
              </span>
              {i < steps.length - 1 && <span className="text-faint">→</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEPS = [
  { icon: 'voice', title: 'It listens', body: 'Talk naturally. Omi captures ambient conversation and streams it to AegisMind in real time — no app switching, no typing.' },
  { icon: 'memory', title: 'It remembers', body: 'Every signal is embedded and stored in a Qdrant vector vault, scoped to your account and searchable forever.' },
  { icon: 'bolt', title: 'It acts', body: 'A Lyzr Manager Agent classifies each memory, dispatches specialized workers, tracks commitments, and flags conflicts before they slip.' },
]

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="max-w-2xl">
        <p className="section-title">How it works</p>
        <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.03em] text-ink md:text-[40px]">
          Stop prompting. Start delegating.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Isolated prompts hit a ceiling. AegisMind is a connected, autonomous loop: voice in, memory persisted, agents reasoning — around the clock.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card-hover card p-6">
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent/10 text-accent">
                <Icon kind={s.icon} />
              </div>
              <span className="num text-[28px] font-bold tracking-[-0.03em] text-hairline">0{i + 1}</span>
            </div>
            <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-ink">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: 'search', title: 'Ask anything', body: 'Grounded recall in plain language. “What did I promise Rahul last week?” — answered from real memories, never hallucinated.' },
  { icon: 'commitments', title: 'Commitment tracking', body: 'Deadlines and follow-ups are extracted automatically and chased until resolved.' },
  { icon: 'conflict', title: 'Conflict detection', body: 'Catch the clash before the meeting: concurrent promises, postponed action, double-booked intent.' },
  { icon: 'shield', title: 'Privacy-first', body: 'Memories are scoped per account, sessions use HTTP-only HMAC cookies, and Selective Amnesia purges any entity on demand.' },
]

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-hairline bg-white py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-title">Product</p>
          <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.03em] text-ink md:text-[40px]">
            Memory that works like a chief of staff.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Built for the privacy-first knowledge track: every signal captured, classified, and reasoned over — while you stay in control.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-hover card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-canvas text-ink">
                <Icon kind={f.icon} />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.01em] text-ink">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const STACK = [
  { name: 'Omi', role: 'Real-time voice capture' },
  { name: 'Qdrant', role: 'Persistent vector memory' },
  { name: 'Lyzr', role: 'Manager Agent orchestration' },
  { name: 'FastAPI', role: 'Async pipeline · SSE event stream' },
]

function StackSection() {
  return (
    <section id="stack" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <p className="section-title">The agentic production stack</p>
          <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.03em] text-ink md:text-[40px]">
            Deeply integrated. Fully observable.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Every step of the pipeline — ingest, embedding, upsert, agent dispatch, action — streams live into the agent console. You watch the reasoning happen.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['OMI_INGEST', 'EMBEDDING_384D', 'QDRANT_UPSERT', 'LYZR_MANAGER_AGENT', 'WORKER_AGENT_DISPATCH', 'ACTION_TAKEN'].map((s) => (
              <span key={s} className="rounded-md border border-hairline bg-canvas px-2.5 py-1 font-mono text-[11px] font-medium text-muted">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-[9px] bg-ink text-[13px] font-bold text-white">{STACK[0].name[0]}</div>
              <div>
                <p className="text-[14px] font-semibold text-ink">{STACK[0].name}</p>
                <p className="text-[12.5px] text-faint">{STACK[0].role}</p>
              </div>
            </div>
            <div className="mt-4 h-24 overflow-hidden rounded-lg border border-hairline bg-canvas p-3 font-mono text-[11px] leading-relaxed text-muted">
              <span className="text-success">▶</span> OMI_INGEST — “got the transcript from this morning’s sync”<br />
              <span className="text-accent">#</span> EMBEDDING_384D → 384-dim vector ready<br />
              <span className="text-warn">●</span> QDRANT_UPSERT — entity=Rahul, category=commitment
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              ['384', 'dim vector memory'],
              ['3', 'specialized workers'],
              ['100%', 'per-account scoped'],
            ].map(([n, label]) => (
              <div key={label} className="card p-4">
                <p className="num text-[24px] font-bold tracking-[-0.02em] text-ink">{n}</p>
                <p className="mt-1 text-[11.5px] leading-snug text-faint">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Cta({ onGoAuth }) {
  const login = () => onGoAuth('login')
  const signup = () => onGoAuth('signup')
  return (
    <section className="border-t border-hairline bg-ink px-5 py-24 text-center">
      <div className="mx-auto max-w-2xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">Agentic memory runs on AegisMind</p>
        <h2 className="mt-4 text-[32px] font-bold leading-tight tracking-[-0.03em] text-white md:text-[44px]">
          Your chief of staff never needs to sleep.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">
          Ambient listening on day one. Your memory vault, your commitments, your conflicts — handled around the clock.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={signup} className="btn btn-accent h-12 px-6 text-[14px]">
            Start for free
          </button>
          <button onClick={login} className="btn h-12 border border-white/20 px-6 text-[14px] text-white hover:bg-white/10">
            Sign in
          </button>
        </div>
      </div>
    </section>
  )
}

function Footer({ onGoAuth }) {
  const cols = [
    { key: 'product', title: 'Product', links: [['Features', '#features'], ['How it works', '#how'], ['Stack', '#stack'], ['Privacy', '#privacy']] },
    { key: 'stack', title: 'Stack', links: [['Omi', 'https://www.omi.me/'], ['Qdrant', 'https://qdrant.tech/'], ['Lyzr', 'https://www.lyzr.ai/']] },
  ]
  return (
    <footer className="border-t border-hairline bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <a href="#/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[15px] font-bold tracking-[-0.02em] text-ink">AegisMind</span>
          </a>
          <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-faint">
            Autonomous ambient chief of staff. Voice in, memory persisted, agents acting — around the clock.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.key}>
            <p className="section-title">{c.title}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="section-title">You</p>
          <ul className="mt-4 space-y-2.5">
            {[['Log in', 'login'], ['Get started', 'signup']].map(([label, mode]) => (
              <li key={label}>
                <button onClick={() => onGoAuth(mode)} className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
                  {label}
                </button>
              </li>
            ))}
            <li>
              <a href="https://github.com/" className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-[12px] text-faint">
          <span>© 2026 AegisMind. All rights reserved.</span>
          <span>Built for the Dawn of the Autonomous AI Builder · Privacy-First Knowledge Systems · Lyzr × Qdrant × Omi</span>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage({ onGoAuth }) {
  return (
    <div className="fade-in bg-canvas">
      <Nav onGoAuth={onGoAuth} />
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-5 pb-20 pt-20 text-center md:pt-28">
          <span className="pill pill-accent inline-flex">
            <Watch /> Hackathon-ready · Lyzr × Qdrant × Omi
          </span>
          <h1 className="mt-7 text-[40px] font-bold leading-[1.05] tracking-[-0.04em] text-ink md:text-[64px]">
            The AI chief of staff
            <br />
            that never forgets.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-muted md:text-[17px]">
            AegisMind listens through <span className="font-semibold text-ink">Omi</span>, builds a persistent vector memory in{' '}
            <span className="font-semibold text-ink">Qdrant</span>, and reasons over it with a{' '}
            <span className="font-semibold text-ink">Lyzr</span> agent — surfacing commitments, conflicts, and answers before you ask.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => onGoAuth('signup')} className="btn btn-primary h-12 px-6 text-[14px]">
              Start for free
            </button>
            <a href="#how" className="btn btn-quiet h-12 px-6 text-[14px]">
              See how it works
            </a>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-5 pb-24">
          <HeroMock />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(600px_300px_at_50%_0%,rgba(79,70,229,0.08),transparent)]" />
      </section>
      <PipelineStrip />
      <HowItWorks />
      <Features />
      <StackSection />
      <Cta onGoAuth={onGoAuth} />
      <Footer onGoAuth={onGoAuth} />
    </div>
  )
}