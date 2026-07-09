import cors from "cors";
import express from "express";
import { z } from "zod";
import { PORT, CLIENT_ORIGIN, GEMINI_API_KEY } from "./config/env.js";
import { connectDatabase, closeDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import ragRoutes from "./routes/rag.js";

const app = express();

const allowedOrigins = [
  "https://aht-one.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

if (CLIENT_ORIGIN && !allowedOrigins.includes(CLIENT_ORIGIN)) {
  allowedOrigins.push(CLIENT_ORIGIN);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));

// Mount routers
app.use("/api/auth", authRoutes);
app.use("/api", documentRoutes);
app.use("/api", ragRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Centralized error handling middleware
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: error.issues[0]?.message || "Invalid request" });
  }

  const status = error.status || 500;
  const message = error.message || "Something went wrong on the server.";
  console.error(error);
  return res.status(status).json({ message });
});

await connectDatabase();

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is empty. Add it to .env before generating summaries.");
}

const server = app.listen(PORT, () => {
  console.log(`Summarizer API running on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
