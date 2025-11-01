import express from "express";
import { claudeComplianceSkill } from "../ai/skills/claudeComplianceSkill";

const router = express.Router();

router.post("/", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Missing text" });

  try {
    const result = await claudeComplianceSkill(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Compliance evaluation failed" });
  }
});

export default router;
