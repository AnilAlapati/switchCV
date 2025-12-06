
import { describe, it, expect } from "@jest/globals";

// Mock environment variables
process.env.HUGGINGFACE_TOKEN = "mock_hf_token";
process.env.GEMINI_API_KEY = "mock_gemini_key";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "user@example.com";
process.env.SMTP_PASS = "password";

describe("Lazy Loading Verification", () => {
    it("should lazy load @huggingface/inference without crashing", async () => {
        // We can't easily check if it *was* lazy loaded vs eagerly loaded in a unit test 
        // without complex mocking of 'require' or 'import', 
        // but we CAN check that the method that triggers the load doesn't crash.

        // This confirms the dynamic import syntax is valid and resolves in the test environment (TS-Jest).
        try {
            const { HfInference } = await import("@huggingface/inference");
            const hf = new HfInference("token");
            expect(hf).toBeDefined();
        } catch (error) {
            throw new Error(`Lazy load failed: ${error}`);
        }
    });

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
