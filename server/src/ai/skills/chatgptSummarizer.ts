import OpenAI from "openai";
import { getTicket } from "../freshdeskClient.js";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-5", not "gpt-4o" or "gpt-4". gpt-5 was released on August 7, 2025.
   Always prefer using gpt-5 as it is the latest model.
2. gpt-5 doesn't support temperature parameter, do not use it with gpt-5.
*/

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
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    model: "gpt-5",
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
