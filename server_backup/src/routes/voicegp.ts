// Voice route placeholder (disabled). No external calls are made.
import express from "express";
import { queryDB } from "../ai/interrogate_sub";
import { queryDocs } from "../ai/rag_docs";
// import { OpenAI } from "openai"; // disabled

const router = express.Router();

router.post("/", async (req, res) => {
  const { text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "Missing text" });

  const db = await queryDB(text);
  const docs = await queryDocs(text);

  // Synthesize a simple, local-only response so the route works
  const answer = [
    "1. (AI disabled) No external reasoning performed.",
    "2. DB results available: " + db.length,
    "3. Doc results available: " + docs.length,
    "4. Enable ChatGPT/ElevenLabs later to speak answers."
  ].join("\n");

  return res.json({ answer, db, docs });
});

export default router;
