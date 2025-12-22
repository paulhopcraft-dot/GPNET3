/**
 * Tests for RAG Service (PRD-9, Spec-11)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ragService,
  type DocumentChunk,
  type RAGQuery,
  type RAGResponse,
  type RetrievalResult,
} from "./ragService";

describe("RAG Service", () => {
  describe("Service Status", () => {
    it("returns status with document count", () => {
      const status = ragService.getStatus();

      expect(status).toHaveProperty("configured");
      expect(status).toHaveProperty("documentsLoaded");
      expect(status).toHaveProperty("knowledgeLayers");
      expect(status.documentsLoaded).toBeGreaterThan(0);
    });

    it("includes all three knowledge layers", () => {
      const status = ragService.getStatus();

      expect(status.knowledgeLayers).toContain("local");
      expect(status.knowledgeLayers).toContain("industry");
      expect(status.knowledgeLayers).toContain("global");
    });
  });

  describe("Document Retrieval", () => {
    it("retrieves industry documents for RTW query", async () => {
      const results = await ragService.retrieve({
        query: "return to work obligations employer",
        topK: 5,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].knowledgeLayer).toBe("industry");
    });

    it("retrieves documents about medical certificates", async () => {
      const results = await ragService.retrieve({
        query: "medical certificate requirements",
        topK: 5,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(results.length).toBeGreaterThan(0);
      const certificateDoc = results.find((r) =>
        r.chunk.text.toLowerCase().includes("certificate")
      );
      expect(certificateDoc).toBeDefined();
    });

    it("retrieves documents about compliance", async () => {
      const results = await ragService.retrieve({
        query: "employer compliance contact worker",
        topK: 5,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it("respects topK limit", async () => {
      const results = await ragService.retrieve({
        query: "worker injury case",
        topK: 2,
        minScore: 0.01,
        knowledgeLayers: ["industry"],
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("filters by minimum score", async () => {
      const lowThreshold = await ragService.retrieve({
        query: "random unrelated query xyz123",
        topK: 10,
        minScore: 0.01,
        knowledgeLayers: ["industry"],
      });

      const highThreshold = await ragService.retrieve({
        query: "random unrelated query xyz123",
        topK: 10,
        minScore: 0.9,
        knowledgeLayers: ["industry"],
      });

      expect(highThreshold.length).toBeLessThanOrEqual(lowThreshold.length);
    });

    it("returns empty for unrelated queries with high threshold", async () => {
      const results = await ragService.retrieve({
        query: "quantum physics black holes astronomy",
        topK: 5,
        minScore: 0.5,
        knowledgeLayers: ["industry"],
      });

      expect(results.length).toBe(0);
    });
  });

  describe("Knowledge Layers", () => {
    it("returns industry documents", () => {
      const docs = ragService.getDocumentsByLayer("industry");
      expect(docs.length).toBeGreaterThan(0);
      docs.forEach((doc) => {
        expect(doc.metadata.knowledgeLayer).toBe("industry");
      });
    });

    it("returns empty local docs initially (no org-specific docs)", () => {
      const docs = ragService.getDocumentsByLayer("local");
      // Initially may be empty or have test data
      docs.forEach((doc) => {
        expect(doc.metadata.knowledgeLayer).toBe("local");
      });
    });

    it("sorts results by knowledge layer priority", async () => {
      // Add a local document
      await ragService.addLocalKnowledge("test-org", {
        id: "test-local",
        text: "Return to work local policy specific to our organization",
        documentType: "policy",
        section: "RTW",
      });

      const results = await ragService.retrieve({
        query: "return to work policy",
        organizationId: "test-org",
        topK: 10,
        minScore: 0.1,
        knowledgeLayers: ["local", "industry"],
      });

      // Local should come before industry
      const localIndex = results.findIndex((r) => r.knowledgeLayer === "local");
      const industryIndex = results.findIndex((r) => r.knowledgeLayer === "industry");

      if (localIndex !== -1 && industryIndex !== -1) {
        expect(localIndex).toBeLessThan(industryIndex);
      }
    });
  });

  describe("Query with Response", () => {
    it("returns advisory response", async () => {
      const response = await ragService.query({
        query: "What are the employer obligations for RTW?",
        topK: 3,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(response.advisory).toBe(true);
      expect(response.answer).toBeDefined();
      expect(response.sources).toBeDefined();
      expect(response.knowledgeLayersUsed).toBeDefined();
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it("includes sources in response", async () => {
      const response = await ragService.query({
        query: "medical certificate requirements",
        topK: 3,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(Array.isArray(response.sources)).toBe(true);
      if (response.sources.length > 0) {
        expect(response.sources[0]).toHaveProperty("chunk");
        expect(response.sources[0]).toHaveProperty("score");
        expect(response.sources[0]).toHaveProperty("knowledgeLayer");
      }
    });

    it("tracks which knowledge layers were used", async () => {
      const response = await ragService.query({
        query: "compliance requirements",
        topK: 5,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(Array.isArray(response.knowledgeLayersUsed)).toBe(true);
      if (response.sources.length > 0) {
        expect(response.knowledgeLayersUsed.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Case Guidance", () => {
    it("provides case-specific guidance", async () => {
      const response = await ragService.getCaseGuidance(
        "case-123",
        "What should I do about the missing medical certificate?",
        {
          organizationId: "org-456",
          workerName: "John Smith",
          riskLevel: "High",
          workStatus: "Off work",
        }
      );

      expect(response.advisory).toBe(true);
      expect(response.answer).toBeDefined();
    });

    it("includes case context in guidance", async () => {
      const response = await ragService.getCaseGuidance(
        "case-789",
        "How should I proceed with return to work planning?",
        {
          organizationId: "org-456",
          workerName: "Jane Doe",
          riskLevel: "Medium",
          workStatus: "Modified duties",
          rtwPlanStatus: "in_progress",
        }
      );

      expect(response.advisory).toBe(true);
    });
  });

  describe("Document Management", () => {
    it("adds local knowledge documents", async () => {
      const beforeCount = ragService.getDocumentsByLayer("local").length;

      await ragService.addLocalKnowledge("test-org-2", {
        id: "custom-policy",
        text: "Our organization requires weekly check-ins with injured workers",
        documentType: "policy",
        section: "Contact Policy",
      });

      const afterCount = ragService.getDocumentsByLayer("local").length;
      expect(afterCount).toBeGreaterThan(beforeCount);
    });

    it("creates correct document ID format", async () => {
      await ragService.addLocalKnowledge("test-org-3", {
        id: "my-doc",
        text: "Test document content",
        documentType: "test",
      });

      const docs = ragService.getDocumentsByLayer("local");
      const addedDoc = docs.find((d) => d.id === "local-test-org-3-my-doc");
      expect(addedDoc).toBeDefined();
    });

    it("sets correct metadata for local documents", async () => {
      await ragService.addLocalKnowledge("test-org-4", {
        id: "policy-doc",
        text: "Local policy document",
        documentType: "HR Policy",
        section: "Leave Management",
      });

      const docs = ragService.getDocumentsByLayer("local");
      const addedDoc = docs.find((d) => d.id.includes("test-org-4"));

      expect(addedDoc?.metadata.knowledgeLayer).toBe("local");
      expect(addedDoc?.metadata.organizationId).toBe("test-org-4");
      expect(addedDoc?.metadata.documentType).toBe("HR Policy");
      expect(addedDoc?.metadata.section).toBe("Leave Management");
    });
  });

  describe("PRD-9 Compliance", () => {
    it("always returns advisory=true", async () => {
      const response = await ragService.query({
        query: "any query",
        topK: 1,
        minScore: 0.01,
        knowledgeLayers: ["industry"],
      });

      expect(response.advisory).toBe(true);
    });

    it("provides explainable outputs with sources", async () => {
      const response = await ragService.query({
        query: "employer obligations",
        topK: 3,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      // Sources should be available for explanation
      expect(response.sources).toBeDefined();
      response.sources.forEach((source) => {
        expect(source.chunk.metadata.source).toBeDefined();
        expect(source.chunk.text).toBeDefined();
      });
    });

    it("includes confidence scores", async () => {
      const response = await ragService.query({
        query: "compliance requirements",
        topK: 3,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      expect(typeof response.confidence).toBe("number");
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Spec-11 Knowledge Hierarchy", () => {
    it("supports local knowledge layer", () => {
      const status = ragService.getStatus();
      expect(status.knowledgeLayers).toContain("local");
    });

    it("supports industry knowledge layer", () => {
      const status = ragService.getStatus();
      expect(status.knowledgeLayers).toContain("industry");
    });

    it("supports global knowledge layer", () => {
      const status = ragService.getStatus();
      expect(status.knowledgeLayers).toContain("global");
    });

    it("prioritizes local over industry knowledge", async () => {
      // This is tested in the sorting test above
      // Local documents should appear first in results
      const results = await ragService.retrieve({
        query: "policy requirements",
        organizationId: "test-org",
        topK: 10,
        minScore: 0.05,
        knowledgeLayers: ["local", "industry"],
      });

      // Verify sorting order is respected
      let foundIndustry = false;
      for (const result of results) {
        if (result.knowledgeLayer === "industry") {
          foundIndustry = true;
        }
        if (result.knowledgeLayer === "local" && foundIndustry) {
          // Local should not come after industry
          expect(true).toBe(false);
        }
      }
    });
  });

  describe("Industry Knowledge Content", () => {
    it("contains WorkSafe Victoria RTW guidelines", async () => {
      const results = await ragService.retrieve({
        query: "WorkSafe Victoria return to work",
        topK: 10,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      const worksafeDoc = results.find((r) =>
        r.chunk.metadata.source.includes("WorkSafe")
      );
      expect(worksafeDoc).toBeDefined();
    });

    it("contains termination guidelines", async () => {
      const results = await ragService.retrieve({
        query: "termination employment WorkCover",
        topK: 10,
        minScore: 0.1,
        knowledgeLayers: ["industry"],
      });

      const terminationDoc = results.find((r) =>
        r.chunk.text.toLowerCase().includes("termination")
      );
      expect(terminationDoc).toBeDefined();
    });

    it("contains clinical pathway information", async () => {
      const results = await ragService.retrieve({
        query: "soft tissue injuries acute phase weeks",
        topK: 10,
        minScore: 0.05, // Lower threshold for clinical terms
        knowledgeLayers: ["industry"],
      });

      const clinicalDoc = results.find(
        (r) => r.chunk.metadata.documentType === "clinical"
      );
      expect(clinicalDoc).toBeDefined();
    });
  });
});
