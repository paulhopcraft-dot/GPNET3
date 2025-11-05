import OpenAI from "openai";
import { getTicket } from "../freshdeskClient";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeTicket(ticketId: number) {
  const ticket = await getTicket(ticketId);

  // Flatten conversations
  const conversationText = ticket.conversations
    ?.map((c: any) => `${c.body_text || ""}`)
    .join("\n---\n") || "";

  const textBlock = `
  Subject: ${ticket.subject}
  Description: ${ticket.description_text}
  Conversations:
  ${conversationText}
  `;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", // fast & low-cost summarizer
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `You are a case summarization assistant. Summarize the case clearly and factually for a compliance review. Focus on medical events, worker behavior, attendance, communication, and next steps.`,
      },
      {
        role: "user",
        content: textBlock,
      },
    ],
  });

  return completion.choices[0].message.content;
}
