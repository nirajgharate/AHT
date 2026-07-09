import { useState } from 'react'
import { BookOpenText, FileText, Loader2, Sparkles, Video, ArrowRight, RotateCcw, Edit3, Check, ExternalLink } from 'lucide-react'
import { fetchYoutubeTranscript } from '../services/youtube'

export default function YoutubeSummarizerForm({
  title,
  setTitle,
  text,
  setText,
  question,
  setQuestion,
  mode,
  setMode,
  language,
  setLanguage,
  handleSummarize,
  loading,
  error,
  setError,
  wordCount,
  characterCount,
  token,
}) {
  const [videoUrl, setVideoUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [videoMeta, setVideoMeta] = useState(null) // { title, author, thumbnail, videoId, url }
  const [isEditingText, setIsEditingText] = useState(false)

  // Fetch handler supporting both interactive preview & instant summarization
  async function handleAction(e, type) {
    if (e) e.preventDefault()
    if (!videoUrl.trim()) return

    setFetching(true)
    setError('')
    setText('')
    setTitle('')
    setVideoMeta(null)
    setIsEditingText(false)

    try {
      const data = await fetchYoutubeTranscript(videoUrl.trim())

      // Commit fetched data to states
      setText(data.text || '')
      setTitle(data.title || 'YouTube Video')
      const meta = {
        title: data.title,
        author: data.author,
        thumbnail: data.thumbnail,
        videoId: data.videoId,
        url: videoUrl.trim(),
      }
      setVideoMeta(meta)

      // If instant summarization is requested, trigger it immediately
      if (type === 'summarize') {
        await handleSummarize(null, {
          title: data.title,
          text: data.text || '',
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setFetching(false)
    }
  }

  function handleReset() {
    setVideoUrl('')
    setVideoMeta(null)
    setText('')
    setTitle('')
    setError('')
    setIsEditingText(false)
  }

  function handleManualFallback() {
    setError('')
    const videoId = extractVideoId(videoUrl) || 'dQw4w9WgXcQ'
    const fallbackMeta = {
      title: 'Manual Video Transcript',
      author: 'Unknown Creator',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      videoId: videoId,
      url: videoUrl.trim() || `https://www.youtube.com/watch?v=${videoId}`,
    }
    setVideoMeta(fallbackMeta)
    setTitle('Manual Video Transcript')
    setText('')
    setIsEditingText(true)
  }

  return (
    <div className="workspace-panel">
      {/* Panel Header */}
      <div className="panel-header flex flex-col gap-4 border-b pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">LangChain + RAG + Video Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
            YouTube Workspace
          </h1>
        </div>
        {videoMeta && (
          <div className="stats-row">
            <span>
              <FileText size={16} /> {wordCount} words
            </span>
            <span>
              <BookOpenText size={16} /> {characterCount} chars
            </span>
          </div>
        )}
      </div>

      {/* Stage 1: URL Entry Form (Prior to loading details) */}
      {!videoMeta ? (
        <div className="py-10 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20 text-rose-500 animate-pulse">
            <Video size={32} />
          </div>
          <h2 className="text-xl font-bold text-center tracking-tight">Summarize YouTube Content</h2>
          <p className="text-sm text-[var(--subtle)] text-center max-w-sm mt-2 mb-8">
            Enter a YouTube video URL to generate summaries, extract transcripts, and chat with the video in real-time.
          </p>

          <form className="w-full max-w-lg flex flex-col gap-4">
            <div className="relative">
              <input
                type="url"
                required
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="text-input pr-10"
                disabled={fetching || loading}
                style={{ height: '48px' }}
              />
              <Video size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--subtle)]" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={(e) => handleAction(e, 'preview')}
                disabled={fetching || loading || !videoUrl.trim()}
                className="secondary-button flex-1 flex items-center justify-center gap-2"
                style={{ margin: 0, height: '48px', borderRadius: '12px' }}
              >
                {fetching && !loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                Preview Transcript
              </button>
              <button
                type="button"
                onClick={(e) => handleAction(e, 'summarize')}
                disabled={fetching || loading || !videoUrl.trim()}
                className="primary-button flex-1 flex items-center justify-center gap-2"
                style={{ margin: 0, height: '48px', borderRadius: '12px' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'Summarizing...' : 'Summarize Directly'}
              </button>
            </div>
            {error && (
              <div className="flex flex-col gap-2 mt-2">
                <p className="error-box" style={{ margin: 0 }}>{error}</p>
                <button
                  type="button"
                  onClick={handleManualFallback}
                  className="secondary-button text-xs py-2 self-start cursor-pointer hover:bg-[var(--accent)] hover:text-white transition-colors"
                  style={{ borderRadius: '8px', margin: 0, padding: '8px 16px', fontSize: '12px' }}
                >
                  Write or paste transcript manually
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        /* Stage 2: Video Loaded with Embedded Live Player and Controls */
        <div className="mt-6 flex flex-col gap-6">
          {/* Integrated Live Player Card */}
          <div className="glass-panel overflow-hidden border border-[var(--panel-border)] rounded-2xl bg-[var(--card-bg)]/40 p-4 transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col gap-5">
              {/* Responsive Embedded Frame */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-sm bg-black border border-[var(--panel-border)]">
                <iframe
                  src={`https://www.youtube.com/embed/${videoMeta.videoId}`}
                  title={title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              {/* Video Title and Author details */}
              <div className="flex flex-col justify-between py-1">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/10">
                        Live Player Active
                      </span>
                      {videoMeta.author && (
                        <span className="text-xs text-[var(--subtle)] font-medium">
                          by <span className="text-[var(--text)] font-semibold">{videoMeta.author}</span>
                        </span>
                      )}
                    </div>
                    <a
                      href={videoMeta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--subtle)] hover:text-[var(--text)] transition-colors flex items-center gap-1 text-xs"
                    >
                      View on YouTube <ExternalLink size={12} />
                    </a>
                  </div>
                  <h3 className="text-lg font-bold mt-2.5 leading-snug tracking-tight text-[var(--text)]">
                    {title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="secondary-button w-fit mt-4 flex items-center gap-1.5"
                  style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}
                >
                  <RotateCcw size={14} /> Summarize another video
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSummarize} className="flex flex-col gap-4">
            {/* Transcript Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label" htmlFor="source-text" style={{ margin: 0 }}>
                  Extracted captions
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingText(!isEditingText)}
                  className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {isEditingText ? (
                    <>
                      <Check size={13} /> Lock Transcript
                    </>
                  ) : (
                    <>
                      <Edit3 size={13} /> Edit Transcript
                    </>
                  )}
                </button>
              </div>

              {isEditingText ? (
                <textarea
                  id="source-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Video transcripts will appear here..."
                  className="source-textarea"
                  style={{ minHeight: '160px' }}
                />
              ) : (
                <div className="source-textarea font-normal text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap select-text bg-[var(--card-bg)]/20 cursor-default border border-[var(--panel-border)]"
                  style={{ maxHeight: '160px', minHeight: '160px', padding: '12px' }}>
                  {text}
                </div>
              )}
            </div>

            {/* Custom Focus Query & Styles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_180px_180px]">
              <div>
                <label className="field-label" htmlFor="question">
                  Optional focus
                </label>
                <input
                  id="question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Focus on specific topics in the video..."
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
              <div>
                <label className="field-label" htmlFor="language">
                  Language
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="text-input"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                </select>
              </div>
            </div>

            {error && <p className="error-box">{error}</p>}

            <button disabled={loading || !text.trim()} className="primary-button mt-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              {loading ? 'Summarizing Video' : 'Summarize and store'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function extractVideoId(url) {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}
