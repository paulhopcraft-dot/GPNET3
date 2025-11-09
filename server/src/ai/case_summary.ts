import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCaseSummary(caseData: any) {
  const prompt = `
You are a workplace rehabilitation case manager.
Write a professional, factual summary for this worker's case using these sections:
1. Case Summary – [Worker Name]
2. Where We Are Now (Claim Stage, Medical, Employment/Placement, Documentation)
3. Next Steps / Recommended Actions (group by responsible party)
4. Overall Outlook

Context:
${JSON.stringify(caseData, null, 2)}
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return completion.choices[0].message?.content ?? "Summary unavailable.";
}
