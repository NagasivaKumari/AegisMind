import { useState } from 'react'
import { login, signup } from './api.js'

function Logo({ size = 40, onBack }) {
  return (
    <a
      href="#/"
      onClick={(e) => {
        e.preventDefault()
        onBack?.()
      }}
      className="grid place-items-center rounded-[12px] bg-ink shadow-[0_2px_8px_rgba(31,31,28,0.18)] transition-transform hover:scale-[1.03]"
      style={{ width: size, height: size }}
      title="Back to home"
    >
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 32 32" fill="#fff">
        <path d="M16 4l10 24h-6.4L16 15.8 12.4 28H6z" />
      </svg>
    </a>
  )
}

function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <input {...props} className="field h-11 text-[14px]" />
      {hint && <span className="mt-1 block text-[11.5px] text-faint">{hint}</span>}
    </label>
  )
}

export default function AuthPage({ onAuth, initialMode = 'login', onBack }) {
  const [mode, setMode] = useState(initialMode === 'signup' ? 'signup' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSignup = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setPassword('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!email.includes('@')) return setError('Enter a valid email address.')
    if (isSignup && name.trim().length < 2) return setError('Tell us your name (2+ characters).')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    setError('')
    try {
      const user = isSignup ? await signup(name, email, password) : await login(email, password)
      onAuth(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="fade-in w-full max-w-[400px]">
          <div className="flex flex-col items-center text-center">
            <Logo onBack={onBack} />
            <h1 className="mt-6 text-[26px] font-bold tracking-[-0.03em] text-ink">
              {isSignup ? 'Create your account' : 'Sign in to AegisMind'}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {isSignup
                ? 'Your autonomous chief of staff, listening from day one.'
                : 'Welcome back. Your memory vault is waiting.'}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8">
            <div className="space-y-4">
              {isSignup && (
                <Field
                  label="Full name"
                  placeholder="Ada Lovelace"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <Field
                label="Work email"
                type="email"
                placeholder="you@company.com"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <label className="block">
                <span className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-ink">Password</span>
                  {!isSignup && (
                    <button type="button" onClick={() => setShow(!show)} className="text-[11.5px] font-medium text-faint hover:text-muted">
                      {show ? 'Hide' : 'Show'}
                    </button>
                  )}
                </span>
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field h-11 text-[14px]"
                />
                <span className="mt-1 block text-[11.5px] text-faint">
                  {isSignup ? 'At least 8 characters.' : 'Forgot it? Password reset — coming soon.'}
                </span>
              </label>
            </div>

            {error && (
              <p className="fade-in mt-4 rounded-md border border-[#f1dbd5] bg-[#f9edea] px-3 py-2 text-[12.5px] font-medium text-[#9c3f30]">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary mt-6 h-11 w-full text-[14px]">
              {busy ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </>
              ) : isSignup ? (
                'Create account'
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-faint">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <p className="text-center text-[13px] text-muted">
            {isSignup ? 'Already have an account?' : 'New to AegisMind?'}{' '}
            <button
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className="font-semibold text-accent hover:underline"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>

      <footer className="px-4 pb-6 text-center text-[11.5px] leading-relaxed text-faint">
        By continuing you agree to the Terms of Service and Privacy Policy.
        <br />
        Sessions are cookie-based · memories scoped per account · powered by MongoDB Atlas + Qdrant
        <br />
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault()
            onBack?.()
          }}
          className="mt-1 inline-block font-medium text-muted hover:text-ink"
        >
          ← Back to home
        </a>
      </footer>
    </div>
  )
}