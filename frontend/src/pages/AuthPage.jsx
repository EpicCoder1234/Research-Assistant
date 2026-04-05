import { useState } from 'react'
import { supabase } from '../lib/supabase'

const FEATURES = [
  {
    icon: '💬',
    title: 'Chat with any paper',
    desc: 'Ask questions in plain English and get answers grounded directly in the paper\'s content.',
  },
  {
    icon: '🧠',
    title: 'Two-layer RAG',
    desc: 'Retrieves from the paper and your personal knowledge base simultaneously for richer answers.',
  },
  {
    icon: '💡',
    title: 'Personal knowledge base',
    desc: 'Strong concept explanations are saved automatically. The app gets smarter the more you use it.',
  },
  {
    icon: '⚖️',
    title: 'Cross-paper compare',
    desc: 'Ask questions that span your entire library — compare methods, results, and ideas across papers.',
  },
]

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const switchTab = (t) => {
    setTab(t)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm, then sign in.')
    }

    setLoading(false)
  }

  return (
    <div className="auth-page">
      {/* ── Left: Hero ─────────────────────────────────── */}
      <div className="hero-side">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-brand">
            <div className="hero-brand-icon">🔬</div>
            <span className="hero-brand-name">ResearchAI</span>
          </div>

          <div className="hero-headline">
            <h1>Understand research papers.<br />Deeply, personally.</h1>
            <p>
              Upload any ML or CS paper and have a real conversation with it —
              ask questions, get plain-English explanations, build a knowledge base
              that grows smarter over time.
            </p>
          </div>

          <div className="hero-features">
            {FEATURES.map(f => (
              <div key={f.title} className="hero-feature">
                <div className="hero-feature-icon">{f.icon}</div>
                <div className="hero-feature-text">
                  <div className="hero-feature-title">{f.title}</div>
                  <div className="hero-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hero-badge">
            Built for CS/ML undergrads · Powered by Gemini + ChromaDB
          </div>
        </div>
      </div>

      {/* ── Right: Auth ─────────────────────────────────── */}
      <div className="auth-side">
        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-card-icon">🔬</div>
            <h2>ResearchAI</h2>
            <p>Your personal research paper assistant</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-alert error">{error}</div>}
            {success && <div className="auth-alert success">{success}</div>}

            <div className="auth-field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
              {tab === 'signup' && (
                <span className="auth-field-hint">At least 6 characters</span>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Loading…'
                : tab === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
