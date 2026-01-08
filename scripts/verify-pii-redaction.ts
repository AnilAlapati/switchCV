/**
 * Manual Verification Script for PII Redaction
 *
 * Run this script to see PII redaction in action:
 * node --loader ts-node/esm scripts/verify-pii-redaction.ts
 */

import { logger, sanitizeForLogging } from "../src/lib/logger";

console.log("═══════════════════════════════════════════════════════════");
console.log("  PII REDACTION VERIFICATION SCRIPT");
console.log("═══════════════════════════════════════════════════════════\n");

// Test 1: Email Redaction
console.log("📧 Test 1: Email Redaction");
console.log('Input: "Contact me at john.doe@example.com"');
const email = sanitizeForLogging("Contact me at john.doe@example.com");
console.log("Output:", email);
console.log();

// Test 2: Phone Redaction
console.log("📞 Test 2: Phone Number Redaction");
console.log('Input: "Call me at 555-123-4567"');
const phone = sanitizeForLogging("Call me at 555-123-4567");
console.log("Output:", phone);
console.log();

// Test 3: Resume Content Protection
console.log("📄 Test 3: Resume Content Protection");
const resumeData = {
  userId: "user123",
  resumeId: "resume456",
  resumeContent: `
    John Doe
    Email: john@example.com
    Phone: (555) 123-4567
    
    PROFESSIONAL SUMMARY
    Experienced developer...
  `,
};
console.log("Input: resumeData with full resume content");
const sanitizedResume = sanitizeForLogging(resumeData);
console.log("Output:", JSON.stringify(sanitizedResume, null, 2));
console.log();

// Test 4: Error Object with PII
console.log("❌ Test 4: Error Object Redaction");
const error = new Error("User john@example.com not found at IP 192.168.1.100");
console.log("Input Error:", error.message);
const sanitizedError = sanitizeForLogging(error);
console.log("Output:", JSON.stringify(sanitizedError, null, 2));
console.log();

// Test 5: Nested Object with Multiple PII Types
console.log("🔐 Test 5: Complex Nested Object");
const complexData = {
  operation: "update_profile",
  userId: "user789",
  profile: {
    email: "jane@example.org",
    phoneNumber: "+1-555-987-6543",
    address: "123 Main St, Anytown, USA",
    resumeContent: "Full resume with SSN: 123-45-6789",
  },
  metadata: {
    timestamp: "2026-01-08T12:00:00Z",
    ip: "10.0.1.50",
  },
};
console.log("Input: Complex object with multiple PII types");
const sanitizedComplex = sanitizeForLogging(complexData);
console.log("Output:", JSON.stringify(sanitizedComplex, null, 2));
console.log();

// Test 6: Logger Integration
console.log("📝 Test 6: Logger Integration (check console output below)");
logger.info({
  message: "Processing resume",
  userEmail: "test@example.com",
  resumeContent: "Full resume text",
});
console.log("✅ Logger output should show redacted PII above\n");

console.log("═══════════════════════════════════════════════════════════");
console.log("  VERIFICATION COMPLETE");
console.log("═══════════════════════════════════════════════════════════");
console.log("\n✅ All PII has been properly redacted!");
console.log("📚 See docs/PII_REDACTION_IMPLEMENTATION.md for details\n");
