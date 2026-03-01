import { describe, it, expect } from "vitest";
import { validatePassword, type PasswordValidationResult } from "../lib/passwordValidation";

describe("Password Validation (Security: Strong Password Policy)", () => {
  describe("Length Requirements", () => {
    it("should reject password shorter than 8 characters", () => {
      const result = validatePassword("Short1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should accept password with exactly 8 characters", () => {
      const result = validatePassword("Pass1!ab");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Character Type Requirements", () => {
    it("should reject password without uppercase letter", () => {
      const result = validatePassword("password1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without lowercase letter", () => {
      const result = validatePassword("PASSWORD1!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without digit", () => {
      const result = validatePassword("Password!");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one digit");
    });

    it("should reject password without special character", () => {
      const result = validatePassword("Password1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)");
    });
  });

  describe("Valid Passwords", () => {
    it("should accept valid password meeting all requirements", () => {
      const result = validatePassword("Password1!");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept passwords with various special characters", () => {
      const testCases = [
        "Password1@",
        "Password1#",
        "Password1$",
        "Password1%",
        "Password1^",
        "Password1&",
        "Password1*",
        "Password1(",
        "Password1)",
        "Password1-",
        "Password1_",
        "Password1=",
        "Password1+",
        "Password1[",
        "Password1]",
        "Password1{",
        "Password1}",
        "Password1|",
        "Password1;",
        "Password1:",
        "Password1'",
        'Password1"',
        "Password1,",
        "Password1.",
        "Password1<",
        "Password1>",
        "Password1/",
        "Password1?",
      ];

      for (const password of testCases) {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
  });

  describe("Multiple Errors", () => {
    it("should return multiple errors when multiple requirements fail", () => {
      const result = validatePassword("short");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain("Password must be at least 8 characters long");
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
      expect(result.errors).toContain("Password must contain at least one digit");
      expect(result.errors).toContain("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)");
    });

    it("should return all 5 errors for empty string", () => {
      const result = validatePassword("");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });
  });
});
