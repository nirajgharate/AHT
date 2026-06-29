import { useState, useEffect } from 'react'
import { Sparkles, Volume2, Play, Pause, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function stripMarkdown(text) {
  if (!text) return ''
  return text
    .replace(/[#*`_~\[\]\(\)]/g, '') // remove markdown tags
    .replace(/-\s+/g, '') // remove list bullet spaces
    .replace(/\s+/g, ' ') // collapse spacing
    .trim()
}

export default function SummaryResultPanel({ summary }) {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)

  // Cancel any speech if the component unmounts or the summary changes
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [summary])

  function handlePlay() {
    window.speechSynthesis.cancel() // clear any current synthesis

    const cleanText = stripMarkdown(summary)
    if (!cleanText) return

    const utterance = new SpeechSynthesisUtterance(cleanText)

    // Auto-detect Hindi script characters: Range [\u0900-\u097F]
    const hasHindi = /[\u0900-\u097F]/.test(summary)
    utterance.lang = hasHindi ? 'hi-IN' : 'en-US'

    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
    }

    utterance.onerror = () => {
      setSpeaking(false)
      setPaused(false)
    }

    setSpeaking(true)
    setPaused(false)
    window.speechSynthesis.speak(utterance)
  }

  function handlePauseResume() {
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    } else {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }

  function handleStop() {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading flex items-center justify-between" style={{ width: '100%' }}>
        <div className="flex items-center gap-2">
          <Sparkles size={19} />
          <h2>Summary</h2>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            {!speaking ? (
              <button
                onClick={handlePlay}
                className="theme-toggle flex items-center gap-1.5 cursor-pointer"
                title="Listen to Summary"
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
              >
                <Volume2 size={14} className="text-[var(--accent)]" />
                <span>Listen</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-[var(--accent-soft)] rounded-lg p-0.5 border border-[var(--panel-border)]">
                <button
                  type="button"
                  onClick={handlePauseResume}
                  className="icon-button flex items-center justify-center cursor-pointer"
                  title={paused ? "Resume" : "Pause"}
                  style={{ width: '26px', height: '26px', padding: 0 }}
                >
                  {paused ? <Play size={13} /> : <Pause size={13} />}
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="icon-button flex items-center justify-center cursor-pointer"
                  title="Stop"
                  style={{ width: '26px', height: '26px', padding: 0 }}
                >
                  <Square size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="result-box markdown-content">
        {summary ? (
          <ReactMarkdown>{summary}</ReactMarkdown>
        ) : (
          'Your generated summary will appear here after the API responds.'
        )}
      </div>
    </section>
  )
}
