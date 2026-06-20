# AHT Text Summarizer

A React + Node.js text summarizer that uses LangChain for chunking, Gemini chat/embedding models for summarization and retrieval, and MongoDB to store documents, summaries, chunks, and embeddings.

## Setup

1. Install dependencies:

```bash
npm install --prefix server
npm install --prefix client
```

2. Create the server environment file:

```bash
copy server\.env.example server\.env
```

3. Fill in:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=aht_summarizer
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
```

4. Start the API:

```bash
npm run dev --prefix server
```

5. Start the React app in a second terminal:

```bash
npm run dev --prefix client
```

The React app runs at `http://localhost:5173` and proxies API requests to `http://localhost:5000`.

## Project Structure

- `client/` contains the React/Vite frontend and its own `package.json`.
- `server/` contains the Node/Express/LangChain API, MongoDB config, and its own `package.json`.
- `server/.env` stores local backend secrets and is ignored by git.

## API

- `POST /api/summarize` stores a document, chunks it, embeds the chunks, and returns a summary.
- `POST /api/ask` embeds a question, retrieves similar stored chunks, and answers from the retrieved context.
- `GET /api/documents` returns recent stored summaries.
- `GET /api/health` returns API health.
