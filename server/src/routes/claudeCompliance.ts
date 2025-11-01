import express from "express";
import { queryDB } from "../ai/interrogate_sub";
import { queryDocs } from "../ai/rag_docs";
// import Anthropic from "@anthropic-ai/sdk"; // keep commented until you add your key

const router = express.Router();

router.post("/", async (req, res) => {
  const { caseId, question } = req.body;

  // --- 1️⃣  Get case data from your DB ---
  const dbData = await queryDB(`SELECT * FROM worker_cases WHERE id='${caseId}'`);

  // --- 2️⃣  Retrieve relevant policy excerpts ---
  const docs = await queryDocs(question);

  // --- 3️⃣  Placeholder output (Claude disabled) ---
  const compliance = [
    `Case ${caseId}: (Claude disabled) Compliance review placeholder.`,
    `Question: ${question}`,
    `Fetched ${dbData.length} case records, ${docs.length} related policy excerpts.`,
    `Enable Claude later for full analysis.`
  ].join("\n");

  res.json({ compliance, dbData, docs });
});

export default router;