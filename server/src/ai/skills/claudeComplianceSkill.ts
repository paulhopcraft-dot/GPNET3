import { queryDocs } from "../rag_docs";
import { queryDB } from "../interrogate_sub";
import { Anthropic } from "@anthropic-ai/sdk"; // Claude SDK

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function claudeComplianceSkill(queryText: string) {
  const dbResults = await queryDB(queryText);
  const docs = await queryDocs(queryText);

  const context = `
  You are a compliance specialist.
  Base your reasoning on the Worksafe Victoria Claims Manual, WIRC Act 2013, and GPNet policy documents.
  Evaluate whether the case appears compliant, at risk, or non-compliant.
  Use these documents as evidence:
  ${docs.map((d: any) => `• ${d.title}: ${d.snippet}`).join("\n")}
  `;

  const prompt = `
  ${context}

  Question:
  "${queryText}"

  Respond in JSON:
  {
    "compliance_status": "Compliant | At Risk | Non-Compliant",
    "summary": "short reasoning (2–3 sentences)",
    "references": ["doc titles or sections used"]
  }
  `;

  const completion = await client.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 600,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const resultText = completion.content[0].text;
  return JSON.parse(resultText);
}
