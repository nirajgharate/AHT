import { Router } from "express";
import { ask, askStream } from "../controllers/ragController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/ask", requireAuth, ask);
router.post("/ask/stream", requireAuth, askStream);

export default router;
