import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateCaseSummary(caseData: any) {
  const prompt = `
You are a workplace rehabilitation case manager for GPNet.
Write a professional, factual summary for this worker's case using these sections:
1. Case Summary – Brief overview of the injury and situation
2. Where We Are Now – Current recovery status, claim stage, and work capacity
3. Next Steps / Recommended Actions – Immediate actions needed (group by responsible party)
4. Overall Outlook – Expected timeline and key compliance considerations

Context:
${JSON.stringify(caseData, null, 2)}

Keep it concise and actionable. Use 2-3 sentences per section.
`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  return content.type === "text" ? content.text : "Summary unavailable.";
}
