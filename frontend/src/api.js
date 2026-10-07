async function request(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`)
  return data
}

export const get = (url) => request(url)

export const post = (url, body) =>
  request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const sendConversation = (uid, text) => {
  const segments = text
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .map((t) => ({ text: t }))
  return post(`/omi/conversation?uid=${encodeURIComponent(uid)}`, {
    transcript_segments: segments,
    structured: { overview: text.slice(0, 140) },
  })
}

export const sendRealtime = (uid, text) =>
  post(`/omi/realtime?uid=${encodeURIComponent(uid)}`, {
    segments: text.split(/(?<=[.!?])\s+/).filter(Boolean).map((t) => ({ text: t })),
  })

export const askQuestion = (question, uid) => post('/ask', { question, uid })

export const forgetEntity = (uid, entity) => post('/api/forget', { uid, entity })

export const forgetPoint = (uid, point_id) => post('/api/forget', { uid, point_id })

export const updateProfile = (omi_uid) =>
  request('/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ omi_uid }),
  })

export const fetchMemory = (uid) => get(`/api/memory?uid=${encodeURIComponent(uid)}`)

export const fetchStatus = () => get('/api/status')

export const fetchLogs = (limit = 200) => get(`/api/logs?limit=${limit}`)

// ---------------------------------------------------------------- auth
export const me = () => get('/auth/me')
export const login = (email, password) => post('/auth/login', { email, password })
export const signup = (name, email, password) => post('/auth/signup', { name, email, password })
export const logout = () => post('/auth/logout', {})
