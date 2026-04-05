const WIDGETS = [
  {
    id: 'quiz',
    icon: '🧠',
    title: 'Quiz Mode',
    desc: 'Test your understanding with auto-generated questions and get instant feedback.',
    badge: 'Coming Soon',
  },
  {
    id: 'compare',
    icon: '⚖️',
    title: 'Compare Papers',
    desc: 'Ask questions that span your entire library and compare ideas across papers.',
    badge: 'Coming Soon',
  },
  {
    id: 'concepts',
    icon: '💡',
    title: 'Concepts KB',
    desc: 'Browse your personal knowledge base of saved concept explanations.',
    badge: 'Coming Soon',
  },
  {
    id: 'summary',
    icon: '📝',
    title: 'Paper Summary',
    desc: 'Get a structured breakdown of contributions, methods, and results.',
    badge: 'Coming Soon',
  },
]

export default function RightPanel({ selectedPaper }) {
  return (
    <aside className="sidebar right-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
            ⚡
          </div>
          <span className="sidebar-brand-name">Tools</span>
        </div>
      </div>

      <div className="sidebar-body">
        {!selectedPaper && (
          <div className="no-paper-notice">
            Select a paper to unlock tools and features.
          </div>
        )}

        <div>
          <p className="section-label">Features</p>
          <div className="widget-list">
            {WIDGETS.map(w => (
              <div
                key={w.id}
                className={`widget-card ${!selectedPaper ? 'locked' : ''}`}
                title={!selectedPaper ? 'Select a paper first' : ''}
              >
                <div className="widget-card-header">
                  <div className="widget-icon">{w.icon}</div>
                  <div className="widget-title-row">
                    <span className="widget-title">{w.title}</span>
                    {w.badge && <span className="widget-badge">{w.badge}</span>}
                  </div>
                </div>
                <p className="widget-desc">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
