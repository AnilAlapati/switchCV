/**
 * Tests for zodToGeminiSchema utility
 */

import { z } from "zod";
import {
  zodToGeminiSchema,
  GeminiJsonSchema,
} from "@/lib/utils/zodToGeminiSchema";

describe("zodToGeminiSchema", () => {
  it("should convert a simple string schema", () => {
    const schema = z.string();
    const result = zodToGeminiSchema(schema);
    expect(result).toEqual({ type: "STRING" });
  });

  it("should convert a string schema with min/max length", () => {
    const schema = z.string().min(1).max(200);
    const result = zodToGeminiSchema(schema);
    expect(result).toEqual({ type: "STRING", minLength: 1, maxLength: 200 });
  });

  it("should convert an email string schema", () => {
    const schema = z.string().email();
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("STRING");
    expect(result.format).toBe("email");
  });

  it("should convert a number schema", () => {
    const schema = z.number().min(0).max(100);
    const result = zodToGeminiSchema(schema);
    expect(result).toEqual({ type: "NUMBER", minimum: 0, maximum: 100 });
  });

  it("should convert an integer schema", () => {
    const schema = z.number().int();
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("INTEGER");
  });

  it("should convert a boolean schema", () => {
    const schema = z.boolean();
    const result = zodToGeminiSchema(schema);
    expect(result).toEqual({ type: "BOOLEAN" });
  });

  it("should convert an enum schema", () => {
    const schema = z.enum(["public", "masked", "request"]);
    const result = zodToGeminiSchema(schema);
    expect(result).toEqual({
      type: "STRING",
      enum: ["public", "masked", "request"],
    });
  });

  it("should convert an array schema with min/max items", () => {
    const schema = z.array(z.string()).min(1).max(20);
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("ARRAY");
    expect(result.items).toEqual({ type: "STRING" });
    expect(result.minItems).toBe(1);
    expect(result.maxItems).toBe(20);
  });

  it("should convert a simple object schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("OBJECT");
    expect(result.properties).toBeDefined();
    expect(result.properties!.name).toEqual({ type: "STRING" });
    expect(result.properties!.age).toEqual({ type: "NUMBER" });
    expect(result.required).toContain("name");
    expect(result.required).toContain("age");
  });

  it("should handle optional fields by excluding from required", () => {
    const schema = z.object({
      name: z.string(),
      bio: z.string().optional(),
    });
    const result = zodToGeminiSchema(schema);
    expect(result.required).toContain("name");
    expect(result.required).not.toContain("bio");
    expect(result.properties!.bio.nullable).toBe(true);
  });

  it("should convert nested object schemas", () => {
    const schema = z.object({
      contact: z.object({
        email: z.object({
          value: z.string().email(),
          visibility: z.enum(["public", "masked", "request"]),
        }),
      }),
    });
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("OBJECT");
    const contact = result.properties!.contact;
    expect(contact.type).toBe("OBJECT");
    const email = contact.properties!.email;
    expect(email.type).toBe("OBJECT");
    expect(email.properties!.value.format).toBe("email");
    expect(email.properties!.visibility.enum).toEqual([
      "public",
      "masked",
      "request",
    ]);
  });

  it("should convert array of objects", () => {
    const schema = z.array(
      z.object({
        name: z.string().min(1),
        level: z.string(),
      }),
    );
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("ARRAY");
    expect(result.items!.type).toBe("OBJECT");
    expect(result.items!.properties!.name.type).toBe("STRING");
  });

  it("should convert AIResumeResponseSchema-like complex schema", () => {
    const complexSchema = z.object({
      title: z.string().min(1).max(200),
      summary: z.string().min(1).max(2000),
      skills: z
        .array(
          z.object({
            name: z.string().min(1).max(100),
            level: z.string().min(1).max(50),
            visibility: z.enum(["public", "masked", "request"]),
          }),
        )
        .min(1)
        .max(20),
      experience: z
        .array(
          z.object({
            company: z.string().min(1),
            role: z.string().min(1),
            startDate: z.string().min(1),
            endDate: z.string().optional(),
            description: z.string().min(1),
          }),
        )
        .min(1),
    });

    const result = zodToGeminiSchema(complexSchema);
    expect(result.type).toBe("OBJECT");
    expect(result.required).toContain("title");
    expect(result.required).toContain("skills");
    expect(result.required).toContain("experience");
    expect(result.properties!.skills.type).toBe("ARRAY");
    expect(result.properties!.skills.minItems).toBe(1);
    expect(result.properties!.skills.maxItems).toBe(20);
  });

  it("should handle ZodDefault by unwrapping", () => {
    const schema = z.string().default("hello");
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("STRING");
  });

  it("should handle ZodNullable", () => {
    const schema = z.string().nullable();
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("STRING");
    expect(result.nullable).toBe(true);
  });

  it("should handle ZodLiteral string", () => {
    const schema = z.literal("fixed");
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("STRING");
    expect(result.enum).toEqual(["fixed"]);
  });

  it("should handle ZodRecord as generic OBJECT", () => {
    const schema = z.record(z.string(), z.string());
    const result = zodToGeminiSchema(schema);
    expect(result.type).toBe("OBJECT");
  });

  it("should produce valid schema for the actual AIResumeResponseSchema", () => {
    // Import real schema
    const { AIResumeResponseSchema } = require("@/lib/schemas/aiResumeSchema");
    const result: GeminiJsonSchema = zodToGeminiSchema(AIResumeResponseSchema);

    expect(result.type).toBe("OBJECT");
    expect(result.properties).toBeDefined();
    expect(result.properties!.title).toBeDefined();
    expect(result.properties!.summary).toBeDefined();
    expect(result.properties!.skills).toBeDefined();
    expect(result.properties!.experience).toBeDefined();
    expect(result.properties!.contact).toBeDefined();
    expect(result.required).toContain("title");
    expect(result.required).toContain("skills");
    expect(result.required).toContain("experience");
    expect(result.required).toContain("contact");
  });
});
