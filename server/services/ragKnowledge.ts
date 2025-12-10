/**
 * RAG Knowledge Service
 * Retrieval-Augmented Generation with vector embeddings and knowledge layers
 * Simulates Pinecone-style vector search with local knowledge prioritization
 */

// Knowledge layer types
export type KnowledgeLayer = "local" | "industry" | "global";

// Document types that can be indexed
export type DocumentType =
  | "policy"
  | "procedure"
  | "medical_certificate"
  | "case_note"
  | "email"
  | "transcript"
  | "checkin_response"
  | "compliance_guideline"
  | "clinical_pathway"
  | "enterprise_agreement";

// Indexed document
export interface IndexedDocument {
  id: string;
  type: DocumentType;
  layer: KnowledgeLayer;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[]; // Simulated embedding vector
  indexedAt: string;
}

export interface DocumentMetadata {
  caseId?: string;
  workerId?: string;
  company?: string;
  category?: string;
  tags?: string[];
  effectiveDate?: string;
  expiryDate?: string;
  source?: string;
  author?: string;
}

// Search result with relevance scoring
export interface SearchResult {
  document: IndexedDocument;
  score: number; // 0-1 relevance score
  matchedKeywords: string[];
  snippet: string;
  layerPriority: number; // 1=local (highest), 2=industry, 3=global
}

// RAG context for AI features
export interface RAGContext {
  query: string;
  results: SearchResult[];
  totalResults: number;
  layerBreakdown: {
    local: number;
    industry: number;
    global: number;
  };
  suggestedContext: string;
  retrievedAt: string;
}

// Knowledge base statistics
export interface KnowledgeBaseStats {
  totalDocuments: number;
  byLayer: Record<KnowledgeLayer, number>;
  byType: Record<DocumentType, number>;
  lastUpdated: string;
}

// Simulated knowledge base storage
const knowledgeBase: Map<string, IndexedDocument> = new Map();

// Pre-populate with sample knowledge documents
function initializeKnowledgeBase() {
  const sampleDocs: Omit<IndexedDocument, "id" | "embedding" | "indexedAt">[] = [
    // Local policies
    {
      type: "policy",
      layer: "local",
      title: "Apex Labour Return to Work Policy",
      content:
        "All workers injured on site must report to their supervisor within 24 hours. Modified duties must be approved by the site manager. Weekly check-ins are mandatory for workers on modified duties. Workers must provide medical certificates for any absence exceeding 3 days.",
      metadata: {
        company: "Apex Labour",
        category: "rtw_policy",
        tags: ["rtw", "reporting", "modified_duties"],
        effectiveDate: "2024-01-01",
      },
    },
    {
      type: "procedure",
      layer: "local",
      title: "Metro Construction Incident Reporting Procedure",
      content:
        "All workplace incidents must be reported using Form IR-001 within 24 hours. Serious injuries requiring medical treatment must be escalated to the Safety Manager immediately. Photos of the incident scene should be captured where safe to do so.",
      metadata: {
        company: "Metro Construction",
        category: "incident_reporting",
        tags: ["incident", "safety", "reporting"],
        effectiveDate: "2024-06-01",
      },
    },
    {
      type: "enterprise_agreement",
      layer: "local",
      title: "Harbour Logistics EBA - Injury Benefits",
      content:
        "Injured workers are entitled to income protection at 100% of pre-injury earnings for the first 13 weeks. Modified duties must provide minimum 4 hours per shift. Workers may request workplace assessment if unable to perform modified duties.",
      metadata: {
        company: "Harbour Logistics",
        category: "entitlements",
        tags: ["eba", "income_protection", "modified_duties"],
        effectiveDate: "2023-07-01",
        expiryDate: "2026-06-30",
      },
    },

    // Industry protocols
    {
      type: "clinical_pathway",
      layer: "industry",
      title: "WorkSafe Victoria - Musculoskeletal Injury Management",
      content:
        "Initial assessment within 48 hours of injury. GP to provide certificate of capacity. Physiotherapy recommended for soft tissue injuries within first week. Graduated return to work typically begins 2-4 weeks post-injury for minor strains. Regular reviews at 4, 8, and 12 weeks.",
      metadata: {
        category: "clinical_pathway",
        tags: ["musculoskeletal", "rtw", "physiotherapy"],
        source: "WorkSafe Victoria",
      },
    },
    {
      type: "clinical_pathway",
      layer: "industry",
      title: "Psychological Injury Management Protocol",
      content:
        "Initial GP assessment required. Referral to psychologist/psychiatrist within 2 weeks for moderate-severe presentations. Regular mental health reviews every 4 weeks. RTW planning should consider workplace stressors and may require workplace modifications. Minimum 6-month support period recommended.",
      metadata: {
        category: "clinical_pathway",
        tags: ["psychological", "mental_health", "rtw"],
        source: "WorkSafe Victoria",
      },
    },
    {
      type: "compliance_guideline",
      layer: "industry",
      title: "Certificate of Capacity Requirements",
      content:
        "Medical certificates must specify work capacity (fit, unfit, or modified duties). Certificates must include review date. Maximum validity period is 28 days. Restrictions and limitations must be clearly stated. Treating practitioner must be registered.",
      metadata: {
        category: "compliance",
        tags: ["certificate", "capacity", "requirements"],
        source: "WorkSafe Victoria",
      },
    },
    {
      type: "procedure",
      layer: "industry",
      title: "Late Claim Notification Guidelines",
      content:
        "Claims lodged more than 30 days after injury require explanation. Documentation of reasons for delay should be obtained. Late claims may still be accepted with valid reasons such as delayed symptom onset, worker unawareness of entitlements, or employer failure to provide forms.",
      metadata: {
        category: "claims",
        tags: ["late_claim", "notification", "compliance"],
        source: "WorkSafe Victoria",
      },
    },

    // Global knowledge
    {
      type: "policy",
      layer: "global",
      title: "General RTW Principles",
      content:
        "Early intervention improves outcomes. Communication between all parties is essential. Graduated return is preferable to sudden full duties. Worker input in RTW planning increases success. Regular monitoring and adjustment of plans improves outcomes.",
      metadata: {
        category: "best_practice",
        tags: ["rtw", "principles", "evidence_based"],
        source: "International Labour Organization",
      },
    },
    {
      type: "policy",
      layer: "global",
      title: "Chronic Pain Management Overview",
      content:
        "Chronic pain requires multidisciplinary approach. Psychological support is essential alongside physical treatment. Pain education and self-management strategies improve outcomes. Opioid dependence risks should be monitored. Activity pacing and graded exercise are evidence-based approaches.",
      metadata: {
        category: "clinical",
        tags: ["chronic_pain", "treatment", "multidisciplinary"],
        source: "WHO Guidelines",
      },
    },
    {
      type: "policy",
      layer: "global",
      title: "Workplace Mental Health Best Practices",
      content:
        "Supportive workplace culture reduces mental health claim duration. Manager training in mental health awareness is beneficial. Flexible work arrangements support recovery. Stigma reduction programs improve outcomes. Employee assistance programs should be accessible.",
      metadata: {
        category: "mental_health",
        tags: ["workplace", "mental_health", "support"],
        source: "WHO Healthy Workplace Framework",
      },
    },
  ];

  sampleDocs.forEach((doc, index) => {
    const id = `DOC-${String(index + 1).padStart(4, "0")}`;
    knowledgeBase.set(id, {
      ...doc,
      id,
      embedding: generateMockEmbedding(doc.content),
      indexedAt: new Date().toISOString(),
    });
  });
}

// Initialize on module load
initializeKnowledgeBase();

/**
 * Generate a mock embedding vector (in real system, would use OpenAI/Cohere embeddings)
 */
function generateMockEmbedding(text: string): number[] {
  // Generate deterministic pseudo-embedding based on text content
  const words = text.toLowerCase().split(/\s+/);
  const embedding: number[] = [];

  // Create 128-dimensional mock embedding
  for (let i = 0; i < 128; i++) {
    let value = 0;
    for (let j = 0; j < words.length; j++) {
      value += words[j].charCodeAt(j % words[j].length) * ((i + j) % 17) * 0.001;
    }
    embedding.push(Math.sin(value) * 0.5 + 0.5); // Normalize to 0-1
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract keywords from text for matching
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "this", "that",
    "these", "those", "i", "you", "he", "she", "it", "we", "they",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .slice(0, 20);
}

/**
 * Create a snippet from content around matched keywords
 */
function createSnippet(content: string, keywords: string[], maxLength: number = 200): string {
  const lowerContent = content.toLowerCase();

  // Find first keyword occurrence
  for (const keyword of keywords) {
    const index = lowerContent.indexOf(keyword);
    if (index >= 0) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + maxLength - 50);
      let snippet = content.slice(start, end);

      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";

      return snippet;
    }
  }

  // No keyword match, return start of content
  return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
}

/**
 * Get layer priority (lower = higher priority)
 */
function getLayerPriority(layer: KnowledgeLayer): number {
  switch (layer) {
    case "local":
      return 1;
    case "industry":
      return 2;
    case "global":
      return 3;
    default:
      return 3;
  }
}

/**
 * Index a new document into the knowledge base
 */
export function indexDocument(
  type: DocumentType,
  layer: KnowledgeLayer,
  title: string,
  content: string,
  metadata: DocumentMetadata = {}
): IndexedDocument {
  const id = `DOC-${Date.now().toString(36).toUpperCase()}`;
  const doc: IndexedDocument = {
    id,
    type,
    layer,
    title,
    content,
    metadata,
    embedding: generateMockEmbedding(content),
    indexedAt: new Date().toISOString(),
  };

  knowledgeBase.set(id, doc);
  return doc;
}

/**
 * Search the knowledge base
 */
export function searchKnowledge(
  query: string,
  options: {
    limit?: number;
    layers?: KnowledgeLayer[];
    types?: DocumentType[];
    company?: string;
    tags?: string[];
    minScore?: number;
  } = {}
): SearchResult[] {
  const {
    limit = 10,
    layers,
    types,
    company,
    tags,
    minScore = 0.3,
  } = options;

  const queryKeywords = extractKeywords(query);
  const queryEmbedding = generateMockEmbedding(query);
  const results: SearchResult[] = [];

  for (const doc of knowledgeBase.values()) {
    // Filter by layer
    if (layers && !layers.includes(doc.layer)) continue;

    // Filter by type
    if (types && !types.includes(doc.type)) continue;

    // Filter by company (for local docs)
    if (company && doc.metadata.company && doc.metadata.company !== company) continue;

    // Filter by tags
    if (tags && tags.length > 0) {
      const docTags = doc.metadata.tags || [];
      if (!tags.some((t) => docTags.includes(t))) continue;
    }

    // Calculate relevance score
    const embeddingScore = doc.embedding
      ? cosineSimilarity(queryEmbedding, doc.embedding)
      : 0;

    // Keyword matching boost
    const docKeywords = extractKeywords(doc.title + " " + doc.content);
    const matchedKeywords = queryKeywords.filter((kw) =>
      docKeywords.some((dk) => dk.includes(kw) || kw.includes(dk))
    );
    const keywordBoost = matchedKeywords.length * 0.1;

    // Layer priority boost (local gets slight boost)
    const layerBoost = doc.layer === "local" ? 0.1 : doc.layer === "industry" ? 0.05 : 0;

    const score = Math.min(1, embeddingScore + keywordBoost + layerBoost);

    if (score >= minScore) {
      results.push({
        document: doc,
        score,
        matchedKeywords,
        snippet: createSnippet(doc.content, matchedKeywords),
        layerPriority: getLayerPriority(doc.layer),
      });
    }
  }

  // Sort by layer priority first, then by score
  results.sort((a, b) => {
    if (a.layerPriority !== b.layerPriority) {
      return a.layerPriority - b.layerPriority;
    }
    return b.score - a.score;
  });

  return results.slice(0, limit);
}

/**
 * Get RAG context for AI features
 */
export function getRAGContext(
  query: string,
  options: {
    limit?: number;
    company?: string;
    caseContext?: {
      injuryType?: string;
      workStatus?: string;
      riskLevel?: string;
    };
  } = {}
): RAGContext {
  const { limit = 5, company, caseContext } = options;

  // Enhance query with case context
  let enhancedQuery = query;
  if (caseContext) {
    if (caseContext.injuryType) enhancedQuery += ` ${caseContext.injuryType}`;
    if (caseContext.workStatus) enhancedQuery += ` ${caseContext.workStatus}`;
  }

  // Search with company filter for local docs
  const results = searchKnowledge(enhancedQuery, {
    limit,
    company,
    minScore: 0.25,
  });

  // Count by layer
  const layerBreakdown = {
    local: results.filter((r) => r.document.layer === "local").length,
    industry: results.filter((r) => r.document.layer === "industry").length,
    global: results.filter((r) => r.document.layer === "global").length,
  };

  // Generate suggested context for AI
  const contextParts: string[] = [];

  // Add local context first (highest priority)
  const localDocs = results.filter((r) => r.document.layer === "local");
  if (localDocs.length > 0) {
    contextParts.push("Organisation-specific guidance:");
    localDocs.forEach((r) => {
      contextParts.push(`- ${r.document.title}: ${r.snippet}`);
    });
  }

  // Add industry context
  const industryDocs = results.filter((r) => r.document.layer === "industry");
  if (industryDocs.length > 0) {
    contextParts.push("\nIndustry protocols:");
    industryDocs.forEach((r) => {
      contextParts.push(`- ${r.document.title}: ${r.snippet}`);
    });
  }

  // Add global context if needed
  const globalDocs = results.filter((r) => r.document.layer === "global");
  if (globalDocs.length > 0 && localDocs.length + industryDocs.length < 3) {
    contextParts.push("\nGeneral best practices:");
    globalDocs.forEach((r) => {
      contextParts.push(`- ${r.document.title}: ${r.snippet}`);
    });
  }

  return {
    query,
    results,
    totalResults: results.length,
    layerBreakdown,
    suggestedContext: contextParts.join("\n"),
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Get document by ID
 */
export function getDocument(id: string): IndexedDocument | null {
  return knowledgeBase.get(id) || null;
}

/**
 * Update document
 */
export function updateDocument(
  id: string,
  updates: Partial<Omit<IndexedDocument, "id" | "embedding" | "indexedAt">>
): IndexedDocument | null {
  const doc = knowledgeBase.get(id);
  if (!doc) return null;

  const updated: IndexedDocument = {
    ...doc,
    ...updates,
    embedding:
      updates.content ? generateMockEmbedding(updates.content) : doc.embedding,
    indexedAt: new Date().toISOString(),
  };

  knowledgeBase.set(id, updated);
  return updated;
}

/**
 * Delete document
 */
export function deleteDocument(id: string): boolean {
  return knowledgeBase.delete(id);
}

/**
 * Get knowledge base statistics
 */
export function getKnowledgeBaseStats(): KnowledgeBaseStats {
  const stats: KnowledgeBaseStats = {
    totalDocuments: knowledgeBase.size,
    byLayer: { local: 0, industry: 0, global: 0 },
    byType: {} as Record<DocumentType, number>,
    lastUpdated: new Date().toISOString(),
  };

  for (const doc of knowledgeBase.values()) {
    stats.byLayer[doc.layer]++;
    stats.byType[doc.type] = (stats.byType[doc.type] || 0) + 1;
  }

  return stats;
}

/**
 * List all documents with optional filters
 */
export function listDocuments(options: {
  layer?: KnowledgeLayer;
  type?: DocumentType;
  company?: string;
  limit?: number;
  offset?: number;
} = {}): { documents: IndexedDocument[]; total: number } {
  const { layer, type, company, limit = 50, offset = 0 } = options;

  let docs = Array.from(knowledgeBase.values());

  if (layer) docs = docs.filter((d) => d.layer === layer);
  if (type) docs = docs.filter((d) => d.type === type);
  if (company) docs = docs.filter((d) => d.metadata.company === company);

  return {
    documents: docs.slice(offset, offset + limit),
    total: docs.length,
  };
}

/**
 * Find similar documents
 */
export function findSimilarDocuments(documentId: string, limit: number = 5): SearchResult[] {
  const sourceDoc = knowledgeBase.get(documentId);
  if (!sourceDoc) return [];

  // Use document content as query
  return searchKnowledge(sourceDoc.content, {
    limit: limit + 1, // +1 to exclude self
    minScore: 0.4,
  }).filter((r) => r.document.id !== documentId);
}

/**
 * Get relevant knowledge for a case
 */
export function getCaseRelevantKnowledge(
  caseData: {
    company: string;
    injuryType?: string;
    diagnosis?: string;
    workStatus?: string;
    riskLevel?: string;
  },
  limit: number = 8
): RAGContext {
  // Build query from case characteristics
  const queryParts: string[] = [];

  if (caseData.injuryType) queryParts.push(caseData.injuryType);
  if (caseData.diagnosis) queryParts.push(caseData.diagnosis);
  if (caseData.workStatus) queryParts.push(`work status ${caseData.workStatus}`);
  if (caseData.riskLevel === "high") queryParts.push("high risk case management");

  // Default query if no specific context
  if (queryParts.length === 0) {
    queryParts.push("return to work injury management");
  }

  return getRAGContext(queryParts.join(" "), {
    limit,
    company: caseData.company,
    caseContext: {
      injuryType: caseData.injuryType,
      workStatus: caseData.workStatus,
      riskLevel: caseData.riskLevel,
    },
  });
}
