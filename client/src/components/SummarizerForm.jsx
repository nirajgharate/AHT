import { BookOpenText, FileText, Loader2, Sparkles, Upload, CheckCircle2 } from 'lucide-react'

const defaultSampleText =
  'Paste a report, article, transcript, meeting notes, or research material here. The app will split the text into retrieval chunks, generate embeddings with LangChain, store the document and chunks in MongoDB, and produce a grounded summary.'

export default function SummarizerForm({
  title,
  setTitle,
  text,
  setText,
  question,
  setQuestion,
  mode,
  setMode,
  handleSummarize,
  uploading,
  uploadFilename,
  handleFileUpload,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  loading,
  error,
  wordCount,
  characterCount,
  sampleText = defaultSampleText,
}) {
  return (
    <form
      onSubmit={handleSummarize}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="workspace-panel workspace-panel-dropzone"
    >
      {isDragging && (
        <div className="drag-overlay">
          <Upload size={36} className="animate-bounce" />
          <span>Drop file here to extract text</span>
        </div>
      )}
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
      <div className="upload-container">
        <label className="upload-button" htmlFor="file-upload">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Extracting text...' : 'Upload Document (.txt, .pdf, .docx)'}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={handleFileUpload}
          className="upload-input-hidden"
          disabled={uploading}
        />
        {uploadFilename && (
          <span className="upload-filename" title={uploadFilename}>
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span className="truncate">{uploadFilename}</span>
          </span>
        )}
      </div>

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

      <div className="grid grid-cols-[1fr_120px] gap-4 md:grid-cols-[1fr_220px]">
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
  )
}
