import express from "express";

const router = express.Router();

/**
 * Placeholder: Voice GP endpoint.
 * No external calls; returns a canned response so the route works in dev.
 */
router.post("/", async (req, res) => {
  const { text } = req.body ?? {};
  if (!text) return res.status(400).json({ error: "Missing text" });
  return res.json({
    message: "Voice GP placeholder",
    echo: text,
    note: "Wire ElevenLabs later; keep this route stable."
  });
});

export default router;
