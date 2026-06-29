import { useEffect, useMemo, useState } from 'react'
import Navbar from './components/Navbar'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import { login, register } from './services/auth'
import { fetchDocuments, deleteDocument, extractTextFromFile, summarizeStream } from './services/documents'
import { askStream } from './services/rag'
import { checkHealth } from './services/health'
import './App.css'

const sampleText =
  'Paste a report, article, transcript, meeting notes, or research material here. The app will split the text into retrieval chunks, generate embeddings with LangChain, store the document and chunks in MongoDB, and produce a grounded summary.'
function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [activeTab, setActiveTab] = useState('text')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('detailed')
  const [summary, setSummary] = useState('')
  const [language, setLanguage] = useState('english')
  const [activeDocumentId, setActiveDocumentId] = useState('')
  const [documents, setDocuments] = useState([])
  const [askText, setAskText] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const [apiStatus, setApiStatus] = useState('checking')
  const [uploading, setUploading] = useState(false)
  const [uploadFilename, setUploadFilename] = useState('')
  const [ragScope, setRagScope] = useState('active')
  const [isDragging, setIsDragging] = useState(false)
  const [chatHistory, setChatHistory] = useState([])

  // Auth States
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || '')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')

  const characterCount = text.trim().length
  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  // Reset inputs when switching between tabs (Text vs YouTube)
  useEffect(() => {
    setTitle('')
    setText('')
    setQuestion('')
    setSummary('')
    setActiveDocumentId('')
    setChatHistory([])
    setAnswer('')
    setSources([])
    setError('')
    setUploadFilename('')
    setLanguage('english')
  }, [activeTab])

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  async function loadDocuments() {
    if (!token) return
    try {
      const data = await fetchDocuments()
      setDocuments(data.documents || [])
    } catch (err) {
      console.error(err.message)
    }
  }

  useEffect(() => {
    let shouldUpdate = true
    if (!token) return

    checkHealth()
      .then(() => {
        if (shouldUpdate) setApiStatus('online')
      })
      .catch(() => {
        if (shouldUpdate) setApiStatus('offline')
      })

    fetchDocuments()
      .then((data) => {
        if (shouldUpdate) {
          setApiStatus('online')
          setDocuments(data.documents || [])
        }
      })
      .catch(() => {
        if (shouldUpdate) setDocuments([])
      })

    return () => {
      shouldUpdate = false
    }
  }, [token])

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setAuthError('')

    try {
      const data = authMode === 'login'
        ? await login(authEmail, authPassword)
        : await register(authEmail, authPassword)

      localStorage.setItem('token', data.token)
      localStorage.setItem('userEmail', data.email)
      setToken(data.token)
      setUserEmail(data.email)
      setAuthEmail('')
      setAuthPassword('')
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    setToken('')
    setUserEmail('')
    setDocuments([])
    setActiveDocumentId('')
    setSummary('')
    setTitle('')
    setQuestion('')
    setAnswer('')
    setSources([])
    setChatHistory([])
  }

  async function readStream(response, onChunk, onMetadata, onSources, onHistory) {
    const stream = response.body || response.data
    if (!stream) {
      throw new Error('Response stream is not readable')
    }
    const reader = stream.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          const cleanLine = line.trim()
          if (!cleanLine.startsWith('data: ')) continue

          const jsonStr = cleanLine.slice(6)
          if (jsonStr === '[DONE]') continue

          try {
            const data = JSON.parse(jsonStr)
            if (data.error) {
              throw new Error(data.error)
            }
            if (data.text !== undefined) {
              onChunk(data.text)
            }
            if (data.id !== undefined) {
              onMetadata(data)
            }
            if (data.sources !== undefined) {
              onSources(data.sources)
            }
            if (data.chatHistory !== undefined) {
              onHistory(data.chatHistory)
            }
          } catch (err) {
            console.error('Error parsing chunk:', err)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  async function handleSummarize(event, overrides = {}) {
    if (event) event.preventDefault()
    setLoading(true)
    setError('')
    setSummary('')
    setAnswer('')
    setSources([])

    const finalTitle = overrides.title !== undefined ? overrides.title : title
    const finalText = overrides.text !== undefined ? overrides.text : text

    try {
      const response = await summarizeStream({ title: finalTitle, text: finalText, question, mode, language })
      
      await readStream(
        response,
        (chunk) => {
          setSummary((prev) => prev + chunk)
        },
        (metadata) => {
          setActiveDocumentId(metadata.id)
        },
        () => {},
        () => {}
      )

      await loadDocuments()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAsk(event) {
    event.preventDefault()
    const docId = ragScope === 'global' ? 'global' : activeDocumentId
    if (!docId) return

    const userQuestion = askText.trim()
    if (!userQuestion) return

    setAsking(true)
    setError('')
    setAskText('')
    setAnswer('')
    setSources([])

    // Optimistically update chat history for document-scoped chat
    if (docId !== 'global') {
      setChatHistory((prev) => [...prev, { role: 'user', content: userQuestion }])
    }

    try {
      const response = await askStream({ documentId: docId, question: userQuestion })

      let accumulatedAnswer = ''
      await readStream(
        response,
        (chunk) => {
          accumulatedAnswer += chunk
          setAnswer(accumulatedAnswer)
          
          if (docId !== 'global') {
            setChatHistory((prev) => {
              const list = [...prev]
              const last = list[list.length - 1]
              if (last && last.role === 'assistant') {
                const updated = { ...last, content: accumulatedAnswer }
                list[list.length - 1] = updated
                return list
              } else {
                return [...list, { role: 'assistant', content: chunk }]
              }
            })
          }
        },
        () => {},
        (srcs) => {
          setSources(srcs)
        },
        (history) => {
          setChatHistory(history)
        }
      )
    } catch (requestError) {
      setError(requestError.message)
      // Rollback optimistic update on error
      if (docId !== 'global' && activeDocumentId) {
        const activeDoc = documents.find(d => d._id === activeDocumentId)
        if (activeDoc) {
          setChatHistory(activeDoc.chatHistory || [])
        }
      }
    } finally {
      setAsking(false)
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setUploadFilename(file.name)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await extractTextFromFile(file)
      
      setText(data.text || '')
      if (data.title) {
        setTitle(data.title)
      }
    } catch (uploadError) {
      setError(uploadError.message)
      setUploadFilename('')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  // Drag and drop handlers
  function handleDragOver(event) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(event) {
    event.preventDefault()
    setIsDragging(false)
  }

  async function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files[0]
    if (!file) return

    const name = file.name.toLowerCase()
    if (!name.endsWith('.txt') && !name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setError('Unsupported file type. Please drag .txt, .pdf, or .docx files.')
      return
    }

    setUploading(true)
    setUploadFilename(file.name)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await extractTextFromFile(file)

      setText(data.text || '')
      if (data.title) {
        setTitle(data.title)
      }
    } catch (uploadError) {
      setError(uploadError.message)
      setUploadFilename('')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDocument(event, docId) {
    event.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this document and all its chunks?')) return

    try {
      await deleteDocument(docId)

      if (activeDocumentId === docId) {
        setActiveDocumentId('')
        setSummary('')
        setTitle('')
        setQuestion('')
        setAnswer('')
        setSources([])
        setChatHistory([])
      }

      await loadDocuments()
    } catch (deleteError) {
      setError(deleteError.message)
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
    setChatHistory(document.chatHistory || [])
  }

  // Render Login Shield if not authenticated
  if (!token) {
    return (
      <AuthPage
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        setAuthError={setAuthError}
        handleAuth={handleAuth}
        loading={loading}
      />
    )
  }

  return (
    <>
      <Navbar
        apiStatus={apiStatus}
        theme={theme}
        onToggleTheme={toggleTheme}
        userEmail={userEmail}
        isAuthenticated={!!token}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <Dashboard
        activeTab={activeTab}
        token={token}
        setError={setError}
        language={language}
        setLanguage={setLanguage}
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
        sampleText={sampleText}
        summary={summary}
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
        documents={documents}
        chooseDocument={chooseDocument}
        handleDeleteDocument={handleDeleteDocument}
      />
    </>
  )
}

export default App
