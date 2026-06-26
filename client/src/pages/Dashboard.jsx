import SummarizerForm from '../components/SummarizerForm'
import SummaryResultPanel from '../components/SummaryResultPanel'
import RagChatPanel from '../components/RagChatPanel'
import HistoryPanel from '../components/HistoryPanel'

export default function Dashboard({
  // Summarizer props
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

  // Summary props
  summary,

  // RAG props
  handleAsk,
  ragScope,
  setRagScope,
  askText,
  setAskText,
  asking,
  activeDocumentId,
  chatHistory,
  answer,
  sources,

  // History props
  documents,
  chooseDocument,
  handleDeleteDocument,
}) {
  return (
    <main className="app-shell min-h-screen">
      <section
        id="summarize"
        className="mx-auto grid w-full max-w-7xl gap-6 px-5 pb-10 pt-28 lg:grid-cols-[1.15fr_0.85fr] lg:px-8"
      >
        <SummarizerForm
          title={title}
          setTitle={setTitle}
          text={text}
          setText={setText}
          question={question}
          setQuestion={setQuestion}
          mode={mode}
          setMode={setMode}
          handleSummarize={handleSummarize}
          uploading={uploading}
          uploadFilename={uploadFilename}
          handleFileUpload={handleFileUpload}
          isDragging={isDragging}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          loading={loading}
          error={error}
          wordCount={wordCount}
          characterCount={characterCount}
        />

        <aside className="flex flex-col gap-6">
          <SummaryResultPanel summary={summary} />

          <RagChatPanel
            handleAsk={handleAsk}
            ragScope={ragScope}
            setRagScope={setRagScope}
            askText={askText}
            setAskText={setAskText}
            asking={asking}
            activeDocumentId={activeDocumentId}
            chatHistory={chatHistory}
            answer={answer}
            sources={sources}
          />
        </aside>
      </section>

      <HistoryPanel
        documents={documents}
        activeDocumentId={activeDocumentId}
        chooseDocument={chooseDocument}
        handleDeleteDocument={handleDeleteDocument}
      />
    </main>
  )
}
