import { Loader2, MessageCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function RagChatPanel({
  handleAsk,
  ragScope,
  setRagScope,
  askText,
  setAskText,
  asking,
  activeDocumentId,
  chatHistory = [],
  answer,
  sources = [],
}) {
  return (
    <section id="rag" className="workspace-panel scroll-mt-28">
      <div className="section-heading">
        <MessageCircle size={19} />
        <h2>Ask With RAG</h2>
      </div>
      <form onSubmit={handleAsk} className="ask-form">
        <select
          value={ragScope}
          onChange={(event) => setRagScope(event.target.value)}
          className="ask-scope-select"
          title="Select search scope"
        >
          <option value="active">Active Doc</option>
          <option value="global">All Docs</option>
        </select>
        <input
          value={askText}
          onChange={(event) => setAskText(event.target.value)}
          placeholder={
            ragScope === 'global'
              ? 'Ask across all stored documents'
              : 'Ask a follow-up about the active document'
          }
          className="text-input"
        />
        <button
          disabled={asking || (ragScope === 'active' && !activeDocumentId)}
          className="secondary-button"
        >
          {asking ? <Loader2 className="animate-spin" size={17} /> : 'Ask'}
        </button>
      </form>

      {ragScope !== 'global' && chatHistory.length > 0 && (
        <div className="chat-container">
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <span className="chat-message-meta">{msg.role}</span>
              <div className="markdown-content">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {asking && (
            <div className="chat-message assistant">
              <span className="chat-message-meta">assistant</span>
              <Loader2 className="animate-spin h-4 w-4" />
            </div>
          )}
        </div>
      )}

      {ragScope === 'global' && answer && (
        <div className="answer-box markdown-content">
          <ReactMarkdown>{answer}</ReactMarkdown>
        </div>
      )}

      {sources.length > 0 && (
        <div className="sources-list">
          {sources.map((source, idx) => (
            <p key={idx}>
              <strong>{source.documentTitle}</strong> (Chunk {source.index + 1} | score {source.score}
              ): {source.preview}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
