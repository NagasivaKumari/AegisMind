import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { askQuestion, fetchLogs, fetchMemory, fetchStatus, forgetEntity, forgetPoint, logout as apiLogout, me, sendConversation, updateProfile } from './api.js'
import AuthPage from './AuthPage.jsx'
import LandingPage from './LandingPage.jsx'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Overview from './views/Overview.jsx'
import MemoryView from './views/MemoryView.jsx'
import CommitmentsView from './views/CommitmentsView.jsx'
import ConflictsView from './views/ConflictsView.jsx'
import ActivityView from './views/ActivityView.jsx'
import PrivacyView from './views/PrivacyView.jsx'

const VIEWS = ['overview', 'memory', 'commitments', 'conflicts', 'activity', 'privacy']

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-ink soft-pulse">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="#fff">
            <path d="M16 4l10 24h-6.4L16 15.8 12.4 28H6z" />
          </svg>
        </div>
        <p className="text-[13px] text-muted">Loading workspace…</p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(undefined) // undefined = session check in flight
  const [authMode, setAuthMode] = useState('landing') // 'landing', 'login', 'signup'

  useEffect(() => {
    let alive = true
    me()
      .then((u) => alive && setUser(u))
      .catch(() => alive && setUser(null))
    return () => {
      alive = false
    }
  }, [])

  if (user === undefined) return <Splash />
  if (user === null) {
    if (authMode === 'landing') {
      return <LandingPage onGoAuth={(mode) => setAuthMode(mode)} />
    }
    return <AuthPage onAuth={setUser} initialMode={authMode} onBack={() => setAuthMode('landing')} />
  }
  return <Shell user={user} onAuth={setUser} />
}

function Shell({ user, onAuth }) {
  const [view, setViewState] = useState(() => {
    const hash = window.location.hash.replace('#/', '')
    return VIEWS.includes(hash) ? hash : 'overview'
  })
  const uid = user.omi_uid || user.id
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState(null)
  const [points, setPoints] = useState([])
  const [toast, setToast] = useState('')
  const seen = useRef(new Set())

  const setView = useCallback((v) => {
    window.location.hash = `#/${v}`
    setViewState(v)
  }, [])

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#/', '')
      if (VIEWS.includes(h)) setViewState(h)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const notify = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }, [])

  const onLogout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      /* cookie already gone */
    }
    onAuth(null)
  }, [onAuth])

  const pushEvents = useCallback((batch) => {
    const fresh = batch.filter((e) => e && !seen.current.has(e.id))
    if (!fresh.length) return
    fresh.forEach((e) => seen.current.add(e.id))
    setEvents((prev) => [...prev, ...fresh].slice(-400))
  }, [])

  const loadMemory = useCallback(async () => {
    try {
      const data = await fetchMemory(uid)
      setPoints(data.points)
    } catch {
      /* backend warming up */
    }
  }, [uid])

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchStatus())
    } catch {
      setStatus(null)
    }
  }, [])

  // SSE stream with polling fallback
  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e) => pushEvents([JSON.parse(e.data)])
    es.onerror = () => {
      es.close()
      const timer = setInterval(async () => {
        try {
          const d = await fetchLogs()
          pushEvents(d.events)
        } catch {
          /* retry */
        }
      }, 2000)
      window.addEventListener('beforeunload', () => clearInterval(timer))
    }
    return () => es.close()
  }, [pushEvents])

  useEffect(() => {
    loadMemory()
    loadStatus()
    const t = setInterval(() => {
      loadStatus()
      loadMemory()
    }, 8000)
    return () => clearInterval(t)
  }, [loadMemory, loadStatus])

  // refresh vault as soon as vectors land or get purged
  useEffect(() => {
    const last = events[events.length - 1]
    if (last && (last.stage === 'QDRANT_UPSERT' || last.stage === 'AMNESIA_PURGE')) loadMemory()
  }, [events, loadMemory])

  const simulateVoice = useCallback(
    async (text) => {
      await sendConversation(uid, text)
      notify('Voice segment accepted — pipeline running')
    },
    [uid, notify],
  )

  const runAsk = useCallback((question) => askQuestion(question, uid), [uid])

  const runForget = useCallback(
    async (entity) => {
      const data = await forgetEntity(uid, entity)
      notify(data.removed ? `Purged ${data.removed} vector(s) for "${entity}"` : `No vectors found for "${entity}"`)
      loadMemory()
      return data
    },
    [uid, notify, loadMemory],
  )

  const runForgetPoint = useCallback(
    async (pointId) => {
      const data = await forgetPoint(uid, pointId)
      notify(data.removed ? 'Memory deleted' : 'Nothing deleted')
      loadMemory()
      return data
    },
    [uid, notify, loadMemory],
  )

  const runLinkOmi = useCallback(
    async (omiUid) => {
      const next = await updateProfile(omiUid)
      onAuth(next)
      notify(omiUid ? `Omi uid linked — vault scoped to ${omiUid}` : 'Omi uid cleared; using account id')
    },
    [onAuth, notify],
  )

  const kpis = useMemo(() => {
    const commitments = points.filter((p) => p.category === 'commitment')
    return {
      points: points.length,
      events: events.length,
      pending: commitments.filter((p) => p.status === 'pending').length,
      conflicts: points.filter((p) => p.category === 'conflict').length,
    }
  }, [points, events])

  const counts = useMemo(
    () => ({
      memory: points.length,
      commitments: kpis.pending,
      conflicts: kpis.conflicts,
    }),
    [points, kpis],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar view={view} setView={setView} user={user} onLogout={onLogout} counts={counts} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar view={view} setView={setView} status={status} kpis={kpis} />

        <main className="scroll-thin flex-1 overflow-y-auto">
          {view === 'overview' && (
            <Overview points={points} kpis={kpis} onAsk={runAsk} onSimulate={simulateVoice} notify={notify} setView={setView} />
          )}
          {view === 'memory' && <MemoryView points={points} />}
          {view === 'commitments' && <CommitmentsView points={points} />}
          {view === 'conflicts' && <ConflictsView points={points} />}
          {view === 'activity' && <ActivityView events={events} />}
          {view === 'privacy' && (
            <PrivacyView
              uid={uid}
              accountId={user.id}
              omiUid={user.omi_uid || ''}
              points={points}
              events={events}
              onForget={runForget}
              onForgetPoint={runForgetPoint}
              onLinkOmi={runLinkOmi}
              notify={notify}
            />
          )}
        </main>
      </div>

      {toast && (
        <div className="fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
