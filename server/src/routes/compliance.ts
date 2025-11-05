import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();

router.post("/", async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a compliance assistant for GPNet, a worker's compensation case management system. You help analyze worker cases for compliance with Worksafe Victoria policies. Provide clear, concise guidance on compliance matters.",
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const content = response.content[0];
    const text = content.type === "text" ? content.text : "";

    res.json({ 
      response: text,
      model: response.model,
      usage: response.usage 
    });
  } catch (err) {
    console.error("Claude API error:", err);
    res.status(500).json({ 
      error: "Compliance evaluation failed",
      details: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

export default router;
