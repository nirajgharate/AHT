import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
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
    let transcriptError = false;
    try {
      text = await fetchTranscript(videoId);
    } catch (transcriptErrorDetail) {
      console.warn("Failed to fetch transcript, falling back to empty text:", transcriptErrorDetail.message);
      transcriptError = true;
    }

    res.json({ title, text, videoUrl: url, videoId, thumbnail, author, transcriptError });
  } catch (error) {
    next(error);
  }
}

async function fetchTranscript(videoId) {
  // 1. Try InnerTube API first (fast and lightweight)
  try {
    const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '20.10.38',
          },
        },
        videoId: videoId,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        return await downloadXmlTranscript(captionTracks[0].baseUrl);
      }
    }
  } catch (err) {
    console.warn("InnerTube API transcript fetch warning:", err.message);
  }

  // 2. Fallback to HTML watch page scraping
  try {
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to load page: status ${resp.status}`);
    }

    const html = await resp.text();
    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (match) {
      const captionTracks = JSON.parse(match[1]);
      if (Array.isArray(captionTracks) && captionTracks.length > 0) {
        return await downloadXmlTranscript(captionTracks[0].baseUrl);
      }
    }
    throw new Error("No caption tracks found in page source.");
  } catch (err) {
    console.warn("HTML Page Scraping transcript fetch warning:", err.message);
  }

  throw new Error("All transcript fetch methods failed.");
}

async function downloadXmlTranscript(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download transcript XML: status ${resp.status}`);
  }
  const xmlText = await resp.text();
  
  // Match both srv1 <text> and srv3 <p> timedtext tags
  const regex = /<(text|p)[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  const segments = [];
  while ((match = regex.exec(xmlText)) !== null) {
    let content = match[2];
    
    // Strip any nested formatting tags
    content = content.replace(/<[^>]+>/g, '');

    const text = content
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
      
    if (text.trim()) {
      segments.push(text.trim());
    }
  }
  return segments.join(" ");
}
