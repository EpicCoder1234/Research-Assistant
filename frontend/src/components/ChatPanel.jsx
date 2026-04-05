import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'Summarize the key contributions',
  'Explain the methodology',
  'What are the main results?',
]

export default function ChatPanel({ selectedPaper, messages, loadingHistory, onSend }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const textareaRef = useRef()

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const handleSend = async () => {
    if (!input.trim() || !selectedPaper || loading || loadingHistory) return
    const q = input
    setInput('')
    setLoading(true)
    await onSend(q)
    setLoading(false)
  }

  const handleSuggestion = async (text) => {
    if (loading || !selectedPaper) return
    setLoading(true)
    await onSend(text)
    setLoading(false)
  }

  // ── Empty state ──────────────────────────────────────────
  if (!selectedPaper) {
    return (
      <main className="chat-panel">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">🔬</div>
          <h2>No paper selected</h2>
          <p>Pick a paper from your library on the left, or upload a new PDF to start asking questions.</p>
        </div>
      </main>
    )
  }

  // ── Active chat ──────────────────────────────────────────
  return (
    <main className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-icon">📄</div>
        <div>
          <div className="chat-header-title">{selectedPaper.title}</div>
          <div className="chat-header-sub">Research Assistant · ask anything</div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-scroll">
      {/* History loading skeleton */}
        {loadingHistory && (
          <div className="message-row ai">
            <div className="msg-avatar ai">🤖</div>
            <div className="msg-bubble ai" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Loading conversation history…
            </div>
          </div>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div className="welcome-block">
            <p>Ask anything about <strong>{selectedPaper.title}</strong></p>
            <div className="suggestion-chips">
              {SUGGESTIONS.map(s => (
                <button key={s} className="chip" onClick={() => handleSuggestion(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
            <div className={`msg-avatar ${msg.role === 'user' ? '' : 'ai'}`}>
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className={`msg-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row ai">
            <div className="msg-avatar ai">🤖</div>
            <div className="msg-bubble ai">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="msg-textarea"
            placeholder={loadingHistory ? 'Loading history…' : 'Ask a question about this paper…'}
            disabled={loadingHistory}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            title="Send (Enter)"
          >
            ↑
          </button>
        </div>
        <p className="input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </main>
  )
}
