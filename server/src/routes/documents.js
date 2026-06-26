import { Router } from "express";
import {
  extractText,
  getDocuments,
  deleteDocumentRoute,
  summarize,
  summarizeStream,
} from "../controllers/documentController.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/extract-text", requireAuth, upload.single("file"), extractText);
router.get("/documents", requireAuth, getDocuments);
router.delete("/documents/:id", requireAuth, deleteDocumentRoute);
router.post("/summarize", requireAuth, summarize);
router.post("/summarize/stream", requireAuth, summarizeStream);

export default router;
