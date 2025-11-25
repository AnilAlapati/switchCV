/**
 * Tests for AI Response Parser utilities
 */

import {
  extractJsonFromResponse,
  findJsonObject,
} from "@/lib/utils/aiResponseParser";

describe("extractJsonFromResponse", () => {
  describe("direct JSON parsing", () => {
    it("should parse clean JSON object", () => {
      const input = '{"title": "Engineer", "summary": "Test"}';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Engineer", summary: "Test" });
    });

    it("should parse JSON with whitespace", () => {
      const input = '  {"title": "Engineer"}  ';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Engineer" });
    });

    it("should parse nested JSON objects", () => {
      const input = '{"contact": {"email": {"value": "test@example.com"}}}';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({
        contact: { email: { value: "test@example.com" } },
      });
    });
  });

  describe("markdown code block extraction", () => {
    it("should extract JSON from ```json block", () => {
      const input = '```json\n{"title": "Engineer"}\n```';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Engineer" });
    });

    it("should extract JSON from ``` block without language", () => {
      const input = '```\n{"title": "Designer"}\n```';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Designer" });
    });

    it("should handle code block with surrounding text", () => {
      const input =
        'Here is the resume:\n```json\n{"title": "Manager"}\n```\nHope this helps!';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Manager" });
    });

    it("should handle multiline JSON in code block", () => {
      const input = `\`\`\`json
{
  "title": "Engineer",
  "skills": [
    {"name": "TypeScript", "level": "Expert"}
  ]
}
\`\`\``;
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({
        title: "Engineer",
        skills: [{ name: "TypeScript", level: "Expert" }],
      });
    });
  });

  describe("balanced brace matching", () => {
    it("should extract JSON embedded in text", () => {
      const input = 'The resume is: {"title": "Analyst"} as requested.';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ title: "Analyst" });
    });

    it("should handle JSON with strings containing braces", () => {
      const input = '{"description": "Use {curly} braces carefully"}';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({
        description: "Use {curly} braces carefully",
      });
    });

    it("should handle escaped quotes in strings", () => {
      const input = '{"description": "He said \\"hello\\""}';
      const result = extractJsonFromResponse(input);
      expect(result).toEqual({ description: 'He said "hello"' });
    });
  });

  describe("error handling", () => {
    it("should return null for empty string", () => {
      expect(extractJsonFromResponse("")).toBeNull();
    });

    it("should return null for text without JSON", () => {
      expect(extractJsonFromResponse("Hello world")).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      expect(extractJsonFromResponse("{title: Engineer}")).toBeNull();
    });

    it("should return null for unclosed JSON", () => {
      expect(extractJsonFromResponse('{"title": "Test"')).toBeNull();
    });
  });
});

describe("findJsonObject", () => {
  it("should find simple JSON object", () => {
    const result = findJsonObject('before {"key": "value"} after');
    expect(result).toBe('{"key": "value"}');
  });

  it("should find nested JSON object", () => {
    const result = findJsonObject('x {"a": {"b": "c"}} y');
    expect(result).toBe('{"a": {"b": "c"}}');
  });

  it("should return null when no JSON found", () => {
    expect(findJsonObject("no json here")).toBeNull();
  });

  it("should handle strings with braces", () => {
    const result = findJsonObject('{"text": "a{b}c"}');
    expect(result).toBe('{"text": "a{b}c"}');
  });

  it("should handle escaped characters", () => {
    const result = findJsonObject('{"path": "C:\\\\Users\\\\test"}');
    expect(result).toBe('{"path": "C:\\\\Users\\\\test"}');
  });

  it("should find first complete JSON object", () => {
    const result = findJsonObject('{"first": 1} {"second": 2}');
    expect(result).toBe('{"first": 1}');
  });
});
