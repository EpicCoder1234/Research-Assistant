import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import PaperSidebar from './components/PaperSidebar'
import ChatPanel from './components/ChatPanel'
import RightPanel from './components/RightPanel'
import AuthPage from './pages/AuthPage'
import './App.css'

const API = 'http://localhost:8000'

export default function App() {
  // ── Auth state ─────────────────────────────────────────
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── App state ──────────────────────────────────────────
  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [messages, setMessages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Session management ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        // Clear everything on logout
        setPapers([])
        setSelectedPaper(null)
        setMessages([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Authenticated fetch helper ─────────────────────────
  const authFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${session?.access_token}`,
      },
    })

  // ── Fetch papers when session is ready ────────────────
  useEffect(() => {
    if (session) fetchPapers()
  }, [session])

  const fetchPapers = async () => {
    const res = await authFetch(`${API}/papers`)
    const data = await res.json()
    setPapers(data)
  }

  // ── Paper actions ──────────────────────────────────────
  const handleSelectPaper = async (paper) => {
    setSelectedPaper(paper)
    setMessages([])
    setLoadingHistory(true)

    const res = await authFetch(`${API}/papers/${paper.id}/messages`)
    const history = await res.json()
    setMessages(history)
    setLoadingHistory(false)
  }

  const handleUpload = async (file) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await authFetch(`${API}/papers/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }
      const data = await res.json()

      if (data.paper_id) {
        setPapers(prev => [...prev, {
          id: data.paper_id,
          title: file.name.replace('.pdf', ''),
          upload_date: new Date().toISOString(),
        }])
      }
    } catch (err) {
      console.error('Upload failed:', err.message)
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (paperId) => {
    await authFetch(`${API}/papers/${paperId}`, { method: 'DELETE' })
    setPapers(prev => prev.filter(p => p.id !== paperId))
    if (selectedPaper?.id === paperId) {
      setSelectedPaper(null)
      setMessages([])
    }
  }

  // ── Chat ───────────────────────────────────────────────
  const handleSend = async (question) => {
    setMessages(prev => [...prev, { role: 'user', content: question }])

    // persist user message (fire-and-forget)
    authFetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper_id: selectedPaper.id, role: 'user', content: question }),
    })

    const res = await authFetch(`${API}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paper_id: selectedPaper.id,
        question,
        history: messages.map(m => ({ role: m.role, parts: [m.content] })),
      }),
    })
    const data = await res.json()
    const aiMsg = { role: 'model', content: data.answer }
    setMessages(prev => [...prev, aiMsg])

    // persist AI response (fire-and-forget)
    authFetch(`${API}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paper_id: selectedPaper.id, role: 'model', content: data.answer }),
    })
  }

  // ── Auth actions ───────────────────────────────────────
  const handleLogout = () => supabase.auth.signOut()

  // ── Render ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    )
  }

  if (!session) return <AuthPage />

  return (
    <div className="app-layout">
      <PaperSidebar
        papers={papers}
        selectedPaper={selectedPaper}
        uploading={uploading}
        user={session.user}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onSelect={handleSelectPaper}
        onLogout={handleLogout}
      />
      <ChatPanel
        selectedPaper={selectedPaper}
        messages={messages}
        loadingHistory={loadingHistory}
        onSend={handleSend}
      />
      <RightPanel selectedPaper={selectedPaper} />
    </div>
  )
}