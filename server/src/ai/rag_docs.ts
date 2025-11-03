import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

const pineconeApiKey = process.env.PINECONE_API_KEY;
const pineconeIndexName = process.env.PINECONE_INDEX_NAME;
const openaiApiKey = process.env.OPENAI_API_KEY;

let pinecone: Pinecone | null = null;
let openai: OpenAI | null = null;

function initializePinecone() {
  if (!pineconeApiKey || !pineconeIndexName) {
    console.warn("Pinecone not configured - PINECONE_API_KEY or PINECONE_INDEX_NAME missing");
    return false;
  }
  
  if (!openaiApiKey) {
    console.warn("OpenAI not configured - OPENAI_API_KEY missing for embeddings");
    return false;
  }

  if (!pinecone) {
    pinecone = new Pinecone({ apiKey: pineconeApiKey });
    console.log(`Pinecone initialized with index: ${pineconeIndexName}`);
  }

  if (!openai) {
    openai = new OpenAI({ apiKey: openaiApiKey });
    console.log("OpenAI initialized for embeddings");
  }

  return true;
}

export async function queryDocs(q: string): Promise<Array<{ text: string; score: number; metadata?: any }>> {
  if (!initializePinecone() || !pinecone || !openai) {
    console.warn("RAG search disabled - missing configuration");
    return [];
  }

  try {
    // Create embedding for the query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: q,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Query Pinecone for similar documents
    const index = pinecone.index(pineconeIndexName!);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    // Format results
    const results = queryResponse.matches.map(match => ({
      text: (match.metadata?.text as string) || "",
      score: match.score || 0,
      metadata: match.metadata,
    }));

    console.log(`Found ${results.length} relevant documents for query: "${q.substring(0, 50)}..."`);
    return results;
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    return [];
  }
}
