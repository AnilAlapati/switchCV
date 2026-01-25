import { describe, it, expect } from "@jest/globals";

// Mock environment variables
process.env.GEMINI_API_KEY = "mock_gemini_key";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "user@example.com";
process.env.SMTP_PASS = "password";

describe("Lazy Loading Verification", () => {
  it("should lazy load @google/generative-ai without crashing", async () => {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI("key");
      expect(genAI).toBeDefined();
    } catch (error) {
      throw new Error(`Lazy load failed: ${error}`);
    }
  });

  it("should lazy load nodemailer without crashing", async () => {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({ jsonTransport: true });
      expect(transporter).toBeDefined();
    } catch (error) {
      throw new Error(`Lazy load failed: ${error}`);
    }
  });
});
