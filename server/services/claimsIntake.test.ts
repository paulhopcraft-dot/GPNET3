import { describe, it, expect } from "vitest";
import {
  getInjuryTypes,
  validateIntakeForm,
  getIntakeFormTemplate,
  getRequiredDocuments,
  ClaimsIntakeForm,
} from "./claimsIntake";

describe("claimsIntake", () => {
  describe("getInjuryTypes", () => {
    it("returns all 6 injury categories", () => {
      const types = getInjuryTypes();

      expect(types).toHaveLength(6);
      expect(types.map(t => t.type)).toContain("MUSCULOSKELETAL");
      expect(types.map(t => t.type)).toContain("PSYCHOLOGICAL");
      expect(types.map(t => t.type)).toContain("SOFT_TISSUE");
      expect(types.map(t => t.type)).toContain("FRACTURE");
      expect(types.map(t => t.type)).toContain("NEUROLOGICAL");
      expect(types.map(t => t.type)).toContain("OCCUPATIONAL_DISEASE");
    });

    it("includes subtypes for each category", () => {
      const types = getInjuryTypes();
      const musculoskeletal = types.find(t => t.type === "MUSCULOSKELETAL");

      expect(musculoskeletal?.subtypes).toContain("Back/Spine");
      expect(musculoskeletal?.subtypes).toContain("Shoulder");
      expect(musculoskeletal?.subtypes).toContain("Knee");
    });

    it("includes required documents for each category", () => {
      const types = getInjuryTypes();
      const psychological = types.find(t => t.type === "PSYCHOLOGICAL");

      expect(psychological?.requiredDocs).toContain("Medical Certificate");
      expect(psychological?.requiredDocs).toContain("Psychiatrist/Psychologist Report");
    });
  });

  describe("getRequiredDocuments", () => {
    it("returns required and optional docs for injury type", () => {
      const docs = getRequiredDocuments("MUSCULOSKELETAL");

      expect(docs.required).toContain("Medical Certificate");
      expect(docs.required).toContain("GP Report");
      expect(docs.optional).toContain("Imaging Results");
    });

    it("returns default for unknown injury type", () => {
      const docs = getRequiredDocuments("UNKNOWN" as any);

      expect(docs.required).toContain("Medical Certificate");
    });
  });

  describe("getIntakeFormTemplate", () => {
    it("returns default values", () => {
      const template = getIntakeFormTemplate();

      expect(template.claimSource).toBe("portal");
      expect(template.currentWorkStatus).toBe("off_work");
      expect(template.priority).toBe("medium");
      expect(template.supervisorNotified).toBe(false);
    });
  });

  describe("validateIntakeForm", () => {
    const validForm: ClaimsIntakeForm = {
      workerFirstName: "John",
      workerLastName: "Smith",
      workerEmail: "john.smith@example.com",
      workerPhone: "0412345678",
      company: "Apex Labour",
      dateOfInjury: new Date().toISOString().split("T")[0],
      injuryType: "MUSCULOSKELETAL",
      injuryDescription: "Lower back strain from lifting heavy boxes at warehouse",
      currentWorkStatus: "off_work",
      claimSource: "portal",
    };

    it("validates a complete form successfully", () => {
      const result = validateIntakeForm(validForm);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error for missing worker first name", () => {
      const form = { ...validForm, workerFirstName: "" };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === "workerFirstName")).toBe(true);
    });

    it("returns error for missing worker last name", () => {
      const form = { ...validForm, workerLastName: "" };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === "workerLastName")).toBe(true);
    });

    it("returns error for missing company", () => {
      const form = { ...validForm, company: "" };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === "company")).toBe(true);
    });

    it("returns error for future date of injury", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const form = { ...validForm, dateOfInjury: futureDate.toISOString().split("T")[0] };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_DATE")).toBe(true);
    });

    it("returns error for missing injury type", () => {
      const form = { ...validForm, injuryType: "" as any };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === "injuryType")).toBe(true);
    });

    it("returns error for brief injury description", () => {
      const form = { ...validForm, injuryDescription: "Back pain" };
      const result = validateIntakeForm(form);

      // Brief description is a warning, not an error
      expect(result.warnings.some(w => w.field === "injuryDescription")).toBe(true);
    });

    it("returns warning for missing email", () => {
      const form = { ...validForm, workerEmail: undefined };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings.some(w => w.field === "workerEmail")).toBe(true);
    });

    it("returns warning for missing phone", () => {
      const form = { ...validForm, workerPhone: undefined };
      const result = validateIntakeForm(form);

      expect(result.warnings.some(w => w.field === "workerPhone")).toBe(true);
    });

    it("returns error for invalid email format", () => {
      const form = { ...validForm, workerEmail: "not-an-email" };
      const result = validateIntakeForm(form);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_FORMAT")).toBe(true);
    });

    it("returns warning for late notification (> 30 days)", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      const form = { ...validForm, dateOfInjury: oldDate.toISOString().split("T")[0] };
      const result = validateIntakeForm(form);

      expect(result.warnings.some(w => w.message.includes("Late notification"))).toBe(true);
    });

    it("returns warning for psychological injury without treating doctor", () => {
      const form: ClaimsIntakeForm = {
        ...validForm,
        injuryType: "PSYCHOLOGICAL",
        treatingDoctorName: undefined,
      };
      const result = validateIntakeForm(form);

      expect(result.warnings.some(w => w.field === "treatingDoctorName")).toBe(true);
    });

    it("returns warning when off work without expected return date", () => {
      const form: ClaimsIntakeForm = {
        ...validForm,
        currentWorkStatus: "off_work",
        expectedReturnDate: undefined,
      };
      const result = validateIntakeForm(form);

      expect(result.warnings.some(w => w.field === "expectedReturnDate")).toBe(true);
    });
  });
});
