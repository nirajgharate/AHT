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
