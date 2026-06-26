import { Clock3, Trash2 } from 'lucide-react'

export default function HistoryPanel({
  documents = [],
  activeDocumentId,
  chooseDocument,
  handleDeleteDocument,
}) {
  return (
    <section id="history" className="mx-auto w-full max-w-7xl scroll-mt-28 px-5 pb-12 lg:px-8">
      <div className="workspace-panel">
        <div className="section-heading">
          <Clock3 size={19} />
          <h2>Stored summaries</h2>
        </div>
        <div className="history-grid">
          {documents.map((document) => (
            <div key={document._id} className="history-item-container">
              <button
                onClick={() => chooseDocument(document)}
                className={`history-item ${activeDocumentId === document._id ? 'is-active' : ''}`}
              >
                <span>{document.title}</span>
                <small>{document.chunkCount || 0} chunks</small>
              </button>
              <button
                onClick={(event) => handleDeleteDocument(event, document._id)}
                className="delete-doc-button"
                title="Delete document and chunks"
                aria-label="Delete document"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!documents.length && <p className="muted-text">No summaries stored yet.</p>}
        </div>
      </div>
    </section>
  )
}
