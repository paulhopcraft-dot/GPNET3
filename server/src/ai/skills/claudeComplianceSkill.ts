// server/src/ai/skills/claudeComplianceSkill.ts

import { summarizeTicket } from "./chatgptSummarizer";
import { queryDocs } from "../rag_docs";
import { queryDB } from "../interrogate_sub";
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Evaluates case compliance using Claude.
 * - Summarises Freshdesk ticket (if provided)
 * - Pulls internal database data
 * - Pulls related policy docs
 * - Returns structured JSON with compliance status
 */
export async function claudeComplianceSkill(queryText: string, ticketId?: number) {
  try {
    // Step 1: Gather supporting data
    const [dbResults, docs] = await Promise.all([
      queryDB(queryText),
      queryDocs(queryText),
    ]);

    // Step 2: Optional ticket summarisation (ChatGPT)
    let summary = "";
    if (ticketId) {
      try {
        summary = await summarizeTicket(ticketId);
      } catch (err: any) {
        console.warn("Ticket summarisation failed:", err.message);
      }
    }

    // Step 3: Build the prompt context
    const context = `
You are a compliance specialist for Return-to-Work (RTW) cases.
Base all conclusions on the Worksafe Victoria Claims Manual, the WIRC Act 2013, and GPNet internal RTW policy standards.
Your task is to assess whether this case appears compliant, at risk, or non-compliant.

--- CASE SUMMARY (from Freshdesk ticket) ---
${summary || "No Freshdesk summary available."}

--- INTERNAL DATABASE SNAPSHOT ---
${JSON.stringify(dbResults, null, 2)}

--- SUPPORTING DOCUMENT EXTRACTS ---
${docs.map((d: any) => `• ${d.title}: ${d.snippet}`).join("\n")}
`;

    const prompt = `
${context}

Question:
"${queryText}"

Respond ONLY in valid JSON with this format:
{
  "compliance_status": "Compliant | At Risk | Non-Compliant",
  "summary": "2–3 sentences explaining reasoning",
  "references": ["policy titles or document sections used"]
}
`;

    // Step 4: Send to Claude
    const completion = await client.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    // Step 5: Parse Claude’s response
    const text = completion.content?.[0]?.text?.trim() || "";
    try {
      return JSON.parse(text);
    } catch {
      console.warn("Claude returned non-JSON text, wrapping in fallback object.");
      return {
        compliance_status: "Unknown",
        summary: text || "Unable to parse structured response.",
        references: [],
      };
    }
  } catch (err: any) {
    console.error("Claude Compliance Skill Error:", err.message);
    return {
      compliance_status: "Error",
      summary: `System error: ${err.message}`,
      references: [],
    };
  }
}
