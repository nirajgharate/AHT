import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { YoutubeTranscript } from "youtube-transcript";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  listDocuments,
  deleteDocument,
  summarizeAndStore,
  summarizeAndStoreStream,
} from "../summarizer.js";
import { summarizeSchema } from "../validators/schemas.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.resolve(__dirname, "../../node_modules/pdfjs-dist/build/pdf.worker.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

export async function extractText(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file was uploaded." });
    }

    const filename = req.file.originalname;
    const extension = path.extname(filename).toLowerCase();
    let text = "";

    if (extension === ".txt") {
      text = req.file.buffer.toString("utf-8");
    } else if (extension === ".pdf") {
      const parser = new PDFParse({
        data: req.file.buffer,
        disableWorker: true,
      });
      const parsed = await parser.getText();
      text = parsed.text;
    } else if (extension === ".docx") {
      const parsed = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = parsed.value;
    } else {
      return res.status(400).json({ message: "Unsupported file format. Please upload .txt, .pdf, or .docx." });
    }

    const title = path.basename(filename, extension);
    res.json({ text, title });
  } catch (error) {
    next(error);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const docs = await listDocuments(req.user.id);
    res.json({ documents: docs });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocumentRoute(req, res, next) {
  try {
    const { id } = req.params;
    const result = await deleteDocument(id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function summarize(req, res, next) {
  try {
    const payload = summarizeSchema.parse(req.body);
    const result = await summarizeAndStore(payload, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function summarizeStream(req, res, next) {
  try {
    const payload = summarizeSchema.parse(req.body);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await summarizeAndStoreStream(payload, res, req.user.id);
  } catch (error) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
}

function extractVideoId(url) {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.slice(1).split('/')[0];
    }
    if (parsedUrl.searchParams.has('v')) {
      return parsedUrl.searchParams.get('v');
    }
    const pathParts = parsedUrl.pathname.split('/');
    if (pathParts.includes('embed') || pathParts.includes('v') || pathParts.includes('shorts') || pathParts.includes('live')) {
      return pathParts[pathParts.length - 1];
    }
  } catch (e) {
    // ignore URL parsing error and fall back to regex
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export async function extractYoutubeTranscript(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: "YouTube URL is required." });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ message: "Invalid YouTube URL format." });
    }

    let title = "YouTube Video";
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let author = "";

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oembedRes = await fetch(oembedUrl);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
        if (oembedData.author_name) author = oembedData.author_name;
      }
    } catch (titleError) {
      console.warn("Failed to fetch YouTube title via oEmbed:", titleError.message);
    }

    let text = "";
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      text = transcript.map((segment) => segment.text).join(" ");
    } catch (transcriptError) {
      console.error("Failed to fetch transcript:", transcriptError);
      return res.status(400).json({
        message: "Unable to retrieve transcripts for this video. Captions might be disabled or unavailable on this video."
      });
    }

    res.json({ title, text, videoUrl: url, videoId, thumbnail, author });
  } catch (error) {
    next(error);
  }
}
