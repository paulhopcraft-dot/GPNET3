import express from "express";
import { db } from "../db";
import { caseNotes } from "../db/caseNotes";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";
import { callClaudeSkill } from "../ai/skills/utils/claudeSkill";

const router = express.Router();

// POST /api/case/update
router.post("/", async (req, res) => {
  try {
    const { caseId, author, noteText } = req.body;
    if (!caseId || !noteText)
      return res.status(400).json({ error: "Missing caseId or noteText" });

    // 1️⃣ Save note in DB
    const [note] = await db
      .insert(caseNotes)
      .values({ caseId, author, noteText })
      .returning();

    // 2️⃣ Embed & upsert to Pinecone
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: noteText,
    });

    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.index(process.env.PINECONE_INDEX!);
    await index.upsert([
      {
        id: note.id,
        values: embedding.data[0].embedding,
        metadata: {
          caseId,
          author,
          source: "summary",
          createdAt: note.createdAt.toISOString(),
        },
      },
    ]);

    // 3️⃣ Trigger the Claude skills
    const advisor = await callClaudeSkill("GoCaseAdvisor", { caseId });
    const explainer = await callClaudeSkill("GoCaseExplainer", {
      ...advisor,
      recipient_type: "case_manager",
    });

    // 4️⃣ Mark processed & reply
    await db
      .update(caseNotes)
      .set({ processed: true })
      .where(caseNotes.id.eq(note.id));

    res.json({
      message: "Note saved and analysed.",
      advisor,
      explainer,
    });
  } catch (error) {
    console.error("Case update error:", error);
    res.status(500).json({ error: "Failed to process case update" });
  }
});

export default router;
