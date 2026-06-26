import { askDocument, askDocumentStream } from "../summarizer.js";
import { askSchema } from "../validators/schemas.js";

export async function ask(req, res, next) {
  try {
    const payload = askSchema.parse(req.body);
    const result = await askDocument(payload, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function askStream(req, res, next) {
  try {
    const payload = askSchema.parse(req.body);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await askDocumentStream(payload, res, req.user.id);
  } catch (error) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
}
