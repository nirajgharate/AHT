import cors from "cors";
import { config } from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { closeDatabase, connectDatabase } from "./db.js";
import { askDocument, listDocuments, summarizeAndStore } from "./summarizer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });
config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "5mb" }));

const summarizeSchema = z.object({
  title: z.string().max(140).optional(),
  text: z.string().trim().min(100, "Paste at least 100 characters to summarize."),
  question: z.string().max(500).optional(),
  mode: z.enum(["detailed", "brief", "bullets"]).default("detailed"),
});

const askSchema = z.object({
  documentId: z.string().min(1),
  question: z.string().trim().min(3).max(500),
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/documents", async (_req, res, next) => {
  try {
    res.json({ documents: await listDocuments() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/summarize", async (req, res, next) => {
  try {
    const payload = summarizeSchema.parse(req.body);
    res.json(await summarizeAndStore(payload));
  } catch (error) {
    next(error);
  }
});

app.post("/api/ask", async (req, res, next) => {
  try {
    const payload = askSchema.parse(req.body);
    res.json(await askDocument(payload));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message || "Invalid request" });
  }

  const status = error.status || 500;
  const message = status === 500 ? "Something went wrong on the server." : error.message;
  console.error(error);
  return res.status(status).json({ message });
});

await connectDatabase();

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is empty. Add it to .env before generating summaries.");
}

const server = app.listen(port, () => {
  console.log(`Summarizer API running on http://localhost:${port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
