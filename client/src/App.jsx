import { useEffect, useMemo, useState } from 'react'
import { BookOpenText, Clock3, FileText, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import Navbar from './components/Navbar'
import './App.css'

const sampleText =
  'Paste a report, article, transcript, meeting notes, or research material here. The app will split the text into retrieval chunks, generate embeddings with LangChain, store the document and chunks in MongoDB, and produce a grounded summary.'

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('detailed')
  const [summary, setSummary] = useState('')
  const [activeDocumentId, setActiveDocumentId] = useState('')
  const [documents, setDocuments] = useState([])
  const [askText, setAskText] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState('checking')

  const characterCount = text.trim().length
  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  async function loadDocuments() {
    const response = await fetch('/api/documents')
    if (!response.ok) return
    const data = await response.json()
    setDocuments(data.documents || [])
  }

  useEffect(() => {
    let shouldUpdate = true

    fetch('/api/health')
      .then((response) => {
        if (shouldUpdate) setApiStatus(response.ok ? 'online' : 'offline')
      })
      .catch(() => {
        if (shouldUpdate) setApiStatus('offline')
      })

    fetch('/api/documents')
      .then((response) => {
        if (shouldUpdate && response.ok) setApiStatus('online')
        return response.ok ? response.json() : { documents: [] }
      })
      .then((data) => {
        if (shouldUpdate) setDocuments(data.documents || [])
      })
      .catch(() => {
        if (shouldUpdate) setDocuments([])
      })

    return () => {
      shouldUpdate = false
    }
  }, [])

  async function handleSummarize(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSummary('')
    setAnswer('')
    setSources([])

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, question, mode }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to summarize text.')
      setSummary(data.summary)
      setActiveDocumentId(data.id)
      await loadDocuments()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAsk(event) {
    event.preventDefault()
    if (!activeDocumentId) return

    setAsking(true)
    setError('')
    setAnswer('')
    setSources([])

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: activeDocumentId, question: askText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Unable to answer the question.')
      setAnswer(data.answer)
      setSources(data.sources || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAsking(false)
    }
  }

  function chooseDocument(document) {
    setActiveDocumentId(document._id)
    setSummary(document.summary || '')
    setTitle(document.title || '')
    setQuestion(document.question || '')
    setMode(document.mode || 'detailed')
    setAnswer('')
    setSources([])
  }

  return (
    <>
      <Navbar apiStatus={apiStatus} theme={theme} onToggleTheme={toggleTheme} />
      <main className="app-shell min-h-screen">
        <section
          id="summarize"
          className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-10 pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:px-8"
        >
          <form onSubmit={handleSummarize} className="workspace-panel">
            <div className="panel-header flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">LangChain + RAG + MongoDB</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
                  Text Summarizer
                </h1>
              </div>
              <div className="stats-row">
                <span>
                  <FileText size={16} /> {wordCount} words
                </span>
                <span>
                  <BookOpenText size={16} /> {characterCount} chars
                </span>
              </div>
            </div>

            <label className="field-label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Q2 market research notes"
              className="text-input"
            />

            <label className="field-label" htmlFor="source-text">
              Source text
            </label>
            <textarea
              id="source-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={sampleText}
              className="source-textarea"
            />

            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div>
                <label className="field-label" htmlFor="question">
                  Optional focus
                </label>
                <input
                  id="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Focus on risks, tasks, or key decisions"
                  className="text-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="mode">
                  Summary style
                </label>
                <select
                  id="mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                  className="text-input"
                >
                  <option value="detailed">Detailed</option>
                  <option value="brief">Brief</option>
                  <option value="bullets">Bullets</option>
                </select>
              </div>
            </div>

            {error && <p className="error-box">{error}</p>}

            <button disabled={loading} className="primary-button">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Summarizing' : 'Summarize and store'}
            </button>
          </form>

          <aside className="flex flex-col gap-6">
            <section className="workspace-panel">
              <div className="section-heading">
                <Sparkles size={19} />
                <h2>Summary</h2>
              </div>
              <div className="result-box">
                {summary || 'Your generated summary will appear here after the API responds.'}
              </div>
            </section>

            <section id="rag" className="workspace-panel scroll-mt-28">
              <div className="section-heading">
                <MessageCircle size={19} />
                <h2>Ask With RAG</h2>
              </div>
              <form onSubmit={handleAsk} className="ask-form">
                <input
                  value={askText}
                  onChange={(event) => setAskText(event.target.value)}
                  placeholder="Ask a follow-up about the stored document"
                  className="text-input"
                />
                <button disabled={asking || !activeDocumentId} className="secondary-button">
                  {asking ? <Loader2 className="animate-spin" size={17} /> : 'Ask'}
                </button>
              </form>
              {answer && <div className="answer-box">{answer}</div>}
              {sources.length > 0 && (
                <div className="sources-list">
                  {sources.map((source) => (
                    <p key={source.index}>
                      Chunk {source.index + 1} | score {source.score}: {source.preview}
                    </p>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>

        <section id="history" className="mx-auto w-full max-w-7xl scroll-mt-28 px-5 pb-12 lg:px-8">
          <div className="workspace-panel">
            <div className="section-heading">
              <Clock3 size={19} />
              <h2>Stored summaries</h2>
            </div>
            <div className="history-grid">
              {documents.map((document) => (
                <button
                  key={document._id}
                  onClick={() => chooseDocument(document)}
                  className={`history-item ${activeDocumentId === document._id ? 'is-active' : ''}`}
                >
                  <span>{document.title}</span>
                  <small>{document.chunkCount || 0} chunks</small>
                </button>
              ))}
              {!documents.length && <p className="muted-text">No summaries stored yet.</p>}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default App
