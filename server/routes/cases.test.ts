import { describe, it, expect } from "vitest";
import { claimsIntakeSchema } from "@shared/schema";

describe("claimsIntakeSchema validation", () => {
  it("accepts valid claims intake data", () => {
    const validData = {
      workerName: "John Smith",
      company: "Acme Industries",
      dateOfInjury: "2025-01-15",
    };

    const result = claimsIntakeSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.workerName).toBe("John Smith");
      expect(result.data.company).toBe("Acme Industries");
      expect(result.data.dateOfInjury).toBe("2025-01-15");
    }
  });

  it("accepts optional fields", () => {
    const dataWithOptionals = {
      workerName: "Jane Doe",
      company: "Tech Corp",
      dateOfInjury: "2025-02-01",
      injuryDescription: "Back injury from lifting",
      owner: "Case Manager Jones",
    };

    const result = claimsIntakeSchema.safeParse(dataWithOptionals);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.injuryDescription).toBe("Back injury from lifting");
      expect(result.data.owner).toBe("Case Manager Jones");
    }
  });

  it("rejects worker name that is too short", () => {
    const invalidData = {
      workerName: "J",
      company: "Acme Industries",
      dateOfInjury: "2025-01-15",
    };

    const result = claimsIntakeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const workerNameError = result.error.errors.find(
        (e) => e.path[0] === "workerName"
      );
      expect(workerNameError).toBeDefined();
      expect(workerNameError?.message).toContain("at least 2 characters");
    }
  });

  it("rejects empty company", () => {
    const invalidData = {
      workerName: "John Smith",
      company: "",
      dateOfInjury: "2025-01-15",
    };

    const result = claimsIntakeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const companyError = result.error.errors.find(
        (e) => e.path[0] === "company"
      );
      expect(companyError).toBeDefined();
    }
  });

  it("rejects invalid date format", () => {
    const invalidData = {
      workerName: "John Smith",
      company: "Acme Industries",
      dateOfInjury: "not-a-date",
    };

    const result = claimsIntakeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateError = result.error.errors.find(
        (e) => e.path[0] === "dateOfInjury"
      );
      expect(dateError).toBeDefined();
      expect(dateError?.message).toContain("Invalid date");
    }
  });

  it("rejects missing required fields", () => {
    const invalidData = {
      workerName: "John Smith",
    };

    const result = claimsIntakeSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const missingFields = result.error.errors.map((e) => e.path[0]);
      expect(missingFields).toContain("company");
      expect(missingFields).toContain("dateOfInjury");
    }
  });
});
