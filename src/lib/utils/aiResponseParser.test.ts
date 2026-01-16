import { extractJsonFromResponse, findJsonObject } from "./aiResponseParser";

describe("aiResponseParser", () => {
  describe("extractJsonFromResponse", () => {
    it("should parse pure JSON response", () => {
      const text = '{"name": "Test"}';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should parse JSON wrapped in markdown code blocks", () => {
      const text = '```json\n{"name": "Test"}\n```';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should parse JSON wrapped in markdown code blocks without language tag", () => {
      const text = '```\n{"name": "Test"}\n```';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should parse JSON embedded in explanatory text", () => {
      const text = 'Here is the result: {"name": "Test"} Hope this helps!';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should handle nested JSON objects", () => {
      const text = 'Result: {"user": {"id": 1, "name": "Test"}}';
      expect(extractJsonFromResponse(text)).toEqual({
        user: { id: 1, name: "Test" },
      });
    });

    it("should handle aggressive cleanup fallback", () => {
      const text = 'Some text ```json {"name": "Test"} ``` more text';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should return null if no JSON found", () => {
      const text = "No JSON here";
      expect(extractJsonFromResponse(text)).toBeNull();
    });

    it("should return null if JSON is invalid and all strategies fail", () => {
      const text = '{"name": "Test"';
      expect(extractJsonFromResponse(text)).toBeNull();
    });

    it("should handle strategy 1 failure and move to strategy 2", () => {
      // Strategy 1 fails because it's not pure JSON (has text before/after)
      const text = 'Text {"name": "Test"} Text';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });

    it("should handle strategy 2 failure and move to strategy 3", () => {
      // Strategy 2 fails because no code blocks
      const text = 'Text {"name": "Test"} Text';
      expect(extractJsonFromResponse(text)).toEqual({ name: "Test" });
    });
  });

  describe("findJsonObject", () => {
    it("should find a simple JSON object", () => {
      const text = 'Prefix {"a": 1} Suffix';
      expect(findJsonObject(text)).toBe('{"a": 1}');
    });

    it("should find a nested JSON object", () => {
      const text = 'Prefix {"a": {"b": 2}} Suffix';
      expect(findJsonObject(text)).toBe('{"a": {"b": 2}}');
    });

    it("should handle strings with braces", () => {
      const text = 'Prefix {"a": "}"} Suffix';
      expect(findJsonObject(text)).toBe('{"a": "}"}');
    });

    it("should handle escaped characters in strings", () => {
      const text = 'Prefix {"a": "\\""} Suffix';
      expect(findJsonObject(text)).toBe('{"a": "\\""}');
    });

    it("should return null if no opening brace", () => {
      const text = "No braces here";
      expect(findJsonObject(text)).toBeNull();
    });

    it("should return null if braces are not balanced", () => {
      const text = 'Prefix {"a": 1 Suffix';
      expect(findJsonObject(text)).toBeNull();
    });
  });
});
