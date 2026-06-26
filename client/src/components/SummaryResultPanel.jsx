import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function SummaryResultPanel({ summary }) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <Sparkles size={19} />
        <h2>Summary</h2>
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
