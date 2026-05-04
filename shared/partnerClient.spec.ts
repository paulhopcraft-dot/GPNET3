import { describe, it, expect } from "vitest";
import {
  createPartnerClientSchema,
  updatePartnerClientSchema,
} from "./partnerClient";

describe("createPartnerClientSchema", () => {
  describe("name (required)", () => {
    it("accepts a valid name", () => {
      const result = createPartnerClientSchema.safeParse({ name: "Acme Pty Ltd" });
      expect(result.success).toBe(true);
    });

    it("rejects a name shorter than 2 characters", () => {
      const result = createPartnerClientSchema.safeParse({ name: "A" });
      expect(result.success).toBe(false);
    });

    it("rejects a missing name", () => {
      const result = createPartnerClientSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("abn", () => {
    it("accepts an 11-digit ABN", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        abn: "12345678901",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an ABN with non-digit characters", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        abn: "12345abc678",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an ABN of wrong length", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        abn: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("treats empty string ABN as undefined (optional)", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        abn: "",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.abn).toBeUndefined();
    });
  });

  describe("postcode", () => {
    it("accepts a 4-digit postcode", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        postcode: "3000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a 3-digit postcode", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        postcode: "300",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a postcode with non-digits", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        postcode: "300A",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("state / worksafeState", () => {
    it("accepts a valid AU state code", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        state: "VIC",
        worksafeState: "NSW",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid state code", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        state: "ZZZ",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("emails", () => {
    it("accepts a valid contact email", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        contactEmail: "ops@acme.com.au",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid email", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        contactEmail: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("treats empty email as undefined", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        contactEmail: "",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.contactEmail).toBeUndefined();
    });
  });

  describe("notificationEmails", () => {
    it("accepts a single valid email and lowercases it", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notificationEmails: "Alerts@Acme.COM",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notificationEmails).toBe("alerts@acme.com");
      }
    });

    it("accepts multiple comma-separated emails, trims/lowercases, joins with ', '", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notificationEmails: " Ops@acme.com , HR@acme.com ,manager@acme.com ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notificationEmails).toBe(
          "ops@acme.com, hr@acme.com, manager@acme.com",
        );
      }
    });

    it("rejects when any email in the list is invalid", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notificationEmails: "ops@acme.com, not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 10 emails", () => {
      const list = Array.from({ length: 11 }, (_, i) => `u${i}@a.com`).join(", ");
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notificationEmails: list,
      });
      expect(result.success).toBe(false);
    });

    it("treats empty string as empty (no emails)", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notificationEmails: "",
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.notificationEmails).toBe("");
    });
  });

  describe("employeeCount", () => {
    it("accepts a valid band", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        employeeCount: "51-200",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an arbitrary number", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        employeeCount: "150",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("notes", () => {
    it("accepts notes up to 2000 chars", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notes: "x".repeat(2000),
      });
      expect(result.success).toBe(true);
    });

    it("rejects notes longer than 2000 chars", () => {
      const result = createPartnerClientSchema.safeParse({
        name: "Acme",
        notes: "x".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("updatePartnerClientSchema", () => {
  it("accepts an empty object (no fields to update is allowed at schema level)", () => {
    const result = updatePartnerClientSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a single-field update", () => {
    const result = updatePartnerClientSchema.safeParse({ name: "Acme Renamed" });
    expect(result.success).toBe(true);
  });

  it("still applies field-level validation on present fields", () => {
    const result = updatePartnerClientSchema.safeParse({ abn: "bad" });
    expect(result.success).toBe(false);
  });
});
