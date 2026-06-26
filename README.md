# ✨ AHT Text Summarizer & RAG Dashboard

![AHT Text Summarizer Preview](client/public/project-preview.svg)

AHT Text Summarizer is a premium, full-stack AI orchestration platform that handles text summarization, stores source materials in MongoDB, and runs context-grounded follow-up RAG chatbot sessions. Powered by React, Node.js/Express, LangChain, and Gemini.

---

## 🎨 Soulful UI Design

The interface has been crafted with a modern, glassmorphic design language to deliver a premium, responsive workspace.

### 💻 Desktop View Features
* **Floating Glass Navbar**: A centered, glass-frosted navigation pill that slides down from the top on page load. It features smooth **Framer Motion spring sweeps** that follow link hovers, profile badges, and theme switches.
* **Balanced Split-Screen Workspace**:
  - **Left Column**: The **Summarizer Workspace** contains fields for custom titles, source text areas, custom focus queries, and summary style selectors.
  - **Right Column**: Displays the generated **Summary Output** and the **RAG Ask Panel** side-by-side. 
* **Sizing Constraints**: Large text inputs and generated summaries are kept clean and compact. Paste areas and result boxes are capped at `max-height: 500px` and scroll internally using custom-designed emerald scrollbar thumbs.
* **Stored Summaries Drawer**: Placed in a grid block at the bottom of the workspace for easy retrieval and document deletion.

### 📱 Mobile View Adaptations
* **Optimized Card Spacing**: Panels collapse their padding from `32px` on desktop down to `20px` on mobile, reclaiming critical screen estate.
* **Side-by-Side Mobile Inputs**: The **Optional focus** text field and **Summary style** select dropdown are placed in a side-by-side grid (`grid-cols-[1fr_120px]`). This prevents the dropdown from stretching and keeps the form vertically compact.
* **Responsive History Stacking**: Stored summary items automatically stack into a single column on small screens, adapting smoothly to touch interfaces.
* **Drawer Navigation**: A full-screen glassmorphic mobile drawer handles responsive routing, theme shifting, and profile logout options.

---

## 🔄 User Workflow Flow

The primary interactive flow inside the dashboard works as follows:

1. **Upload or Paste**: Paste your source text into the editor or click the **Upload Document** button (supporting `.txt`, `.pdf`, `.docx` formats with a verified green check badge upon upload).
2. **Select Style**: Choose a summary style: **Detailed**, **Brief**, or **Bullets**.
3. **Optional Focus**: Input an optional question to direct the AI's summarization attention.
4. **Generate & Store**: Click **Summarize and store** to stream the generated summary token-by-token and save the file in your database.
5. **RAG Q&A**: Ask follow-up questions in the chat container. The server will retrieve only the relevant segments of your document to ground its answers.
6. **Summary History**: Open previous documents and their full chat histories at any time from the grid list.

---

## 🛠️ Tech Stack

| Layer | Technologies | Description |
|---|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Lucide Icons | Client-side reactive elements & micro-animations |
| **Backend** | Node.js, Express v5, JWT, Multer, Mammoth, Zod | Layered routing, schema validation, and doc parsing |
| **AI Orchestration**| LangChain, `@langchain/google-genai` | Splitting, embedding pipelines, and model stream wiring |
| **Vector Database** | MongoDB Atlas / Local MongoDB Client | Persisting document logs, chunks, and embeddings |
| **AI Models** | Gemini 2.5 Flash, Gemini-Embedding-001 | Generative summaries and vector embeddings |

---

## 📐 Application Architecture

```mermaid
flowchart TD
  User["👤 User Interface (React)"]
  
  subgraph Client [Vite Frontend]
    User --> Navbar["📂 Floating Navbar"]
    User --> Editor["📝 Source Editor"]
    User --> Chat["💬 RAG Chat Area"]
  end

  subgraph API [Express Gateway]
    Navbar --> AuthGuard["🔐 JWT Auth Middleware"]
    Editor --> UploadGuard["📁 Multer Memory Storage"]
    UploadGuard --> Controller["🎮 Document Controller"]
    Chat --> RAGController["🎮 RAG Controller"]
  end

  subgraph LangChainOrchestrator [AI & Retrieval Pipeline]
    Controller --> Splitter["✂️ Text Splitter (Overlapping Chunks)"]
    Splitter --> Embedder["🧬 Gemini Embedding Gen"]
    RAGController --> Similarity["🧮 Cosine Similarity / Atlas Search"]
  end

  subgraph Database [Storage Layer]
    Embedder --> MongoDocs["🗄️ MongoDB Documents"]
    Embedder --> MongoChunks["🗄️ MongoDB Chunks & Vectors"]
    Similarity <-- Fetch["🔍 Vector Retrieval"]
  end

  RAGController --> LLM["🤖 Gemini 2.5 Flash Stream"]
  Controller --> LLM
  LLM --> Client
```

---

## ⚡ Key Technical Features

* **ESM PDF Parser Fix**: Configured the backend with native ES Module imports using the newer `PDFParse` class and setting `disableWorker: true`. This prevents Windows-based event loop native thread assertion crashes (`win/async.c`) and runs parsing synchronously on the main thread.
* **Docx & Text Support**: Parses Microsoft Word documents using `Mammoth` and `.txt` files directly.
* **Hybrid Vector Retrieval**: Uses MongoDB Atlas Vector Search index pipeline for similarity lookups, falling back automatically to local in-memory cosine-similarity algorithms on standard local MongoDB installations.
* **Token Authentication**: Secure JWT endpoints guard all summarization, chat, and document deletion routes.
* **Event Streams (SSE)**: Summaries and RAG chat replies stream token-by-token using Server-Sent Events, ensuring zero lag for long responses.

---

## 📂 Project Structure

```text
AHT/
├── client/                      # Vite Frontend Application
│   ├── src/
│   │   ├── components/          # Modular component views
│   │   │   ├── Navbar.jsx       # Floating spring-hover navbar
│   │   │   ├── SummarizerForm.jsx # Input fields & metallic file upload button
│   │   │   ├── SummaryResultPanel.jsx # Frosted summary Markdown output
│   │   │   ├── RagChatPanel.jsx # RAG chatbot bubble terminal
│   │   │   └── HistoryPanel.jsx # Responsive saved summary grid list
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx     # Glassy auth portal (Login/Register)
│   │   │   └── Dashboard.jsx    # Central dashboard hub grid layout
│   │   ├── App.jsx              # Main React container logic
│   │   ├── App.css              # Glassmorphic tokens, animations & scrollbars
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js           # Set to proxy /api requests to port 5000
│
├── server/                      # Layered Express API
│   ├── src/
│   │   ├── config/              # Centralized setups
│   │   │   ├── db.js            # MongoDB client & vector index verification
│   │   │   └── env.js           # Env validator and exports
│   │   ├── middleware/          # Request filters
│   │   │   ├── auth.js          # JWT authentication headers guard
│   │   │   └── upload.js        # Multer in-memory upload limits (10MB)
│   │   ├── validators/          # Input checking
│   │   │   └── schemas.js       # Zod verification objects
│   │   ├── controllers/         # Endpoint callbacks logic
│   │   │   ├── authController.js # Signup, hashing & signing
│   │   │   ├── documentController.js # Multi-format file parsing & extraction
│   │   │   └── ragController.js  # RAG event streams handler
│   │   ├── routes/              # Express Router mapping
│   │   │   ├── auth.js          # /api/auth routes
│   │   │   ├── documents.js     # /api/documents routes
│   │   │   └── rag.js           # /api/ask routes
│   │   ├── index.js             # Bootstrap server & mount middlewares
│   │   └── summarizer.js        # LangChain pipelines & vector math fallback
│   ├── package.json
│   └── .env                     # Centralized credentials (ignored by Git)
```

---

## 🚀 Installation & Setup

### 1. Environment Configurations
Create a `.env` file inside the `server/` directory:

```bash
copy server\.env.example server\.env
```

Define the variables inside `server/.env`:

```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=aht_summarizer
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
CLIENT_ORIGIN=http://localhost:5175
```

### 2. Dependency Installation
Install dependencies for both folders:

```bash
# Install backend packages
npm install --prefix server

# Install frontend packages
npm install --prefix client
```

### 3. Running Locally
Start both backend API and frontend client in separate terminals:

```bash
# Start backend server (starts in watch mode on port 5000)
npm run dev --prefix server

# Start Vite client dev server (starts on port 5175)
npm run dev --prefix client
```

Open [http://localhost:5175](http://localhost:5175) in your web browser.

---

## 📡 API Reference

| Method | Route | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | None | Registers a new user account |
| `POST` | `/api/auth/login` | None | Authenticates a user and returns a JWT token |
| `GET` | `/api/health` | None | Checks whether the API is reachable |
| `GET` | `/api/documents` | Required (JWT) | Returns recent stored summaries created by user |
| `POST` | `/api/extract-text` | Required (JWT) | Parses uploaded files (`.txt`, `.pdf`, `.docx`) |
| `DELETE` | `/api/documents/:id` | Required (JWT) | Deletes a stored document and its vector chunks |
| `POST` | `/api/summarize/stream` | Required (JWT) | Chunks, embeds, generates, and streams text summaries |
| `POST` | `/api/ask/stream` | Required (JWT) | Asks follow-up questions using vector RAG similarity |

---

## ⚡ Useful Commands

Run frontend linter:
```bash
npm run lint --prefix client
```

Build production client assets:
```bash
npm run build --prefix client
```

List all available Gemini models linked to your API key:
```bash
npm run models --prefix server
```
