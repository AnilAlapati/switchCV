/**
 * PII Redaction Tests
 *
 * Ensures that sensitive data (resume content, emails, phones, etc.)
 * is properly redacted from logs to prevent data leakage.
 */

import { sanitizeForLogging } from "@/lib/logger";

describe("PII Redaction", () => {
  describe("Email Redaction", () => {
    it("should redact email addresses from strings", () => {
      const input = "Contact me at john.doe@example.com for more info";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Contact me at [EMAIL_REDACTED] for more info");
    });

    it("should redact multiple email addresses", () => {
      const input = "Contact john@example.com or jane@company.org";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Contact [EMAIL_REDACTED] or [EMAIL_REDACTED]");
    });

    it("should handle emails in error messages", () => {
      const error = new Error("User john.doe@example.com not found");
      const result = sanitizeForLogging(error) as any;
      expect(result.message).toBe("User [EMAIL_REDACTED] not found");
    });
  });

  describe("Phone Number Redaction", () => {
    it("should redact US phone numbers", () => {
      const input = "Call me at 555-123-4567";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Call me at [PHONE_REDACTED]");
    });

    it("should redact phone numbers with parentheses", () => {
      const input = "Mobile: (555) 123-4567";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Mobile: [PHONE_REDACTED]");
    });

    it("should redact phone numbers with +1 country code", () => {
      const input = "Contact: +1-555-123-4567";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Contact: [PHONE_REDACTED]");
    });

    it("should redact phone numbers without separators", () => {
      const input = "Phone: 5551234567";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Phone: [PHONE_REDACTED]");
    });
  });

  describe("SSN Redaction", () => {
    it("should redact social security numbers", () => {
      const input = "SSN: 123-45-6789";
      const result = sanitizeForLogging(input);
      expect(result).toBe("SSN: [SSN_REDACTED]");
    });
  });

  describe("Credit Card Redaction", () => {
    it("should redact credit card numbers with spaces", () => {
      const input = "Card: 1234 5678 9012 3456";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Card: [CARD_REDACTED]");
    });

    it("should redact credit card numbers with dashes", () => {
      const input = "Card: 1234-5678-9012-3456";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Card: [CARD_REDACTED]");
    });

    it("should redact credit card numbers without separators", () => {
      const input = "Card: 1234567890123456";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Card: [CARD_REDACTED]");
    });
  });

  describe("IP Address Redaction", () => {
    it("should partially redact IPv4 addresses", () => {
      const input = "Request from 192.168.1.100";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Request from 192.168.***.***");
    });

    it("should redact multiple IP addresses", () => {
      const input = "Forwarded from 10.0.0.1 to 172.16.0.5";
      const result = sanitizeForLogging(input);
      expect(result).toBe("Forwarded from 10.0.***.*** to 172.16.***.***");
    });
  });

  describe("Sensitive Field Redaction", () => {
    it("should redact resumeContent field", () => {
      const input = {
        userId: "user123",
        resumeContent: "Full resume with personal details",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.userId).toBe("user123");
      expect(result.resumeContent).toBe("[REDACTED]");
    });

    it("should redact resumeData field", () => {
      const input = {
        id: "resume123",
        resumeData: {
          name: "John Doe",
          email: "john@example.com",
        },
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.id).toBe("resume123");
      expect(result.resumeData).toBe("[REDACTED]");
    });

    it("should redact password fields", () => {
      const input = {
        username: "john",
        password: "test_val",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.username).toBe("john");
      expect(result.password).toBe("[REDACTED]");
    });

    it("should redact token fields", () => {
      const input = {
        userId: "user123",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.userId).toBe("user123");
      expect(result.token).toBe("[REDACTED]");
    });

    it("should redact API keys", () => {
      const input = {
        service: "gemini",
        apiKey: "test_key",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.service).toBe("gemini");
      expect(result.apiKey).toBe("[REDACTED]");
    });

    it("should redact phoneNumber fields", () => {
      const input = {
        name: "John Doe",
        phoneNumber: "555-123-4567",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.name).toBe("John Doe");
      expect(result.phoneNumber).toBe("[REDACTED]");
    });

    it("should redact address fields", () => {
      const input = {
        userId: "user123",
        address: "123 Main St, Anytown, USA",
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.userId).toBe("user123");
      expect(result.address).toBe("[REDACTED]");
    });
  });

  describe("Nested Object Redaction", () => {
    it("should redact sensitive data in nested objects", () => {
      const input = {
        user: {
          id: "user123",
          email: "john@example.com",
          profile: {
            phoneNumber: "555-123-4567",
            resumeContent: "Full resume text",
          },
        },
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.user.id).toBe("user123");
      expect(result.user.email).toBe("[EMAIL_REDACTED]");
      expect(result.user.profile.phoneNumber).toBe("[REDACTED]");
      expect(result.user.profile.resumeContent).toBe("[REDACTED]");
    });

    it("should handle deeply nested objects", () => {
      const input = {
        level1: {
          level2: {
            level3: {
              password: "[REDACTED_TEST_PASSWORD]",
              data: "Contact: john@example.com",
            },
          },
        },
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.level1.level2.level3.password).toBe("[REDACTED]");
      expect(result.level1.level2.level3.data).toBe(
        "Contact: [EMAIL_REDACTED]"
      );
    });
  });

  describe("Array Redaction", () => {
    it("should redact sensitive data in arrays", () => {
      const input = {
        users: [
          { name: "John", email: "john@example.com" },
          { name: "Jane", email: "jane@example.org" },
        ],
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.users[0].name).toBe("John");
      expect(result.users[0].email).toBe("[EMAIL_REDACTED]");
      expect(result.users[1].name).toBe("Jane");
      expect(result.users[1].email).toBe("[EMAIL_REDACTED]");
    });

    it("should handle arrays of strings", () => {
      const input = ["Contact john@example.com", "Call 555-123-4567"];
      const result = sanitizeForLogging(input) as any;
      expect(result[0]).toBe("Contact [EMAIL_REDACTED]");
      expect(result[1]).toBe("Call [PHONE_REDACTED]");
    });
  });

  describe("Error Object Redaction", () => {
    it("should redact PII from error messages", () => {
      const error = new Error("Failed to send email to john@example.com");
      const result = sanitizeForLogging(error) as any;
      expect(result.message).toBe("Failed to send email to [EMAIL_REDACTED]");
      expect(result.name).toBe("Error");
    });

    it("should redact PII from stack traces", () => {
      const error = new Error("User 555-123-4567 not found");
      error.stack =
        "Error: User 555-123-4567 not found\n    at Function.findByPhone";
      const result = sanitizeForLogging(error) as any;
      expect(result.message).toBe("User [PHONE_REDACTED] not found");
      expect(result.stack).toContain("[PHONE_REDACTED]");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null values", () => {
      const result = sanitizeForLogging(null);
      expect(result).toBeNull();
    });

    it("should handle undefined values", () => {
      const result = sanitizeForLogging(undefined);
      expect(result).toBeUndefined();
    });

    it("should handle numbers", () => {
      const result = sanitizeForLogging(12345);
      expect(result).toBe(12345);
    });

    it("should handle booleans", () => {
      const result = sanitizeForLogging(true);
      expect(result).toBe(true);
    });

    it("should prevent infinite recursion with max depth", () => {
      const circular: any = { level: 1 };
      circular.child = { level: 2, parent: circular };

      const result = sanitizeForLogging(circular);
      // Should not throw, should handle gracefully
      expect(result).toBeDefined();
    });

    it("should handle very deep objects", () => {
      const deep = {
        l1: { l2: { l3: { l4: { l5: { l6: { data: "deep" } } } } } },
      };
      const result = sanitizeForLogging(deep) as any;
      // Should stop at max depth and return placeholder
      expect(result.l1.l2.l3.l4.l5.l6).toBe("[MAX_DEPTH_EXCEEDED]");
    });

    it("should handle mixed content", () => {
      const input = {
        userId: "user123",
        error: "Failed to process resume for john@example.com",
        metadata: {
          phone: "555-123-4567",
          count: 5,
          active: true,
        },
      };
      const result = sanitizeForLogging(input) as any;
      expect(result.userId).toBe("user123");
      expect(result.error).toBe(
        "Failed to process resume for [EMAIL_REDACTED]"
      );
      expect(result.metadata.phone).toBe("[REDACTED]");
      expect(result.metadata.count).toBe(5);
      expect(result.metadata.active).toBe(true);
    });
  });

  describe("Real-world Resume Scenarios", () => {
    it("should protect resume content from logging", () => {
      const resumeError = {
        userId: "user123",
        resumeId: "resume456",
        resumeContent: `
          John Doe
          Email: john.doe@example.com
          Phone: (555) 123-4567
          
          EXPERIENCE:
          Senior Developer at Tech Corp
          - Built scalable applications
          - Led team of 5 developers
        `,
        error: "Failed to parse resume",
      };

      const result = sanitizeForLogging(resumeError) as any;
      expect(result.userId).toBe("user123");
      expect(result.resumeId).toBe("resume456");
      expect(result.resumeContent).toBe("[REDACTED]");
      expect(result.error).toBe("Failed to parse resume");
    });

    it("should redact personal info in error messages", () => {
      const error = new Error(
        "Resume validation failed for john.doe@example.com: missing phone number 555-123-4567"
      );
      const result = sanitizeForLogging(error) as any;
      expect(result.message).toBe(
        "Resume validation failed for [EMAIL_REDACTED]: missing phone number [PHONE_REDACTED]"
      );
    });

    it("should protect profile data", () => {
      const profileData = {
        id: "profile123",
        personalStatement: "Experienced developer seeking new opportunities",
        skills: ["JavaScript", "TypeScript", "React"],
        experience: [
          {
            title: "Senior Developer",
            company: "Tech Corp",
            description: "Led development team",
          },
        ],
      };

      const result = sanitizeForLogging(profileData) as any;
      expect(result.id).toBe("profile123");
      expect(result.personalStatement).toBe("[REDACTED]");
      expect(result.skills).toBe("[REDACTED]");
      expect(result.experience).toBe("[REDACTED]");
    });
  });

  describe("Integration with handleApiError", () => {
    it("should redact sensitive data in API errors", () => {
      const errorContext = {
        userId: "user123",
        resumeData: {
          name: "John Doe",
          email: "john@example.com",
        },
        errorMsg: "Failed to send notification to jane@example.org",
      };

      const result = sanitizeForLogging(errorContext) as any;
      expect(result.userId).toBe("user123");
      expect(result.resumeData).toBe("[REDACTED]");
      expect(result.errorMsg).toBe(
        "Failed to send notification to [EMAIL_REDACTED]"
      );
    });
  });
});
