import { useRef } from 'react'

export default function PaperSidebar({ papers, selectedPaper, uploading, user, onUpload, onDelete, onSelect, onLogout }) {
  const fileInputRef = useRef()

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      onUpload(file)
      e.target.value = ''
    }
  }

  // Show just the part before @ for a clean display name
  const displayName = user?.email?.split('@')[0] ?? 'You'

  return (
    <aside className="sidebar left-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">🔬</div>
          <span className="sidebar-brand-name">ResearchAI</span>
        </div>
      </div>

      <div className="sidebar-body">
        {/* Upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
          >
            <span className="upload-btn-icon">+</span>
            {uploading ? 'Indexing…' : 'Upload Paper'}
          </button>

          {uploading && (
            <div className="uploading-notice" style={{ marginTop: 8 }}>
              <div className="uploading-spinner" />
              <span>Embedding chunks, please wait…</span>
            </div>
          )}
        </div>

        {/* Paper list */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <p className="section-label">Your Library ({papers.length})</p>
          <div className="paper-list">
            {papers.length === 0 && !uploading && (
              <div className="empty-papers">
                <div className="empty-papers-icon">📂</div>
                <p>No papers yet.<br />Upload a PDF to get started.</p>
              </div>
            )}

            {papers.map(paper => (
              <div
                key={paper.id}
                className={`paper-item ${selectedPaper?.id === paper.id ? 'active' : ''}`}
                onClick={() => onSelect(paper)}
              >
                <div className="paper-icon-wrap">📄</div>
                <div className="paper-meta">
                  <span className="paper-name">{paper.title}</span>
                  <span className="paper-date">
                    {paper.upload_date
                      ? new Date(paper.upload_date).toLocaleDateString()
                      : 'Just uploaded'}
                  </span>
                </div>
                <button
                  className="paper-delete-btn"
                  title="Delete paper"
                  onClick={e => { e.stopPropagation(); onDelete(paper.id) }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{displayName[0].toUpperCase()}</div>
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign out">
          ↩
        </button>
      </div>
    </aside>
  )
}
