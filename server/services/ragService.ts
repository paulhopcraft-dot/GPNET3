/**
 * Pinecone RAG Service (PRD-9, Spec-11)
 *
 * Retrieval-Augmented Generation for case intelligence.
 * Implements three-tier knowledge hierarchy:
 * - Local: Organization-specific policies
 * - Industry: WorkSafe Victoria compliance, RTW protocols
 * - Global: General medical/case management knowledge
 *
 * Per PRD-9: Advisory only, explainable outputs, no autonomous decisions
 */

import Anthropic from "@anthropic-ai/sdk";

// Types for RAG operations
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    source: string;
    knowledgeLayer: "local" | "industry" | "global";
    organizationId?: string;
    documentType?: string;
    section?: string;
    createdAt: string;
  };
  embedding?: number[];
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  knowledgeLayer: "local" | "industry" | "global";
}

export interface RAGQuery {
  query: string;
  organizationId?: string;
  caseContext?: Record<string, unknown>;
  topK?: number;
  minScore?: number;
  knowledgeLayers?: Array<"local" | "industry" | "global">;
}

export interface RAGResponse {
  answer: string;
  sources: RetrievalResult[];
  knowledgeLayersUsed: string[];
  confidence: number;
  advisory: true; // Always true per PRD-9
}

// In-memory document store (Pinecone integration placeholder)
// In production, this would connect to Pinecone
const documentStore: Map<string, DocumentChunk> = new Map();

// Pre-loaded industry knowledge for WorkSafe Victoria
const INDUSTRY_KNOWLEDGE: DocumentChunk[] = [
  {
    id: "worksafe-rtw-1",
    text: "Return to work obligations: Employers must provide suitable employment where available. The employer must consult with the worker and treating health practitioner about suitable duties.",
    metadata: {
      source: "WorkSafe Victoria RTW Guidelines",
      knowledgeLayer: "industry",
      documentType: "regulation",
      section: "RTW Obligations",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "worksafe-cert-1",
    text: "Medical certificates must be provided within 10 days of incapacity. Certificates should specify work capacity, restrictions, and expected duration.",
    metadata: {
      source: "WorkSafe Victoria Certificate Requirements",
      knowledgeLayer: "industry",
      documentType: "regulation",
      section: "Medical Certificates",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "worksafe-compliance-1",
    text: "Employers must maintain contact with injured workers at least weekly during the first 13 weeks, and fortnightly thereafter. All contacts must be documented.",
    metadata: {
      source: "WorkSafe Victoria Compliance Guidelines",
      knowledgeLayer: "industry",
      documentType: "regulation",
      section: "Employer Obligations",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "worksafe-termination-1",
    text: "Termination of employment during a WorkCover claim requires consultation with the insurer and must follow the pre-termination meeting process. Workers must be given opportunity to respond.",
    metadata: {
      source: "WorkSafe Victoria Termination Guidelines",
      knowledgeLayer: "industry",
      documentType: "regulation",
      section: "Employment Termination",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "worksafe-dispute-1",
    text: "Disputes about work capacity or suitable duties should be referred to conciliation. Evidence must be locked and preserved when a dispute is lodged.",
    metadata: {
      source: "WorkSafe Victoria Dispute Resolution",
      knowledgeLayer: "industry",
      documentType: "regulation",
      section: "Disputes",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "rtw-protocol-1",
    text: "Best practice RTW planning includes: gradual hours increase, modified duties matching capacity, regular review with treating practitioner, and documented host site arrangements.",
    metadata: {
      source: "RTW Best Practices",
      knowledgeLayer: "industry",
      documentType: "protocol",
      section: "RTW Planning",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "clinical-pathway-1",
    text: "Soft tissue injuries typically progress through acute (0-2 weeks), sub-acute (2-6 weeks), and chronic (6+ weeks) phases. Early intervention improves outcomes.",
    metadata: {
      source: "Clinical Pathways - Musculoskeletal",
      knowledgeLayer: "industry",
      documentType: "clinical",
      section: "Injury Phases",
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: "clinical-pathway-2",
    text: "Psychological injuries require specialized assessment. Key indicators include: prolonged absence, multiple stressors, and lack of improvement with standard interventions.",
    metadata: {
      source: "Clinical Pathways - Psychological",
      knowledgeLayer: "industry",
      documentType: "clinical",
      section: "Psychological Injuries",
      createdAt: new Date().toISOString(),
    },
  },
];

// Initialize with industry knowledge
INDUSTRY_KNOWLEDGE.forEach((chunk) => {
  documentStore.set(chunk.id, chunk);
});

class PineconeRAGService {
  private anthropic: Anthropic | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeIfConfigured();
  }

  private initializeIfConfigured(): void {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.isConfigured = true;
    }
  }

  /**
   * Check if RAG service is configured
   */
  getStatus(): { configured: boolean; documentsLoaded: number; knowledgeLayers: string[] } {
    return {
      configured: this.isConfigured,
      documentsLoaded: documentStore.size,
      knowledgeLayers: ["local", "industry", "global"],
    };
  }

  /**
   * Simple text similarity using keyword matching
   * In production, this would use Pinecone vector similarity
   */
  private calculateSimilarity(query: string, text: string): number {
    const queryWords = new Set(
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const textWords = text.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of textWords) {
      if (queryWords.has(word)) {
        matches++;
      }
    }

    return queryWords.size > 0 ? matches / queryWords.size : 0;
  }

  /**
   * Retrieve relevant documents based on query
   */
  async retrieve(params: RAGQuery): Promise<RetrievalResult[]> {
    const {
      query,
      organizationId,
      topK = 5,
      minScore = 0.1,
      knowledgeLayers = ["local", "industry", "global"],
    } = params;

    const results: RetrievalResult[] = [];

    for (const [, chunk] of documentStore) {
      // Filter by knowledge layer
      if (!knowledgeLayers.includes(chunk.metadata.knowledgeLayer)) {
        continue;
      }

      // Filter local documents by organization
      if (
        chunk.metadata.knowledgeLayer === "local" &&
        organizationId &&
        chunk.metadata.organizationId !== organizationId
      ) {
        continue;
      }

      const score = this.calculateSimilarity(query, chunk.text);

      if (score >= minScore) {
        results.push({
          chunk,
          score,
          knowledgeLayer: chunk.metadata.knowledgeLayer,
        });
      }
    }

    // Sort by knowledge layer priority (local > industry > global), then by score
    const layerPriority = { local: 0, industry: 1, global: 2 };
    results.sort((a, b) => {
      const layerDiff = layerPriority[a.knowledgeLayer] - layerPriority[b.knowledgeLayer];
      if (layerDiff !== 0) return layerDiff;
      return b.score - a.score;
    });

    return results.slice(0, topK);
  }

  /**
   * Generate RAG-enhanced response
   */
  async query(params: RAGQuery): Promise<RAGResponse> {
    const { query, caseContext } = params;

    // Retrieve relevant documents
    const retrievedDocs = await this.retrieve(params);

    // Build context from retrieved documents
    const contextParts = retrievedDocs.map(
      (r) =>
        `[${r.chunk.metadata.source}] (${r.chunk.metadata.knowledgeLayer}): ${r.chunk.text}`
    );

    const knowledgeLayersUsed = [...new Set(retrievedDocs.map((r) => r.knowledgeLayer))];

    // If no Anthropic API key, return retrieval-only response
    if (!this.anthropic) {
      return {
        answer: contextParts.join("\n\n") || "No relevant information found.",
        sources: retrievedDocs,
        knowledgeLayersUsed,
        confidence: retrievedDocs.length > 0 ? 0.6 : 0.2,
        advisory: true,
      };
    }

    // Generate response using Claude
    try {
      const systemPrompt = `You are a case intelligence assistant for GPNet, a workers' compensation case management system.
You provide ADVISORY guidance only - never make autonomous decisions.
Your responses should be explainable and cite sources when available.

Knowledge context (prioritized by layer - local > industry > global):
${contextParts.join("\n\n")}

${caseContext ? `Case context: ${JSON.stringify(caseContext)}` : ""}

Guidelines:
- Cite which knowledge layer informed your response
- Be clear about confidence levels
- Always emphasize that final decisions rest with humans
- Reference WorkSafe Victoria requirements when applicable`;

      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: query }],
      });

      const content = response.content[0];
      const answer = content.type === "text" ? content.text : "Unable to generate response.";

      // Calculate confidence based on retrieval quality
      const avgScore =
        retrievedDocs.length > 0
          ? retrievedDocs.reduce((sum, r) => sum + r.score, 0) / retrievedDocs.length
          : 0;
      const confidence = Math.min(0.95, 0.5 + avgScore * 0.5);

      return {
        answer,
        sources: retrievedDocs,
        knowledgeLayersUsed,
        confidence,
        advisory: true,
      };
    } catch (error) {
      console.error("[RAG Service] Error generating response:", error);
      return {
        answer: "Unable to generate AI response. Retrieved documents:\n\n" + contextParts.join("\n\n"),
        sources: retrievedDocs,
        knowledgeLayersUsed,
        confidence: 0.4,
        advisory: true,
      };
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(chunk: Omit<DocumentChunk, "embedding">): Promise<void> {
    // In production, this would embed and store in Pinecone
    documentStore.set(chunk.id, chunk as DocumentChunk);
    console.log(`[RAG Service] Added document: ${chunk.id} (${chunk.metadata.knowledgeLayer})`);
  }

  /**
   * Add organization-specific knowledge
   */
  async addLocalKnowledge(
    organizationId: string,
    document: {
      id: string;
      text: string;
      documentType: string;
      section?: string;
    }
  ): Promise<void> {
    await this.addDocument({
      id: `local-${organizationId}-${document.id}`,
      text: document.text,
      metadata: {
        source: `Organization Policy: ${document.documentType}`,
        knowledgeLayer: "local",
        organizationId,
        documentType: document.documentType,
        section: document.section,
        createdAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Get documents by knowledge layer
   */
  getDocumentsByLayer(layer: "local" | "industry" | "global"): DocumentChunk[] {
    const docs: DocumentChunk[] = [];
    for (const [, chunk] of documentStore) {
      if (chunk.metadata.knowledgeLayer === layer) {
        docs.push(chunk);
      }
    }
    return docs;
  }

  /**
   * Query for case-specific guidance
   */
  async getCaseGuidance(
    caseId: string,
    question: string,
    caseData: Record<string, unknown>
  ): Promise<RAGResponse> {
    const organizationId = caseData.organizationId as string | undefined;

    return this.query({
      query: question,
      organizationId,
      caseContext: {
        caseId,
        ...caseData,
      },
      topK: 5,
      minScore: 0.1,
      knowledgeLayers: ["local", "industry", "global"],
    });
  }
}

// Export singleton instance
export const ragService = new PineconeRAGService();
