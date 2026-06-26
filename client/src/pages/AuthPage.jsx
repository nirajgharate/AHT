import { Loader2, Sparkles } from 'lucide-react'

export default function AuthPage({
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authError,
  setAuthError,
  handleAuth,
  loading,
}) {
  return (
    <main className="app-shell min-h-screen flex items-center justify-center p-6">
      <div className="workspace-panel w-full max-w-md">
        <div className="panel-header border-b pb-5 text-center">
          <span className="brand-mark mb-3" style={{ display: 'inline-flex', margin: '0 auto' }}>
            <Sparkles className="h-4 w-4" />
          </span>
          <h1 className="text-2xl font-bold tracking-normal mt-2">
            {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="muted-text text-sm mt-1">
            {authMode === 'login'
              ? 'Log in to access your personal summarizer dashboard'
              : 'Sign up to store and query your private summaries'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="you@example.com"
              className="text-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="••••••••"
              className="text-input"
            />
          </div>

          {authError && <p className="error-box mt-2">{authError}</p>}

          <button disabled={loading} className="primary-button mt-4">
            {loading && <Loader2 className="animate-spin" size={18} />}
            {authMode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login')
              setAuthError('')
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            className="nav-link text-accent hover:underline font-semibold"
          >
            {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </button>
        </div>
      </div>
    </main>
  )
}
