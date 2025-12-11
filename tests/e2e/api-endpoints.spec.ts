import { test, expect } from "@playwright/test";

/**
 * E2E API Tests for GPNet3 Core Endpoints
 * Tests key API functionality end-to-end
 */

test.describe("Knowledge Base API", () => {
  test("GET /api/knowledge/stats returns valid statistics", async ({ request }) => {
    const response = await request.get("/api/knowledge/stats");
    expect(response.ok()).toBeTruthy();

    const stats = await response.json();
    expect(stats.totalDocuments).toBeGreaterThan(0);
    expect(stats.byLayer).toBeDefined();
    expect(stats.byLayer.local).toBeGreaterThanOrEqual(0);
    expect(stats.byLayer.industry).toBeGreaterThanOrEqual(0);
    expect(stats.byLayer.global).toBeGreaterThanOrEqual(0);
  });

  test("GET /api/knowledge/search returns relevant results", async ({ request }) => {
    const response = await request.get("/api/knowledge/search?q=return%20to%20work");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.query).toBe("return to work");
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBeTruthy();
    expect(data.count).toBeGreaterThan(0);

    // Verify result structure
    const firstResult = data.results[0];
    expect(firstResult.document).toBeDefined();
    expect(firstResult.score).toBeGreaterThan(0);
    expect(firstResult.layerPriority).toBeGreaterThan(0);
  });

  test("GET /api/knowledge/search with layer filter", async ({ request }) => {
    const response = await request.get("/api/knowledge/search?q=policy&layers=local");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    // All results should be local layer
    data.results.forEach((result: any) => {
      expect(result.document.layer).toBe("local");
    });
  });

  test("GET /api/knowledge/documents lists documents", async ({ request }) => {
    const response = await request.get("/api/knowledge/documents");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.documents).toBeDefined();
    expect(Array.isArray(data.documents)).toBeTruthy();
    expect(data.total).toBeGreaterThan(0);
  });

  test("POST /api/knowledge/context returns RAG context", async ({ request }) => {
    const response = await request.post("/api/knowledge/context", {
      data: {
        query: "injury management guidelines",
        limit: 5,
      },
    });
    expect(response.ok()).toBeTruthy();

    const context = await response.json();
    expect(context.query).toBeDefined();
    expect(context.results).toBeDefined();
    expect(context.suggestedContext).toBeDefined();
    expect(context.layerBreakdown).toBeDefined();
  });
});

test.describe("Intake API", () => {
  test("GET /api/intake/injury-types returns injury categories", async ({ request }) => {
    const response = await request.get("/api/intake/injury-types");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.injuryTypes).toBeDefined();
    expect(Object.keys(data.injuryTypes).length).toBeGreaterThan(0);

    // Check for expected injury types
    expect(data.injuryTypes.MUSCULOSKELETAL).toBeDefined();
    expect(data.injuryTypes.PSYCHOLOGICAL).toBeDefined();
  });

  test("GET /api/intake/template returns form template", async ({ request }) => {
    const response = await request.get("/api/intake/template");
    expect(response.ok()).toBeTruthy();

    const template = await response.json();
    expect(template.template).toBeDefined();
    expect(template.template.workerName).toBe("");
    expect(template.template.injuryType).toBe("");
  });

  test("POST /api/intake/validate validates form data", async ({ request }) => {
    // Test with invalid data
    const response = await request.post("/api/intake/validate", {
      data: {
        workerName: "",
        company: "",
        injuryType: "",
      },
    });
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("POST /api/intake/validate passes with valid data", async ({ request }) => {
    const response = await request.post("/api/intake/validate", {
      data: {
        workerName: "John Smith",
        company: "Test Corp",
        injuryType: "MUSCULOSKELETAL",
        injurySubtype: "back",
        dateOfInjury: new Date().toISOString().split("T")[0],
        dateNotified: new Date().toISOString().split("T")[0],
        injuryDescription: "Back strain from lifting",
        email: "john@test.com",
        phone: "0400000000",
      },
    });
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

test.describe("Certificate API", () => {
  test("POST /api/certificates/extract extracts certificate data", async ({ request }) => {
    const certificateText = `
      Medical Certificate
      Patient: John Smith
      Date: 15/12/2025
      Valid from: 15/12/2025 to 15/01/2026

      Diagnosis: Lumbar strain

      Work Capacity: Partial capacity

      Restrictions:
      - No heavy lifting
      - Maximum 20 hours per week

      Review in 4 weeks

      Dr. Jane Wilson
      General Practitioner
    `;

    const response = await request.post("/api/certificates/extract", {
      data: {
        text: certificateText,
        filename: "medical_certificate.pdf",
      },
    });
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.extractedData).toBeDefined();
    expect(result.extractedData.diagnosis.value).toContain("Lumbar strain");
    expect(result.extractedData.workCapacity.value).toBe("partial");
    expect(result.extractedData.hoursPerWeek.value).toBe(20);
  });

  test("POST /api/certificates/validate validates certificate data", async ({ request }) => {
    const response = await request.post("/api/certificates/validate", {
      data: {
        startDate: { value: "2025-12-15", confidence: 0.9, needsReview: false },
        endDate: { value: "2025-12-01", confidence: 0.9, needsReview: false }, // Invalid: end before start
        workCapacity: { value: "partial", confidence: 0.8, needsReview: false },
        restrictions: { value: [], confidence: 0.5, needsReview: true },
      },
    });
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e: string) => e.includes("End date cannot be before start date"))).toBeTruthy();
  });

  test("GET /api/certificates/expiry-check calculates expiry", async ({ request }) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const endDate = futureDate.toISOString().split("T")[0];

    const response = await request.get(`/api/certificates/expiry-check?endDate=${endDate}`);
    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.daysUntilExpiry).toBeLessThanOrEqual(6);
    expect(result.daysUntilExpiry).toBeGreaterThanOrEqual(4);
    expect(result.alertLevel).toBe("warning"); // 5 days = warning
  });
});

test.describe("Check-in API", () => {
  test("GET /api/checkin/questions returns questionnaire", async ({ request }) => {
    const response = await request.get("/api/checkin/questions");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.questions).toBeDefined();
    expect(Array.isArray(data.questions)).toBeTruthy();
    expect(data.questions.length).toBeGreaterThan(0);

    // Check question structure
    const firstQuestion = data.questions[0];
    expect(firstQuestion.id).toBeDefined();
    expect(firstQuestion.category).toBeDefined();
    expect(firstQuestion.question).toBeDefined();
    expect(firstQuestion.type).toBeDefined();
  });
});

test.describe("Provider Templates API", () => {
  test("GET /api/provider-templates returns templates", async ({ request }) => {
    const response = await request.get("/api/provider-templates");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.templates).toBeDefined();
    expect(Array.isArray(data.templates)).toBeTruthy();
    expect(data.templates.length).toBeGreaterThan(0);

    // Check template structure
    const firstTemplate = data.templates[0];
    expect(firstTemplate.id).toBeDefined();
    expect(firstTemplate.name).toBeDefined();
    expect(firstTemplate.target).toBeDefined();
  });

  test("GET /api/provider-templates/:target filters by target", async ({ request }) => {
    const response = await request.get("/api/provider-templates/gp");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.templates).toBeDefined();
    // All templates should be for GP target
    data.templates.forEach((template: any) => {
      expect(template.target).toBe("gp");
    });
  });
});
